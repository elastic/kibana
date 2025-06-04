/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { badRequest } from '@hapi/boom';
import { CoreStart, KibanaRequest } from '@kbn/core/server';
import { RequiredPrivileges, submitRequestBodyRt } from '../types';
import { createChangeRequestsServerRoute } from './route_factory';
import { CHANGE_REQUESTS_API_PRIVILEGES } from '../constants';

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
  handler: async ({ params, response, getClients, getStartServices, request }) => {
    if (params.body.actions.length === 0) {
      // The copy in this whole plugin is just bad.
      throw badRequest('An approval request should contain a least one request');
    }

    if (
      params.body.actions.some((action) => isEmptyRequiredPrivileges(action.requiredPrivileges))
    ) {
      throw badRequest('An approval request should contain a least one required privilege');
    }

    const { core, spaces } = await getStartServices();
    const user = await getCurrentUser(core, request);
    const space = spaces.spacesService.getSpaceId(request);

    const { storageClient } = await getClients();

    const indexResponse = await storageClient.index({
      document: {
        request: {
          ...params.body,
          user,
          space,
          status: 'pending',
          submittedAt: new Date().toISOString(),
          handledAt: undefined,
        },
      },
    });

    // Could send a notification email if available, requires notifications plugin
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
  handler: async ({ response, getClients, getStartServices, request }) => {
    const { core, spaces } = await getStartServices();
    const user = await getCurrentUser(core, request);
    const space = spaces.spacesService.getSpaceId(request);

    const { storageClient } = await getClients();

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

    const changeRequests = result.hits.hits
      .filter((hit) => hit._source.request.user === user && hit._source.request.space === space)
      .map((hit) => {
        const { user: _user, space: _space, ...requestWithoutUser } = hit._source.request;
        return {
          id: hit._id,
          ...requestWithoutUser,
        };
      });

    return response.ok({
      body: {
        change_requests: changeRequests,
      },
    });
  },
});

async function getCurrentUser(core: CoreStart, request: KibanaRequest) {
  const currentUser = core.security.authc.getCurrentUser(request);

  if (!currentUser) {
    throw new Error('Could not resolve current user');
  }

  return currentUser.username;
}

function isEmptyRequiredPrivileges(requiredPrivileges: RequiredPrivileges) {
  const missingKibanaPrivileges = requiredPrivileges.kibana
    ? requiredPrivileges.kibana.length === 0
    : true;

  const missingClusterPrivileges = requiredPrivileges.elasticsearch
    ? requiredPrivileges.elasticsearch.cluster.length === 0
    : true;
  const hasIndexPrivileges = requiredPrivileges.elasticsearch
    ? isEmptyIndexPrivileges(requiredPrivileges.elasticsearch.index)
    : true;
  const missingElasticsearchPrivileges = missingClusterPrivileges && hasIndexPrivileges;

  return missingKibanaPrivileges && missingElasticsearchPrivileges;
}

function isEmptyIndexPrivileges(
  indexPrivileges: Exclude<RequiredPrivileges['elasticsearch'], undefined>['index']
) {
  if (Object.keys(indexPrivileges).length === 0) {
    return true;
  }

  if (Object.values(indexPrivileges).some((privileges) => privileges.length === 0)) {
    return true;
  }

  return false;
}

export const crudRoutes = {
  ...submitRequestRoute,
  ...listRequestsRoute,
};
