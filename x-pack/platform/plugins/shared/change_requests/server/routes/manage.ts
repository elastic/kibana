/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { sortBy } from 'lodash';
import { isNotFoundError } from '@kbn/es-errors';
import { badRequest, notFound } from '@hapi/boom';
import { createChangeRequestsServerRoute } from './route_factory';
import { CHANGE_REQUESTS_API_PRIVILEGES } from '../constants';
import { ChangeRequestDoc, Status, statusRt } from '../types';
import { getCurrentUser } from '../lib/get_current_user';

const listRequestsRoute = createChangeRequestsServerRoute({
  endpoint: 'GET /internal/change_requests/manage/change_requests',
  security: {
    authz: {
      requiredPrivileges: [CHANGE_REQUESTS_API_PRIVILEGES.manage],
    },
  },
  handler: async ({ response, getClients, getStartServices, request }) => {
    const { storageClient } = await getClients();
    const { security, spaces } = await getStartServices();
    const space = spaces.spacesService.getSpaceId(request);

    const result = await storageClient.search({
      size: 10000,
      track_total_hits: false,
    });

    if (result.hits.total) {
      // This property is only there if there are 0 hits since we don't track total hits
      return response.ok({
        body: {
          change_requests: [],
        },
      });
    }

    const changeRequests = sortBy(
      result.hits.hits
        .filter((hit) => hit._source.request.space === space)
        .map((hit) => {
          const { space: _space, ...requestWithoutSpace } = hit._source.request;
          return {
            id: hit._id!, // Odd that I have to insist here
            ...requestWithoutSpace,
          };
        }),
      'submittedAt'
    );

    // This process might be fairly expensive if it is done for many requests and requested frequently (add APM)
    const checkPrivileges = security.authz.checkPrivilegesDynamicallyWithRequest(request);
    const results = await Promise.all(
      changeRequests
        .flatMap((changeRequest) =>
          changeRequest.actions.map(
            (action, index) =>
              [authorizationId(changeRequest, index), action.requiredPrivileges] as const
          )
        )
        .map(async ([id, requiredPrivileges]) => {
          const { hasAllRequested } = await checkPrivileges(requiredPrivileges);
          return [id, hasAllRequested] as const;
        })
    );
    const actionAuthorizationResults = Object.fromEntries(results);

    const authorizedChangeRequests = changeRequests
      .filter((changeRequest) => {
        const authorizedActions = changeRequest.actions.filter((action, index) => {
          return actionAuthorizationResults[authorizationId(changeRequest, index)];
        });
        return authorizedActions.length === changeRequest.actions.length;
      })
      .map((changeRequest) => {
        return {
          ...changeRequest,
          actions: changeRequest.actions.map((action) => {
            const { requiredPrivileges, ...actionWithoutRequiredPrivileges } = action;
            return actionWithoutRequiredPrivileges;
          }),
        };
      });

    return response.ok({
      body: {
        change_requests: authorizedChangeRequests,
      },
    });
  },
});

function authorizationId(changeRequest: { id: string }, index: number) {
  return `${changeRequest.id}_${index}` as string;
}

const updateRequestRoute = createChangeRequestsServerRoute({
  endpoint: 'PATCH /internal/change_requests/manage/change_requests/{id}',
  security: {
    authz: {
      requiredPrivileges: [CHANGE_REQUESTS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    path: z.object({
      id: z.string(),
    }),
    body: z.object({
      status: statusRt,
      reviewComment: z.string().optional(),
    }),
  }),
  handler: async ({ params, response, getClients, getStartServices, request }) => {
    // For approve, I probably want a lock but how does that even work if the UI is doing the actions?

    try {
      const { storageClient } = await getClients();
      const { security, spaces, core } = await getStartServices();
      const space = spaces.spacesService.getSpaceId(request);
      const user = await getCurrentUser(core, request);

      const result = await storageClient.get({
        id: params.path.id,
      });

      const changeRequest = result._source?.request;
      if (!changeRequest) {
        throw notFound();
      }

      if (changeRequest.space !== space) {
        throw notFound();
      }

      if (changeRequest.user === user) {
        throw badRequest('You cannot approve your own change request'); // Or?
      }

      assertValidStatusTransition(changeRequest.status, params.body.status);

      const checkPrivileges = security.authz.checkPrivilegesDynamicallyWithRequest(request);
      const authorizationResults = await Promise.all(
        changeRequest.actions.map(async (action) => checkPrivileges(action.requiredPrivileges))
      );
      const isAuthorized = authorizationResults.every(({ hasAllRequested }) => hasAllRequested);

      if (!isAuthorized) {
        throw notFound();
      }

      const updatedChangeRequest: ChangeRequestDoc = {
        ...changeRequest,
        lastUpdatedAt: new Date().toISOString(),
        reviewedBy: user,
        status: params.body.status,
        reviewComment: params.body.reviewComment,
      };

      // Do I need to log this event for audit tracing?
      storageClient.index({
        id: params.path.id,
        document: {
          request: updatedChangeRequest,
        },
      });

      return response.ok({
        body: {
          change_request: updatedChangeRequest,
        },
      });
    } catch (error) {
      if (isNotFoundError(error)) {
        throw notFound();
      }

      throw error;
    }
  },
});

function assertValidStatusTransition(currentStatus: Status, nextStatus: Status) {
  if (currentStatus === 'pending') {
    const invalidTransitions: Status[] = ['pending', 'applied', 'failed'];
    if (invalidTransitions.includes(nextStatus)) {
      throw badRequest(`Invalid status transitions: ${currentStatus} -> ${nextStatus}`);
    }
    return;
  }

  if (currentStatus === 'approved') {
    const invalidTransitions: Status[] = ['pending', 'rejected', 'approved'];
    if (invalidTransitions.includes(nextStatus)) {
      throw badRequest(`Invalid status transitions: ${currentStatus} -> ${nextStatus}`);
    }
    return;
  }

  if (currentStatus === 'applied') {
    const invalidTransitions: Status[] = ['pending', 'approved', 'rejected', 'failed', 'applied'];
    if (invalidTransitions.includes(nextStatus)) {
      throw badRequest(`Invalid status transitions: ${currentStatus} -> ${nextStatus}`);
    }
    return;
  }

  if (currentStatus === 'rejected') {
    const invalidTransitions: Status[] = ['pending', 'rejected', 'failed', 'applied'];
    if (invalidTransitions.includes(nextStatus)) {
      throw badRequest(`Invalid status transitions: ${currentStatus} -> ${nextStatus}`);
    }
    return;
  }

  if (currentStatus === 'failed') {
    const invalidTransitions: Status[] = ['pending', 'applied', 'failed'];
    if (invalidTransitions.includes(nextStatus)) {
      throw badRequest(`Invalid status transitions: ${currentStatus} -> ${nextStatus}`);
    }
    return;
  }
}

export const manageRoutes = {
  ...listRequestsRoute,
  ...updateRequestRoute,
};
