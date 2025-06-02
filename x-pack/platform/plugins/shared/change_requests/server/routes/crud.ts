/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { badRequest } from '@hapi/boom';
import { submitRequestBodyRt } from '../types';
import { createChangeRequestsServerRoute } from './route_factory';
import { CHANGE_REQUESTS_API_PRIVILEGES } from '../constants';

// Test that the authz works

const submitRequestRoute = createChangeRequestsServerRoute({
  endpoint: 'POST /internal/change_requests/change_requests',
  security: {
    authz: {
      requiredPrivileges: [CHANGE_REQUESTS_API_PRIVILEGES.create],
    },
  },
  params: z.object({
    body: submitRequestBodyRt,
  }),
  handler: async ({ params, response, getScopedClients, request, context }) => {
    if (params.body.requests.length === 0) {
      // The copy in this whole plugin is just bad.
      throw badRequest('An approval request should contain a least one request');
    }

    if (
      params.body.requests.some(
        (approvalRequest) => approvalRequest.requiredPrivileges.length === 0
      )
    ) {
      throw badRequest('An approval request should contain a least one required privilege');
    }

    const { storageClient } = await getScopedClients(request);

    const userId = (await (await context.core).userProfile.getCurrent())?.uid!;

    const indexResponse = await storageClient.index({
      document: {
        request: {
          ...params.body,
          user: userId,
          status: 'pending',
          submittedAt: new Date().toISOString(),
          handledAt: undefined,
        },
      },
    });

    // Send notification email if available, requires notifications plugin
    // https://github.com/elastic/kibana/blob/main/x-pack/platform/plugins/shared/notifications/README.mdx

    return response.created({
      body: {
        id: indexResponse._id,
      },
    });
  },
});

const listRequestsRoute = createChangeRequestsServerRoute({
  endpoint: 'GET /internal/change_requests/change_requests',
  security: {
    authz: {
      requiredPrivileges: [CHANGE_REQUESTS_API_PRIVILEGES.create],
    },
  },
  handler: async ({ response }) => {
    // Load your list with the storage client
    return response.ok({
      body: 'List of your requests',
    });
  },
});

export const crudRoutes = {
  ...submitRequestRoute,
  ...listRequestsRoute,
};
