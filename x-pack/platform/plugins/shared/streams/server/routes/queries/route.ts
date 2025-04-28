/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ErrorCause } from '@elastic/elasticsearch/lib/api/types';
import { internal } from '@hapi/boom';
import {
  StreamQuery,
  StreamQueryKql,
  streamQuerySchema,
  upsertStreamQueryRequestSchema,
} from '@kbn/streams-schema';
import { z } from '@kbn/zod';
import { QueryLink } from '../../../common/assets';
import { STREAMS_API_PRIVILEGES } from '../../../common/constants';
import { ASSET_ID, ASSET_TYPE } from '../../lib/streams/assets/fields';
import { createServerRoute } from '../create_server_route';
export interface ListQueriesResponse {
  queries: StreamQuery[];
}

export interface UpsertQueryResponse {
  acknowledged: boolean;
}

export interface DeleteQueryResponse {
  acknowledged: boolean;
}

export type BulkUpdateAssetsResponse = { acknowledged: boolean } | { errors: ErrorCause[] };

function isDeleteOperation(
  operation: { index: StreamQueryKql } | { delete: { id: string } }
): operation is { delete: { id: string } } {
  return 'delete' in operation;
}

function isIndexOperation(
  operation: { index: StreamQueryKql } | { delete: { id: string } }
): operation is { index: StreamQueryKql } {
  return 'index' in operation;
}

const listQueriesRoute = createServerRoute({
  endpoint: 'GET /api/streams/{name}/queries 2023-10-31',
  options: {
    access: 'public',
    summary: 'Get stream queries',
    description:
      'Fetches all queries linked to a stream that are visible to the current user in the current space.',
    availability: {
      stability: 'experimental',
    },
  },
  params: z.object({
    path: z.object({
      name: z.string(),
    }),
  }),
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  async handler({ params, request, getScopedClients }): Promise<ListQueriesResponse> {
    const { assetClient, streamsClient } = await getScopedClients({ request });
    await streamsClient.ensureStream(params.path.name);

    const {
      path: { name: streamName },
    } = params;

    const queryAssets = await assetClient.getAssetLinks(streamName, ['query']);

    return {
      queries: queryAssets.map((queryAsset) => queryAsset.query),
    };
  },
});

const upsertQueryRoute = createServerRoute({
  endpoint: 'PUT /api/streams/{name}/queries/{queryId} 2023-10-31',
  options: {
    access: 'public',
    summary: 'Upsert a query to a stream',
    description: 'Adds a query to a stream. Noop if the query is already present on the stream.',
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
      queryId: z.string(),
    }),
    body: upsertStreamQueryRequestSchema,
  }),
  handler: async ({ params, request, getScopedClients }): Promise<UpsertQueryResponse> => {
    const { assetClient, streamsClient } = await getScopedClients({ request });
    const {
      path: { name: streamName, queryId },
      body,
    } = params;

    await streamsClient.ensureStream(streamName);

    const assetLinked = await assetClient.linkAsset(streamName, {
      [ASSET_TYPE]: 'query',
      [ASSET_ID]: queryId,
      query: {
        id: queryId,
        title: body.title,
        kql: {
          query: body.kql.query,
        },
      },
    });

    await streamsClient.manageQueries(streamName, {
      indexed: [assetLinked as QueryLink],
    });

    return {
      acknowledged: true,
    };
  },
});

const deleteQueryRoute = createServerRoute({
  endpoint: 'DELETE /api/streams/{name}/queries/{queryId} 2023-10-31',
  options: {
    access: 'public',
    summary: 'Remove a query from a stream',
    description: 'Remove a query from a stream. Noop if the query is not found on the stream.',
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
      queryId: z.string(),
    }),
  }),
  handler: async ({ params, request, getScopedClients }): Promise<DeleteQueryResponse> => {
    const { assetClient, streamsClient } = await getScopedClients({ request });

    const {
      path: { queryId, name: streamName },
    } = params;

    await streamsClient.ensureStream(streamName);

    const assetUnlinked = await assetClient.unlinkAsset(streamName, {
      [ASSET_TYPE]: 'query',
      [ASSET_ID]: queryId,
    });

    await streamsClient.manageQueries(streamName, {
      deleted: [assetUnlinked as QueryLink],
    });

    return {
      acknowledged: true,
    };
  },
});

const bulkQueriesRoute = createServerRoute({
  endpoint: `POST /api/streams/{name}/queries/_bulk 2023-10-31`,
  options: {
    access: 'public',
    summary: 'Bulk update queries',
    description: 'Bulk update queries of a stream. Can add new queries and delete existing ones.',
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
            index: streamQuerySchema,
          }),
          z.object({
            delete: z.object({ id: z.string() }),
          }),
        ])
      ),
    }),
  }),
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

    const queryLinksDeleted = await assetClient.getAssetLinks(
      streamName,
      ['query'],
      operations.filter(isDeleteOperation).map((op) => op.delete.id)
    );

    const result = await assetClient.bulk(
      streamName,
      operations.map((operation) => {
        if (isIndexOperation(operation)) {
          return {
            index: {
              asset: {
                [ASSET_TYPE]: 'query',
                [ASSET_ID]: operation.index.id,
                query: {
                  id: operation.index.id,
                  title: operation.index.title,
                  kql: { query: operation.index.kql.query },
                },
              },
            },
          };
        }
        return {
          delete: {
            asset: {
              [ASSET_TYPE]: 'query',
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

    const queryLinksIndexed = await assetClient.getAssetLinks(
      streamName,
      ['query'],
      operations.filter(isIndexOperation).map((op) => op.index.id)
    );

    await streamsClient.manageQueries(streamName, {
      indexed: queryLinksIndexed,
      deleted: queryLinksDeleted,
    });

    return { acknowledged: true };
  },
});

export const queryRoutes = {
  ...listQueriesRoute,
  ...upsertQueryRoute,
  ...deleteQueryRoute,
  ...bulkQueriesRoute,
};
