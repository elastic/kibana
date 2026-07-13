/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import { ACTION_RESPONSES_DATA_STREAM_INDEX } from '../../common/constants';

export type LiveQueryPollStatus = 'completed' | 'partial' | 'pending';

export interface PollActionResponsesOptions {
  budgetMs: number;
  intervalMs?: number;
  maxRows?: number;
  logger?: Logger;
}

export interface PollActionResponsesResult {
  responded: number;
  rows: Array<Record<string, unknown>>;
  status: LiveQueryPollStatus;
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const extractRowFromHit = (source: Record<string, unknown>): Record<string, unknown> => {
  const nested =
    (source.osquery as Record<string, unknown> | undefined) ??
    (source['osquery.result'] as Record<string, unknown> | undefined);

  return nested ?? source;
};

export const pollActionResponses = async (
  esClient: ElasticsearchClient,
  actionId: string,
  { budgetMs, intervalMs = 1_500, maxRows = 100, logger }: PollActionResponsesOptions
): Promise<PollActionResponsesResult> => {
  const deadline = Date.now() + budgetMs;
  let responded = 0;
  let rows: Array<Record<string, unknown>> = [];

  while (Date.now() < deadline) {
    await sleep(intervalMs);
    try {
      const searchResult = await esClient.search({
        index: `${ACTION_RESPONSES_DATA_STREAM_INDEX}*`,
        size: maxRows,
        ignore_unavailable: true,
        query: {
          bool: {
            filter: [{ term: { action_id: actionId } }],
          },
        },
      });
      const hits = searchResult.hits.hits;
      responded = hits.length;
      if (responded > 0) {
        rows = hits.map((hit) => extractRowFromHit((hit._source ?? {}) as Record<string, unknown>));
        break;
      }
    } catch (pollErr) {
      logger?.debug(`Live-query poll error (will retry): ${pollErr}`);
    }
  }

  const status: LiveQueryPollStatus =
    rows.length > 0 ? 'completed' : responded > 0 ? 'partial' : 'pending';

  return {
    responded,
    rows: rows.slice(0, maxRows),
    status,
  };
};
