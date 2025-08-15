/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { ErrorCause } from '@elastic/elasticsearch/lib/api/types';
import { internal } from '@hapi/boom';
import { STREAMS_API_PRIVILEGES } from '../../../common/constants';
import { Asset, DashboardAsset } from '../../../common/assets';
import { createServerRoute } from '../create_server_route';
import { ASSET_ID, ASSET_TYPE } from '../../lib/streams/assets/fields';

export interface SanitizedDashboardAsset {
  id: string;
  title: string;
  tags: string[];
}

export interface ListDashboardsResponse {
  dashboards: SanitizedDashboardAsset[];
}

export interface LinkDashboardResponse {
  acknowledged: boolean;
}

export interface UnlinkDashboardResponse {
  acknowledged: boolean;
}

export interface SuggestDashboardResponse {
  suggestions: SanitizedDashboardAsset[];
}

export type BulkUpdateAssetsResponse =
  | {
      acknowledged: boolean;
    }
  | { errors: ErrorCause[] };

function sanitizeDashboardAsset(asset: DashboardAsset): SanitizedDashboardAsset {
  return {
    id: asset[ASSET_ID],
    title: asset.title,
    tags: asset.tags,
  };
}

const listDashboardsRoute = createServerRoute({
  endpoint: 'GET /api/streams/{name}/dashboards 2023-10-31',
  options: {
    access: 'public',
    summary: 'Get stream dashboards',
    description:
      'Fetches all dashboards linked to a stream that are visible to the current user in the current space.',
    availability: {
      stability: 'experimental',
    },
  },
  params: z.object({
    path: z.object({
      name: z.string().describe('The name of the stream to fetch dashboards for'),
    }),
  }),
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  responses: {
    200: {
      description: 'Example Response - TODO: Add at least one response to statisfy OpenAPI Spec',
      body: z.looseObject({}),
      bodyContentType: 'application/json',
    },
  },
  async handler({ params, request, getScopedClients }): Promise<ListDashboardsResponse> {
    const { assetClient, streamsClient } = await getScopedClients({ request });
    await streamsClient.ensureStream(params.path.name);

    const {
      path: { name: streamName },
    } = params;

    function isDashboard(asset: Asset): asset is DashboardAsset {
      return asset[ASSET_TYPE] === 'dashboard';
    }

    return {
      dashboards: (await assetClient.getAssets(streamName))
        .filter(isDashboard)
        .map(sanitizeDashboardAsset),
    };
  },
});

const linkDashboardRoute = createServerRoute({
  endpoint: 'PUT /api/streams/{name}/dashboards/{dashboardId} 2023-10-31',
  options: {
    access: 'public',
    summary: 'Link a dashboard to a stream',
    description:
      'Links a dashboard to a stream. Noop if the dashboard is already linked to the stream.',
    availability: {
      stability: 'experimental',
    },
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    path: z.object({
      name: z.string(),
      dashboardId: z.string(),
    }),
  }),
  responses: {
    200: {
      description: 'Example Response - TODO: Add at least one response to statisfy OpenAPI Spec',
      body: z.looseObject({}),
      bodyContentType: 'application/json',
    },
  },
  handler: async ({ params, request, getScopedClients }): Promise<LinkDashboardResponse> => {
    const { assetClient, streamsClient } = await getScopedClients({ request });
    const {
      path: { dashboardId, name: streamName },
    } = params;

    await streamsClient.ensureStream(streamName);

    await assetClient.linkAsset(streamName, {
      [ASSET_TYPE]: 'dashboard',
      [ASSET_ID]: dashboardId,
    });

    return {
      acknowledged: true,
    };
  },
});

const unlinkDashboardRoute = createServerRoute({
  endpoint: 'DELETE /api/streams/{name}/dashboards/{dashboardId} 2023-10-31',
  options: {
    access: 'public',
    summary: 'Unlink a dashboard from a stream',
    description:
      'Unlinks a dashboard from a stream. Noop if the dashboard is not linked to the stream.',
    availability: {
      stability: 'experimental',
    },
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    path: z.object({
      name: z.string(),
      dashboardId: z.string(),
    }),
  }),
  responses: {
    200: {
      description: 'Example Response - TODO: Add at least one response to statisfy OpenAPI Spec',
      body: z.looseObject({}),
      bodyContentType: 'application/json',
    },
  },
  handler: async ({ params, request, getScopedClients }): Promise<UnlinkDashboardResponse> => {
    const { assetClient, streamsClient } = await getScopedClients({ request });

    await streamsClient.ensureStream(params.path.name);

    const {
      path: { dashboardId, name: streamName },
    } = params;

    await assetClient.unlinkAsset(streamName, {
      [ASSET_ID]: dashboardId,
      [ASSET_TYPE]: 'dashboard',
    });

    return {
      acknowledged: true,
    };
  },
});

const suggestDashboardsRoute = createServerRoute({
  endpoint: 'POST /internal/streams/{name}/dashboards/_suggestions',
  options: {
    access: 'internal',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    path: z.object({
      name: z.string(),
    }),
    query: z.object({
      query: z.string(),
    }),
    body: z.object({
      tags: z.optional(z.array(z.string())),
    }),
  }),
  handler: async ({ params, request, getScopedClients }): Promise<SuggestDashboardResponse> => {
    const { assetClient, streamsClient } = await getScopedClients({ request });

    await streamsClient.ensureStream(params.path.name);

    const {
      query: { query },
      body: { tags },
    } = params;

    const suggestions = (
      await assetClient.getSuggestions({
        assetTypes: ['dashboard'],
        query,
        tags,
      })
    ).assets.map((asset) => {
      return sanitizeDashboardAsset(asset as DashboardAsset);
    });

    return {
      suggestions,
    };
  },
});

const dashboardSchema = z.object({
  id: z.string(),
});

const bulkDashboardsRoute = createServerRoute({
  endpoint: `POST /api/streams/{name}/dashboards/_bulk 2023-10-31`,
  options: {
    access: 'public',
    summary: 'Bulk update dashboards',
    description:
      'Bulk update dashboards linked to a stream. Can link new dashboards and delete existing ones.',
    availability: {
      stability: 'experimental',
    },
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    path: z.object({
      name: z.string(),
    }),
    body: z.object({
      operations: z.array(
        z.union([
          z.object({
            index: dashboardSchema,
          }),
          z.object({
            delete: dashboardSchema,
          }),
        ])
      ),
    }),
  }),
  responses: {
    200: {
      description: 'Example Response - TODO: Add at least one response to statisfy OpenAPI Spec',
      body: z.looseObject({}),
      bodyContentType: 'application/json',
    },
  },
  handler: async ({
    params,
    request,
    getScopedClients,
    logger,
  }): Promise<BulkUpdateAssetsResponse> => {
    const { assetClient, streamsClient } = await getScopedClients({ request });

    const {
      path: { name: streamName },
      body: { operations },
    } = params;

    await streamsClient.ensureStream(streamName);

    const result = await assetClient.bulk(
      streamName,
      operations.map((operation) => {
        if ('index' in operation) {
          return {
            index: {
              asset: {
                [ASSET_TYPE]: 'dashboard',
                [ASSET_ID]: operation.index.id,
              },
            },
          };
        }
        return {
          delete: {
            asset: {
              [ASSET_TYPE]: 'dashboard',
              [ASSET_ID]: operation.delete.id,
            },
          },
        };
      })
    );

    if (result.errors) {
      logger.error(`Error indexing some items`);
      throw internal(`Could not index all items`, { errors: result.errors });
    }

    return { acknowledged: true };
  },
});

export const dashboardRoutes = {
  ...listDashboardsRoute,
  ...linkDashboardRoute,
  ...unlinkDashboardRoute,
  ...suggestDashboardsRoute,
  ...bulkDashboardsRoute,
};
