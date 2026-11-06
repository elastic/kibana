/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { IRouter, KibanaResponseFactory, Logger } from '@kbn/core/server';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { AGENTIC_INVESTIGATIONS_API_VERSION } from '../../common/constants';
import {
  INVESTIGATION_LINK_CASE_URL,
  INVESTIGATION_OPEN_CASE_URL,
  linkCaseRequestSchema,
  openCaseRequestSchema,
} from '../../common/cases_bridge';
import { assignConversationRequestParamsSchema } from '../../common/assignments/assignment';
import { INVESTIGATIONS_API_PRIVILEGE_MANAGE } from '../investigations/constants';
import { handleInvestigationRouteError } from '../investigations/routes/handle_route_error';
import { InvestigationAlreadyLinkedError, type CaseBridgeService } from './case_bridge_service';

export interface CaseBridgeRouteDependencies {
  router: IRouter;
  logger: Logger;
  getCaseBridgeService: () => CaseBridgeService;
}

const isCaseError = (error: unknown): error is Error & { boomify: () => Boom.Boom } =>
  error instanceof Error && typeof (error as { boomify?: unknown }).boomify === 'function';

export const handleCaseBridgeRouteError = (
  error: unknown,
  response: KibanaResponseFactory,
  logger: Logger
) => {
  if (error instanceof InvestigationAlreadyLinkedError) {
    return response.conflict({ body: { message: error.message } });
  }
  // The Cases client throws CaseError, which carries its Boom status; the bridge throws Boom: a
  // case the user can't see is a 404, a missing Cases privilege a 403, an invalid case a 400.
  const boom = isCaseError(error) ? error.boomify() : error;
  if (Boom.isBoom(boom) && boom.output.statusCode < 500) {
    return response.customError({
      statusCode: boom.output.statusCode,
      body: { message: boom.message },
    });
  }
  return handleInvestigationRouteError(error, response, logger);
};

/**
 * Open a case from an investigation, and link an investigation to an existing case. Both need the
 * investigations manage privilege here; the Cases client checks the Cases create or update
 * privilege for the Security owner itself.
 */
export const registerCaseBridgeRoutes = ({
  router,
  logger,
  getCaseBridgeService,
}: CaseBridgeRouteDependencies) => {
  router.versioned
    .post({
      path: INVESTIGATION_OPEN_CASE_URL,
      access: 'internal',
      security: { authz: { requiredPrivileges: [INVESTIGATIONS_API_PRIVILEGE_MANAGE] } },
      summary: 'Open a case from an investigation and link investigations to it',
    })
    .addVersion(
      {
        version: AGENTIC_INVESTIGATIONS_API_VERSION,
        validate: {
          request: {
            params: buildRouteValidationWithZod(assignConversationRequestParamsSchema),
            body: buildRouteValidationWithZod(openCaseRequestSchema),
          },
        },
      },
      async (_context, request, response) => {
        try {
          const result = await getCaseBridgeService().openCase(
            request,
            request.params.id,
            request.body
          );
          return response.ok({ body: result });
        } catch (error) {
          return handleCaseBridgeRouteError(error, response, logger);
        }
      }
    );

  router.versioned
    .post({
      path: INVESTIGATION_LINK_CASE_URL,
      access: 'internal',
      security: { authz: { requiredPrivileges: [INVESTIGATIONS_API_PRIVILEGE_MANAGE] } },
      summary: 'Link an investigation to an existing case',
    })
    .addVersion(
      {
        version: AGENTIC_INVESTIGATIONS_API_VERSION,
        validate: {
          request: {
            params: buildRouteValidationWithZod(assignConversationRequestParamsSchema),
            body: buildRouteValidationWithZod(linkCaseRequestSchema),
          },
        },
      },
      async (_context, request, response) => {
        try {
          const result = await getCaseBridgeService().linkCase(
            request,
            request.params.id,
            request.body.case_id
          );
          return response.ok({ body: result });
        } catch (error) {
          return handleCaseBridgeRouteError(error, response, logger);
        }
      }
    );
};
