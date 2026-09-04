/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import {
  ACTION_RESPONSES_DATA_STREAM_INDEX,
  OSQUERY_INTEGRATION_NAME,
} from '../../common/constants';
import { buildSpaceIdFilter } from '../utils/build_space_id_filter';

/**
 * Osquery query rows land in the results data stream; the action-responses data
 * stream only carries per-agent completion metadata (`action_id`, `agent_id`,
 * row counts, errors). Reading rows from the responses index returns response
 * envelopes, never SQL output, so the two indices are queried separately:
 * responses answer "how many agents have reported", results answer "what did
 * they return".
 */
const RESULTS_INDEX_PATTERN = `logs-${OSQUERY_INTEGRATION_NAME}.result*`;
const ACTION_RESPONSES_INDEX_PATTERN = `${ACTION_RESPONSES_DATA_STREAM_INDEX}*`;

export type LiveQueryPollStatus = 'completed' | 'partial' | 'pending' | 'error';

export interface PollActionResponsesOptions {
  budgetMs: number;
  /**
   * Space the caller is scoped to. Every read is filtered by it — an action id
   * on its own is not an authorization boundary.
   */
  spaceId: string;
  /**
   * Number of agents the action was dispatched to. `completed` requires all of
   * them to have responded; anything less is `partial`.
   */
  expectedAgentCount?: number;
  intervalMs?: number;
  maxRows?: number;
  logger?: Logger;
}

export interface PollActionResponsesResult {
  responded: number;
  expected?: number;
  rows: Array<Record<string, unknown>>;
  status: LiveQueryPollStatus;
  /** Last search error, when `status` is `error`. */
  error?: string;
  /** Distinct agents whose response carried an error, when known. */
  errorAgents?: number;
  /** True when matching result rows exceeded what was returned. */
  truncated?: boolean;
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const extractRowFromHit = (source: Record<string, unknown>): Record<string, unknown> => {
  const nested =
    (source.osquery as Record<string, unknown> | undefined) ??
    (source['osquery.result'] as Record<string, unknown> | undefined);

  return nested ?? source;
};

/**
 * Polls a *query* action id (`osqueryAction.queries[].action_id`) until every
 * expected agent has responded or the budget expires.
 *
 * The parent action id (`osqueryAction.action_id`) never appears on result or
 * response documents, so passing it here yields a permanently pending poll.
 */
export const pollActionResponses = async (
  esClient: ElasticsearchClient,
  actionId: string,
  {
    budgetMs,
    spaceId,
    expectedAgentCount,
    intervalMs = 1_500,
    maxRows = 100,
    logger,
  }: PollActionResponsesOptions
): Promise<PollActionResponsesResult> => {
  const deadline = Date.now() + budgetMs;
  const spaceFilter = buildSpaceIdFilter(spaceId);
  let responded = 0;
  let rows: Array<Record<string, unknown>> = [];
  let searchSucceeded = false;
  let lastError: string | undefined;
  let errorAgents: number | undefined;
  let totalRows: number | undefined;

  const allAgentsResponded = () =>
    expectedAgentCount !== undefined && expectedAgentCount > 0 && responded >= expectedAgentCount;

  while (Date.now() < deadline) {
    await sleep(intervalMs);
    try {
      const responsesResult = await esClient.search({
        index: ACTION_RESPONSES_INDEX_PATTERN,
        size: 0,
        ignore_unavailable: true,
        track_total_hits: true,
        // The transform keys docs by (@timestamp, action_id, agent_id), so a
        // retried flush double-counts one agent. Count distinct agents, and
        // how many of those responses carry an error (the same classification
        // query.action_results.dsl.ts applies: error.keyword empty = success).
        aggs: {
          distinct_agents: {
            cardinality: { field: 'agent_id' },
          },
          error_agents: {
            filter: { exists: { field: 'error' } },
            aggs: {
              distinct: {
                cardinality: { field: 'agent_id' },
              },
            },
          },
        },
        query: {
          bool: {
            filter: [{ term: { action_id: actionId } }, spaceFilter],
          },
        },
      });

      responded =
        (responsesResult.aggregations?.distinct_agents as { value: number } | undefined)?.value ??
        0;
      errorAgents = (
        responsesResult.aggregations?.error_agents as { distinct?: { value?: number } } | undefined
      )?.distinct?.value;

      const resultsResult = await esClient.search({
        index: RESULTS_INDEX_PATTERN,
        size: maxRows,
        ignore_unavailable: true,
        track_total_hits: true,
        query: {
          bool: {
            filter: [{ term: { action_id: actionId } }, spaceFilter],
          },
        },
      });

      const hits = resultsResult.hits.hits;
      if (hits.length > 0) {
        rows = hits.map((hit) => extractRowFromHit((hit._source ?? {}) as Record<string, unknown>));
      }

      totalRows =
        typeof resultsResult.hits.total === 'number'
          ? resultsResult.hits.total
          : resultsResult.hits.total?.value;

      searchSucceeded = true;

      // Only stop early once every dispatched agent has reported. Stopping at
      // the first response reports a multi-agent query as complete while other
      // agents are still running.
      if (allAgentsResponded()) {
        break;
      }

      if (expectedAgentCount === undefined && rows.length > 0) {
        break;
      }
    } catch (pollErr) {
      lastError = pollErr instanceof Error ? pollErr.message : String(pollErr);
      logger?.debug(`Live-query poll error (will retry): ${pollErr}`);
    }
  }

  // No search ever succeeded: the rows are unreadable, not merely absent.
  if (!searchSucceeded) {
    return {
      responded,
      ...(expectedAgentCount !== undefined && { expected: expectedAgentCount }),
      rows,
      status: 'error' as const,
      ...(lastError !== undefined && { error: lastError }),
    };
  }

  // Every EXPECTED agent responded and every one of them errored: osquery ran
  // but returned no readable rows. Agents still pending at budget expiry are
  // not failures — reporting `error` there would mask a retryable partial.
  if (
    errorAgents !== undefined &&
    errorAgents > 0 &&
    errorAgents === responded &&
    (expectedAgentCount === undefined || responded >= expectedAgentCount)
  ) {
    return {
      responded,
      ...(expectedAgentCount !== undefined && { expected: expectedAgentCount }),
      rows,
      status: 'error' as const,
      error: `All ${errorAgents} responding agent(s) reported an execution error.`,
      errorAgents,
    };
  }

  const status: LiveQueryPollStatus = allAgentsResponded()
    ? 'completed'
    : responded > 0 || rows.length > 0
    ? 'partial'
    : 'pending';

  return {
    responded,
    ...(expectedAgentCount !== undefined && { expected: expectedAgentCount }),
    rows: rows.slice(0, maxRows),
    status,
    ...(totalRows !== undefined && totalRows > rows.length && { truncated: true }),
    ...(errorAgents !== undefined && errorAgents > 0 && { errorAgents }),
  };
};
