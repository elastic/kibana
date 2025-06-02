/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { createChangeRequestsServerRoute } from './route_factory';
import { CHANGE_REQUESTS_API_PRIVILEGES } from '../constants';

// Test that the authz works

const listRequestsRoute = createChangeRequestsServerRoute({
  endpoint: 'GET /internal/change_requests/manage/change_requests',
  security: {
    authz: {
      requiredPrivileges: [CHANGE_REQUESTS_API_PRIVILEGES.manage],
    },
  },
  handler: async ({ response }) => {
    // The caller should be an admin, so we pull out all requests, and filter them based on if the admin can actually manage them

    // How do we check privileges required for approval? It's not as simple as "admin".
    // I guess the plugin should know what is needed on submission, else it would just allow the user to perform the action
    // So the request should include a list, then we can fetch the current users privileges and filter based on that

    return response.ok({
      body: 'List of requests to manage',
    });
  },
});

const approveRequestRoute = createChangeRequestsServerRoute({
  endpoint: 'POST /internal/change_requests/manage/change_requests/{id}/_approve',
  security: {
    authz: {
      requiredPrivileges: [CHANGE_REQUESTS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    path: z.object({
      id: z.string(),
    }),
  }),
  handler: async ({ params, response }) => {
    // Once I've read the request from the index, how do I put the path params into the endpoint string?
    // Attaching query params and the body should be easy since this part won't be type safe (that burden is on the one submitting the request)

    // How do I bubble back "failed to apply requested changes"
    // How can we push an update about this back to the user?

    // How do we handle rollbacks in case of failure?

    return response.ok({
      body: `Request ${params.path.id} approved`,
    });
  },
});

const declineRequestRoute = createChangeRequestsServerRoute({
  endpoint: 'POST /internal/change_requests/manage/change_requests/{id}/_decline',
  security: {
    authz: {
      requiredPrivileges: [CHANGE_REQUESTS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    path: z.object({
      id: z.string(),
    }),
  }),
  handler: async ({ params, response }) => {
    // How can we push an update about this back to the user which submitted the request?

    return response.ok({
      body: `Request ${params.path.id} declined`,
    });
  },
});

export const manageRoutes = {
  ...listRequestsRoute,
  ...approveRequestRoute,
  ...declineRequestRoute,
};
