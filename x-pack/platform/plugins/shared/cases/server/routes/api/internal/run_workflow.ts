/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { KibanaRequest } from '@kbn/core/server';
import { WorkflowsManagementOperationPrivileges } from '@kbn/workflows';
import { INTERNAL_CASE_WORKFLOW_RUN_URL } from '../../../../common/constants';
import { MAX_CASE_WORKFLOW_RUN_ID_LENGTH } from '../../../../common/types/api/workflow/v1';
import {
  ALERT_WORKFLOW_ORIGIN_TYPE,
  ALERTS_WORKFLOW_ORIGIN_TYPE,
  CASE_WORKFLOW_ORIGIN_TYPE,
  OBSERVABLE_WORKFLOW_ORIGIN_TYPE,
} from '../../../../common/types/domain/user_action/workflow/constants';
import type { RunCaseWorkflowRequest } from '../../../../common/types/api';
import type { CasesWorkflowRunService } from '../../../workflows/execution/service';
import { createCasesRoute } from '../create_cases_route';

const MAX_WORKFLOW_INPUTS_BYTES = 1_000_000;

interface RunWorkflowRouteDeps {
  service: CasesWorkflowRunService;
  getSpaceId: (request: KibanaRequest) => string;
}

export const createRunWorkflowRoute = ({ service, getSpaceId }: RunWorkflowRouteDeps) =>
  createCasesRoute({
    method: 'post',
    path: INTERNAL_CASE_WORKFLOW_RUN_URL,
    security: {
      authz: {
        requiredPrivileges: [...WorkflowsManagementOperationPrivileges.execute],
      },
    },
    params: {
      params: schema.object({
        case_id: schema.string({ minLength: 1, maxLength: MAX_CASE_WORKFLOW_RUN_ID_LENGTH }),
        workflow_id: schema.string({
          minLength: 1,
          maxLength: MAX_CASE_WORKFLOW_RUN_ID_LENGTH,
        }),
      }),
      body: schema.object({
        inputs: schema.recordOf(schema.string({ maxLength: 1024 }), schema.any(), {
          validate: (inputs) =>
            Buffer.byteLength(JSON.stringify(inputs)) <= MAX_WORKFLOW_INPUTS_BYTES
              ? undefined
              : `Workflow inputs cannot exceed ${MAX_WORKFLOW_INPUTS_BYTES} bytes.`,
        }),
        origin: schema.object({
          type: schema.oneOf([
            schema.literal(CASE_WORKFLOW_ORIGIN_TYPE),
            schema.literal(OBSERVABLE_WORKFLOW_ORIGIN_TYPE),
            schema.literal(ALERT_WORKFLOW_ORIGIN_TYPE),
            schema.literal(ALERTS_WORKFLOW_ORIGIN_TYPE),
          ]),
          id: schema.string({ minLength: 1, maxLength: MAX_CASE_WORKFLOW_RUN_ID_LENGTH }),
        }),
      }),
    },
    routerOptions: {
      access: 'internal',
      summary: 'Run a workflow from a case',
      description:
        'Runs a workflow and records the execution in the activity of the authorized case.',
    },
    handler: async ({ context, request, response }) => {
      const caseContext = await context.cases;
      const casesClient = await caseContext.getCasesClient();
      const { case_id: caseId, workflow_id: workflowId } = request.params;
      const result = await service.run({
        caseId,
        workflowId,
        body: request.body as RunCaseWorkflowRequest,
        request,
        context,
        casesClient,
        spaceId: getSpaceId(request),
      });

      return response.ok({ body: result });
    },
  });
