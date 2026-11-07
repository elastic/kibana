/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, Logger } from '@kbn/core/server';
import { ApiPrivileges } from '@kbn/core-security-server';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { z, lazySchema } from '@kbn/zod/v4';
import { AGENTIC_INVESTIGATIONS_API_VERSION } from '../../common/constants';
import {
  CASE_DECISIONS_URL,
  CASE_DECISION_URL,
  caseDecisionRequestSchema,
  caseDecisionsQuerySchema,
} from '../../common/cases_bridge';
import { handleCaseBridgeRouteError } from './routes';
import type { WorkerCaseService } from './worker_case_service';

/** The proposals plugin's own route privileges (its approve and dismiss routes need manage). */
const PROPOSALS_API_PRIVILEGE_READ = ApiPrivileges.read('proposals');
const PROPOSALS_API_PRIVILEGE_MANAGE = ApiPrivileges.manage('proposals');

const caseParamsSchema = lazySchema(() => z.object({ case_id: z.string().min(1).max(1024) }));
const decisionParamsSchema = lazySchema(() =>
  caseParamsSchema.extend({
    proposal_id: z.string().min(1).max(1024),
  })
);

/**
 * Decisions on a case (Phase 5). The case is read as the caller, so a restricted case a
 * non-member asks for is not found; the Cases client checks Cases update before a decision.
 */
export const registerCaseDecisionRoutes = ({
  router,
  logger,
  getWorkerCaseService,
}: {
  router: IRouter;
  logger: Logger;
  getWorkerCaseService: () => WorkerCaseService;
}) => {
  router.versioned
    .get({
      path: CASE_DECISIONS_URL,
      access: 'internal',
      security: { authz: { requiredPrivileges: [PROPOSALS_API_PRIVILEGE_READ] } },
      summary: "List a case's decisions",
    })
    .addVersion(
      {
        version: AGENTIC_INVESTIGATIONS_API_VERSION,
        validate: {
          request: {
            params: buildRouteValidationWithZod(caseParamsSchema),
            query: buildRouteValidationWithZod(caseDecisionsQuerySchema),
          },
        },
      },
      async (_context, request, response) => {
        try {
          const body = await getWorkerCaseService().listDecisions(
            request,
            request.params.case_id,
            request.query
          );
          return response.ok({ body });
        } catch (error) {
          return handleCaseBridgeRouteError(error, response, logger);
        }
      }
    );

  router.versioned
    .post({
      path: CASE_DECISION_URL,
      access: 'internal',
      security: { authz: { requiredPrivileges: [PROPOSALS_API_PRIVILEGE_MANAGE] } },
      summary: 'Approve or dismiss a decision on a case',
    })
    .addVersion(
      {
        version: AGENTIC_INVESTIGATIONS_API_VERSION,
        validate: {
          request: {
            params: buildRouteValidationWithZod(decisionParamsSchema),
            body: buildRouteValidationWithZod(caseDecisionRequestSchema),
          },
        },
      },
      async (_context, request, response) => {
        try {
          const body = await getWorkerCaseService().decide(
            request,
            request.params.case_id,
            request.params.proposal_id,
            request.body.decision
          );
          return response.ok({ body });
        } catch (error) {
          return handleCaseBridgeRouteError(error, response, logger);
        }
      }
    );
};
