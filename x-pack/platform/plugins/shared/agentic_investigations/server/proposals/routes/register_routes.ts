/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { AGENTIC_INVESTIGATIONS_API_VERSION } from '../../../common/constants';
import {
  PROPOSALS_INTERNAL_URL,
  PROPOSAL_APPROVE_URL,
  PROPOSAL_BY_ID_URL,
  PROPOSAL_DISMISS_URL,
} from '../../../common/proposals/constants';
import { PROPOSALS_API_PRIVILEGE_MANAGE, PROPOSALS_API_PRIVILEGE_READ } from '../constants';
import {
  approveProposalRequestSchema,
  createProposalRequestSchema,
  dismissProposalRequestSchema,
  listProposalsQuerySchema,
} from '../../../common/proposals/proposal';
import type { RouteDependencies } from '../types';
import { handleRouteError } from './handle_route_error';

const INTERNAL_ACCESS = 'internal' as const;

const proposalIdParamsSchema = z.object({
  id: z.string().min(1).max(256),
});

export const registerRoutes = (deps: RouteDependencies) => {
  registerCreateProposalRoute(deps);
  registerListProposalsRoute(deps);
  registerGetProposalRoute(deps);
  registerApproveProposalRoute(deps);
  registerDismissProposalRoute(deps);
};

const registerCreateProposalRoute = ({
  router,
  logger,
  getProposalsService,
  getSpaceId,
  getUsername,
}: RouteDependencies) => {
  router.versioned
    .post({
      path: PROPOSALS_INTERNAL_URL,
      access: INTERNAL_ACCESS,
      security: { authz: { requiredPrivileges: [PROPOSALS_API_PRIVILEGE_MANAGE] } },
      summary: 'Create an investigation proposal',
    })
    .addVersion(
      {
        version: AGENTIC_INVESTIGATIONS_API_VERSION,
        validate: { request: { body: buildRouteValidationWithZod(createProposalRequestSchema) } },
      },
      async (_context, request, response) => {
        try {
          const proposal = await getProposalsService().create(request.body, {
            spaceId: getSpaceId(request),
            username: await getUsername(request),
          });
          return response.ok({ body: proposal });
        } catch (error) {
          return handleRouteError(error, response, logger);
        }
      }
    );
};

const registerListProposalsRoute = ({
  router,
  logger,
  getProposalsService,
  getSpaceId,
}: RouteDependencies) => {
  router.versioned
    .get({
      path: PROPOSALS_INTERNAL_URL,
      access: INTERNAL_ACCESS,
      security: { authz: { requiredPrivileges: [PROPOSALS_API_PRIVILEGE_READ] } },
      summary: 'List investigation proposals',
    })
    .addVersion(
      {
        version: AGENTIC_INVESTIGATIONS_API_VERSION,
        validate: { request: { query: buildRouteValidationWithZod(listProposalsQuerySchema) } },
      },
      async (_context, request, response) => {
        try {
          const body = await getProposalsService().list(request.query, getSpaceId(request));
          return response.ok({ body });
        } catch (error) {
          return handleRouteError(error, response, logger);
        }
      }
    );
};

const registerGetProposalRoute = ({
  router,
  logger,
  getProposalsService,
  getSpaceId,
}: RouteDependencies) => {
  router.versioned
    .get({
      path: PROPOSAL_BY_ID_URL,
      access: INTERNAL_ACCESS,
      security: { authz: { requiredPrivileges: [PROPOSALS_API_PRIVILEGE_READ] } },
      summary: 'Get an investigation proposal',
    })
    .addVersion(
      {
        version: AGENTIC_INVESTIGATIONS_API_VERSION,
        validate: { request: { params: buildRouteValidationWithZod(proposalIdParamsSchema) } },
      },
      async (_context, request, response) => {
        try {
          const body = await getProposalsService().get(request.params.id, getSpaceId(request));
          return response.ok({ body });
        } catch (error) {
          return handleRouteError(error, response, logger);
        }
      }
    );
};

const registerApproveProposalRoute = ({
  router,
  logger,
  getProposalsService,
  getSpaceId,
  getUsername,
}: RouteDependencies) => {
  router.versioned
    .post({
      path: PROPOSAL_APPROVE_URL,
      access: INTERNAL_ACCESS,
      security: { authz: { requiredPrivileges: [PROPOSALS_API_PRIVILEGE_MANAGE] } },
      summary: 'Approve an investigation proposal',
    })
    .addVersion(
      {
        version: AGENTIC_INVESTIGATIONS_API_VERSION,
        validate: {
          request: {
            params: buildRouteValidationWithZod(proposalIdParamsSchema),
            body: buildRouteValidationWithZod(approveProposalRequestSchema),
          },
        },
      },
      async (_context, request, response) => {
        try {
          const proposal = await getProposalsService().approve(request.params.id, request.body, {
            spaceId: getSpaceId(request),
            request,
            username: await getUsername(request),
          });
          return response.ok({ body: proposal });
        } catch (error) {
          return handleRouteError(error, response, logger);
        }
      }
    );
};

const registerDismissProposalRoute = ({
  router,
  logger,
  getProposalsService,
  getSpaceId,
  getUsername,
}: RouteDependencies) => {
  router.versioned
    .post({
      path: PROPOSAL_DISMISS_URL,
      // Dismissing suppresses a recommendation and releases the waiting
      // worker, so it is gated exactly like approval.
      access: INTERNAL_ACCESS,
      security: { authz: { requiredPrivileges: [PROPOSALS_API_PRIVILEGE_MANAGE] } },
      summary: 'Dismiss an investigation proposal',
    })
    .addVersion(
      {
        version: AGENTIC_INVESTIGATIONS_API_VERSION,
        validate: {
          request: {
            params: buildRouteValidationWithZod(proposalIdParamsSchema),
            body: buildRouteValidationWithZod(dismissProposalRequestSchema),
          },
        },
      },
      async (_context, request, response) => {
        try {
          const proposal = await getProposalsService().dismiss(request.params.id, request.body, {
            spaceId: getSpaceId(request),
            request,
            username: await getUsername(request),
          });
          return response.ok({ body: proposal });
        } catch (error) {
          return handleRouteError(error, response, logger);
        }
      }
    );
};
