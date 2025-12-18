/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { IScopedSearchClient } from '@kbn/data-plugin/server';
import { ESQL_ASYNC_SEARCH_STRATEGY } from '@kbn/data-plugin/common';
import type { ESQLSearchParams, ESQLSearchResponse } from '@kbn/es-types';
import type { ESQLParams } from '@kbn/response-ops-rule-params/esql';
import { wrapAsyncSearchClient } from '../lib/wrap_async_search_client';
import { parseDuration } from '../lib';

export async function executeEsqlRule({
  logger,
  searchClient,
  abortController,
  rule,
  params,
}: {
  logger: Logger;
  searchClient: IScopedSearchClient;
  abortController: AbortController;
  rule: { id: string; alertTypeId: string; spaceId: string; name?: string };
  params: ESQLParams;
}): Promise<ESQLSearchResponse> {
  const windowMs = parseDuration(`${params.timeWindowSize}${params.timeWindowUnit}`);
  const dateEnd = new Date().toISOString();
  const dateStart = new Date(Date.now() - windowMs).toISOString();

  const asyncSearchClient = wrapAsyncSearchClient<ESQLSearchParams>({
    strategy: ESQL_ASYNC_SEARCH_STRATEGY,
    client: searchClient,
    abortController,
    logger,
    rule: {
      name: rule.name ?? '',
      id: rule.id,
      alertTypeId: rule.alertTypeId,
      spaceId: rule.spaceId,
    },
  });

  return await asyncSearchClient.search({
    request: {
      params: {
        query: params.esqlQuery.esql,
        // Keep the async search around briefly; we may add paging/cursoring later.
        keep_alive: '10m',
        wait_for_completion_timeout: '10m',
        filter: {
          bool: {
            filter: [
              {
                range: {
                  [params.timeField]: {
                    lte: dateEnd,
                    gt: dateStart,
                    format: 'strict_date_optional_time',
                  },
                },
              },
            ],
          },
        },
      } as unknown as ESQLSearchParams,
    } as unknown as { params: ESQLSearchParams },
    options: {},
  });
}
