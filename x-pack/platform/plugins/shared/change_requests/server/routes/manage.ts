/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { sortBy } from 'lodash';
import { createChangeRequestsServerRoute } from './route_factory';
import { CHANGE_REQUESTS_API_PRIVILEGES } from '../constants';

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
            id: hit._id,
            ...requestWithoutSpace,
          };
        }),
      'submittedAt'
    );

    const allRequiredPrivileges = new Set(
      changeRequests.flatMap((changeRequest) =>
        changeRequest.requests.flatMap((apiRequest) => apiRequest.requiredPrivileges)
      )
    );

    // Now check if the current user has these privileges, then based on that result, filter the change requests to only those it could actually approve
    // By going one by one and checking that user.privileges includes ALL request.requiredPrivileges for ALL changeRequest.requests

    const checkPrivileges = security.authz.checkPrivilegesDynamicallyWithRequest(request);
    const { hasAllRequested, privileges } = await checkPrivileges({
      kibana: ['some_crap'],
      elasticsearch: {
        cluster: ['manage_own_api_key'],
        index: {
          whatever: ['delete_index'],
        },
      },
    });

    console.log(JSON.stringify(privileges, null, 2));

    // If hasAllRequested is true, just return all since this user can approve all of these requests

    // Else, filter the requests down to the subset that they can actually approve
    return response.ok({
      body: {
        change_requests: changeRequests,
      },
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

    // I'm missing the HTTP method and API version...

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
