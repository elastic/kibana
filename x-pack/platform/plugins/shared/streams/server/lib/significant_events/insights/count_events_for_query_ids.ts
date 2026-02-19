/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { QueryClient } from '../../streams/assets/query/query_client';
import { getRuleIdFromQueryLink } from '../../streams/assets/query/helpers/query';
import { parseError } from '../../streams/errors/parse_error';
import { SecurityError } from '../../streams/errors/security_error';

const ALERTS_INDEX = '.alerts-streams.alerts-default';

/**
 * Returns the total number of significant events (alerts) in the time range
 * for the given query IDs. Query IDs are resolved to rule UUIDs via the
 * query links for the given streams.
 */
export async function countEventsForQueryIds({
  queryClient,
  streamNames,
  queryIds,
  esClient,
  from,
  to,
  signal,
}: {
  queryClient: QueryClient;
  streamNames: string[];
  queryIds: string[];
  esClient: ElasticsearchClient;
  from: Date;
  to: Date;
  signal: AbortSignal;
}): Promise<number> {
  if (queryIds.length === 0) {
    return 0;
  }

  const response = await esClient.search(
    {
      index: ALERTS_INDEX,
      size: 0,
      query: {
        bool: {
          filter: [
            {
              range: {
                '@timestamp': {
                  gte: from.toISOString(),
                  lte: to.toISOString(),
                },
              },
            },
            { terms: { 'kibana.alert.rule.uuid': queryIds } },
          ],
        },
      },
    },
    { signal }
  );

  const total = response.hits.total;
  return typeof total === 'number' ? total : total?.value ?? 0;
}
