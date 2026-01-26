/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ErrorCause } from '@elastic/elasticsearch/lib/api/types';
import type { StreamQuery } from '@kbn/streams-schema';
import { streamQuerySchema, upsertStreamQueryRequestSchema } from '@kbn/streams-schema';
import { z } from '@kbn/zod';
import { STREAMS_API_PRIVILEGES } from '../../../common/constants';
import { QueryNotFoundError } from '../../lib/streams/errors/query_not_found_error';
import { createServerRoute } from '../create_server_route';
import { assertEnterpriseLicense } from '../utils/assert_enterprise_license';
import { assertFeatureNotChanged } from '../utils/assert_feature_not_changed';

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
    const { queryClient, streamsClient, licensing } = await getScopedClients({ request });
    await assertEnterpriseLicense(licensing);
    await streamsClient.ensureStream(params.path.name);

    const {
      path: { name: streamName },
    } = params;

    const { [streamName]: queryLinks } = await queryClient.getStreamToQueryLinksMap([streamName]);

    return {
      queries: queryLinks.map((queryLink) => queryLink.query),
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
    const { streamsClient, queryClient, licensing } = await getScopedClients({ request });
    const {
      path: { name: streamName, queryId },
      body,
    } = params;
    await assertEnterpriseLicense(licensing);

    await streamsClient.ensureStream(streamName);
    await assertFeatureNotChanged({
      queryClient,
      streamName,
      queries: [{ id: queryId, feature: body.feature }],
    });
    await queryClient.upsert(streamName, {
      id: queryId,
      title: body.title,
      feature: body.feature,
      kql: {
        query: body.kql.query,
      },
      severity_score: body.severity_score,
      evidence: body.evidence,
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
  handler: async ({ params, request, getScopedClients, logger }): Promise<DeleteQueryResponse> => {
    const { streamsClient, queryClient, licensing } = await getScopedClients({
      request,
    });
    await assertEnterpriseLicense(licensing);

    const {
      path: { queryId, name: streamName },
    } = params;

    await streamsClient.ensureStream(streamName);

    const queryLink = await queryClient.bulkGetByIds(streamName, [queryId]);
    if (queryLink.length === 0) {
      throw new QueryNotFoundError(`Query [${queryId}] not found in stream [${streamName}]`);
    }

    await queryClient.delete(streamName, queryId);

    logger.get('significant_events').debug(`Deleting query ${queryId} for stream ${streamName}`);

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
    const { streamsClient, queryClient, licensing } = await getScopedClients({ request });
    await assertEnterpriseLicense(licensing);

    const {
      path: { name: streamName },
      body: { operations },
    } = params;

    await streamsClient.ensureStream(streamName);

    const indexOperations = operations.flatMap((op) =>
      'index' in op ? [{ id: op.index.id, feature: op.index.feature }] : []
    );
    await assertFeatureNotChanged({ queryClient, streamName, queries: indexOperations });

    await queryClient.bulk(streamName, operations);

    logger
      .get('significant_events')
      .debug(
        `Performing bulk significant events operation with ${operations.length} operations for stream ${streamName}`
      );

    return { acknowledged: true };
  },
});

export const queryRoutes = {
  ...listQueriesRoute,
  ...upsertQueryRoute,
  ...deleteQueryRoute,
  ...bulkQueriesRoute,
};
