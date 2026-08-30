/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { KibanaRequest } from '@kbn/core/server';
import { WorkflowsManagementOperationPrivileges } from '@kbn/workflows';
import {
  ALERTS_WORKFLOW_ORIGIN_TYPE,
  ALERT_WORKFLOW_ORIGIN_TYPE,
  CASE_WORKFLOW_ORIGIN_TYPE,
  INTERNAL_CASE_WORKFLOW_RUN_URL,
  MAX_CASES_PER_WORKFLOW_RUN,
  MAX_CASE_WORKFLOW_RUN_ID_LENGTH,
  OBSERVABLE_WORKFLOW_ORIGIN_TYPE,
} from '../../../../common/constants';
import type { CasesWorkflowRunService } from '../../../workflows/execution/service';
import { createCasesRoute } from '../create_cases_route';

const MAX_WORKFLOW_INPUTS_BYTES = 1_000_000;

export const runCaseWorkflowBodySchema = schema.object({
  caseIds: schema.arrayOf(
    schema.string({ minLength: 1, maxLength: MAX_CASE_WORKFLOW_RUN_ID_LENGTH }),
    {
      minSize: 1,
      maxSize: MAX_CASES_PER_WORKFLOW_RUN,
      validate: (ids) =>
        new Set(ids).size === ids.length ? undefined : 'caseIds must not contain duplicates.',
    }
  ),
  inputs: schema.recordOf(schema.string({ maxLength: 1024 }), schema.any(), {
    validate: (inputs) =>
      Buffer.byteLength(JSON.stringify(inputs)) <= MAX_WORKFLOW_INPUTS_BYTES
        ? undefined
        : `Workflow inputs cannot exceed ${MAX_WORKFLOW_INPUTS_BYTES} bytes.`,
  }),
  // Optional — absence means a list-surface (bulk) run with no sub-entity context.
  // When present, it is a discriminated union; each variant is strict (no unknown keys).
  // `schema.object` rejects extra keys by default, so the variants self-discriminate.
  origin: schema.maybe(
    schema.oneOf([
      schema.object({
        type: schema.literal(CASE_WORKFLOW_ORIGIN_TYPE),
        caseId: schema.string({ minLength: 1, maxLength: MAX_CASE_WORKFLOW_RUN_ID_LENGTH }),
      }),
      schema.object({
        type: schema.literal(OBSERVABLE_WORKFLOW_ORIGIN_TYPE),
        caseId: schema.string({ minLength: 1, maxLength: MAX_CASE_WORKFLOW_RUN_ID_LENGTH }),
        observableId: schema.string({ minLength: 1, maxLength: MAX_CASE_WORKFLOW_RUN_ID_LENGTH }),
      }),
      schema.object({
        type: schema.literal(ALERT_WORKFLOW_ORIGIN_TYPE),
        caseId: schema.string({ minLength: 1, maxLength: MAX_CASE_WORKFLOW_RUN_ID_LENGTH }),
        alertId: schema.string({ minLength: 1, maxLength: MAX_CASE_WORKFLOW_RUN_ID_LENGTH }),
      }),
      schema.object({
        type: schema.literal(ALERTS_WORKFLOW_ORIGIN_TYPE),
        caseId: schema.string({ minLength: 1, maxLength: MAX_CASE_WORKFLOW_RUN_ID_LENGTH }),
      }),
    ])
  ),
});

export const runCaseWorkflowParamsSchema = schema.object({
  workflow_id: schema.string({
    minLength: 1,
    maxLength: MAX_CASE_WORKFLOW_RUN_ID_LENGTH,
  }),
});

interface RunWorkflowRouteDeps {
  service: CasesWorkflowRunService;
  getSpaceId: (request: KibanaRequest) => string;
}

export const createRunWorkflowRoute = ({ service, getSpaceId }: RunWorkflowRouteDeps) =>
  createCasesRoute({
    method: 'post',
    path: INTERNAL_CASE_WORKFLOW_RUN_URL,
    // AUTHORIZATION NOTE — this route enforces a two-layer privilege model:
    //
    // 1. Route-level (declared here): `workflowsManagement:execute` — the API action registered
    //    by the `workflow_execute` sub-feature privilege in the Workflows Management feature.
    //    This is a *separate* Kibana feature (minimumLicense: enterprise); a role granting Cases
    //    `all` does NOT implicitly grant it, so admins must explicitly assign the sub-privilege.
    //
    // 2. Handler-level (inside CasesWorkflowRunService): `cases:<owner>/updateCase` — checked
    //    by the internal workflow authorization helper. This is owner-scoped and cannot be
    //    declared statically on the route (which is why `DEFAULT_CASES_ROUTE_SECURITY` opts out
    //    for all other Cases routes). It ensures the caller can only trigger workflows for the
    //    authorized cases within the current space.
    security: {
      authz: {
        requiredPrivileges: [...WorkflowsManagementOperationPrivileges.execute],
      },
    },
    params: {
      params: runCaseWorkflowParamsSchema,
      body: runCaseWorkflowBodySchema,
    },
    routerOptions: {
      access: 'internal',
      summary: 'Run a workflow from one or more cases',
      description: 'Runs a workflow with server-owned execution metadata for the authorized cases.',
    },
    handler: async ({ context, request, response }) => {
      const caseContext = await context.cases;
      const casesClient = await caseContext.getCasesClient();
      const { workflow_id: workflowId } = request.params;
      const result = await service.run({
        workflowId,
        body: request.body,
        request,
        context,
        casesClient,
        spaceId: getSpaceId(request),
      });

      return response.ok({ body: result });
    },
  });
