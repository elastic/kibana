/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { errors } from '@elastic/elasticsearch';
import type {
  AggregationsTermsAggregateBase,
  AggregationsTopHitsAggregate,
} from '@elastic/elasticsearch/lib/api/types';
import type { Dictionary } from 'lodash';
import { groupBy, mapValues } from 'lodash';
import { from, map, type Observable } from 'rxjs';
import type { ServerSentEventBase } from '@kbn/sse-utils';
import { getRuleIdFromQueryLink } from '../../../../lib/streams/assets/query/helpers/query';
import type { StoredAssetLink } from '../../../../lib/streams/assets/asset_client';
import { STREAMS_API_PRIVILEGES } from '../../../../../common/constants';
import { createServerRoute } from '../../../create_server_route';
import { assertSignificantEventsAccess } from '../../../utils/assert_significant_events_access';
import { SecurityError } from '../../../../lib/streams/errors/security_error';
import { getRequestAbortSignal } from '../../../utils/get_request_abort_signal';
import { generateSignificantEventsSummary } from './generate_summary/generate_significant_events_summary';

interface ByRuleBucket {
  key: string;
  doc_count: number;
  top_hits: AggregationsTopHitsAggregate;
}

const listQueriesRoute = createServerRoute({
  endpoint: 'GET /internal/streams/_significant_events/_queries',
  options: {
    access: 'internal',
    summary: 'Lists all Significant event queries across all streams',
    description: 'Lists all Significant event queries across all streams',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  handler: async ({ request, getScopedClients, server }) => {
    const { licensing, uiSettingsClient, streamsClient, assetClient } = await getScopedClients({
      request,
    });

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const streams = await streamsClient.listStreams();

    const queries = await assetClient.getAssetLinks(
      streams.map((stream) => stream.name),
      ['query']
    );

    return {
      queries: Object.values(queries)
        .flat()
        .map((query) => ({
          stream: (query as unknown as StoredAssetLink)['stream.name'],
          query: query.query,
        })),
    };
  },
});

const listOccurrencesRoute = createServerRoute({
  endpoint: 'GET /internal/streams/_significant_events/_occurrences',
  options: {
    access: 'internal',
    summary: 'Lists all Significant event occurrences across all streams',
    description: 'Lists all Significant event occurrences across all streams',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  handler: async ({ request, getScopedClients, server }) => {
    const { licensing, uiSettingsClient, streamsClient, assetClient, scopedClusterClient } =
      await getScopedClients({
        request,
      });

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const streams = await streamsClient.listStreams();
    const queries = await assetClient.getAssetLinks(
      streams.map((stream) => stream.name),
      ['query']
    );
    const ruleIds = Object.values(queries).flat().map(getRuleIdFromQueryLink);

    const response = await scopedClusterClient.asCurrentUser
      .search<
        unknown,
        {
          by_rule: AggregationsTermsAggregateBase<ByRuleBucket>;
        }
      >({
        index: '.alerts-streams.alerts-default',
        size: 0,
        query: {
          bool: {
            filter: [
              {
                range: {
                  '@timestamp': {
                    gte: 'now-15m',
                    lte: 'now',
                  },
                },
              },
              {
                terms: {
                  'kibana.alert.rule.uuid': ruleIds,
                },
              },
            ],
          },
        },
        aggs: {
          by_rule: {
            terms: {
              field: 'kibana.alert.rule.uuid',
              size: 10_000,
            },
            aggs: {
              top_hits: {
                top_hits: {
                  size: 1,
                },
              },
            },
          },
        },
      })
      .catch((err) => {
        const isResponseError = err instanceof errors.ResponseError;
        if (isResponseError && err?.body?.error?.type === 'security_exception') {
          throw new SecurityError(
            `Cannot read Significant events, insufficient privileges: ${err.message}`,
            { cause: err }
          );
        }
        throw err;
      });

    if (response.aggregations === undefined) {
      return {
        total_streams: 0,
        total_queries: 0,
        total_occurrences: 0,
        by_stream: {},
      };
    }

    const byStream = mapValues<
      Dictionary<ByRuleBucket[]>,
      { queries: number; occurrences: number }
    >(
      groupBy<ByRuleBucket>(
        response.aggregations.by_rule.buckets as ByRuleBucket[],
        (bucket) => bucket.top_hits.hits.hits[0]?._source?.original_source.stream.name
      ),
      (buckets) => {
        return {
          queries: buckets.length,
          occurrences: buckets.reduce((sum, bucket) => sum + bucket.doc_count, 0),
        };
      }
    );

    const numberOfStreams = Object.keys(byStream).length;
    const totalQueries = Object.values(byStream).reduce((sum, v) => sum + v.queries, 0);
    const totalOccurrences = Object.values(byStream).reduce((sum, v) => sum + v.occurrences, 0);

    return {
      total_streams: numberOfStreams,
      total_queries: totalQueries,
      total_occurrences: totalOccurrences,
      by_stream: byStream,
    };
  },
});

type SignificantEventsSummaryEvent = ServerSentEventBase<
  'significant_events_summary',
  { summary: string; tokenUsage: { prompt: number; completion: number } }
>;

const generateSummaryRoute = createServerRoute({
  endpoint: 'POST /internal/streams/_significant_events/_generate_summary',
  options: {
    access: 'internal',
    summary: 'Generate a summary of detected significant events',
    description: 'Generate a summary of detected significant events',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  params: z.object({
    query: z.object({
      connectorId: z.string(),
    }),
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
    logger,
  }): Promise<Observable<SignificantEventsSummaryEvent>> => {
    const {
      licensing,
      uiSettingsClient,
      inferenceClient,
      streamsClient,
      assetClient,
      scopedClusterClient,
    } = await getScopedClients({
      request,
    });

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    return from(
      generateSignificantEventsSummary({
        streamsClient,
        assetClient,
        esClient: scopedClusterClient.asCurrentUser,
        inferenceClient: inferenceClient.bindTo({ connectorId: params.query.connectorId }),
        signal: getRequestAbortSignal(request),
        logger,
      })
    ).pipe(
      map((result) => {
        return {
          type: 'significant_events_summary',
          ...result,
        };
      })
    );
  },
});

export const internalSignificantEventsRoutes = {
  ...listQueriesRoute,
  ...listOccurrencesRoute,
  ...generateSummaryRoute,
};
