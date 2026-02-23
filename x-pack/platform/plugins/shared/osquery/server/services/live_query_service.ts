/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { every, map, mapKeys } from 'lodash';
import { lastValueFrom, zip } from 'rxjs';
import type { IScopedSearchClient } from '@kbn/data-plugin/server';
import type { Logger } from '@kbn/core/server';
import type {
  ActionDetailsRequestOptions,
  ActionDetailsStrategyResponse,
  ResultsRequestOptions,
  ResultsStrategyResponse,
} from '../../common/search_strategy';
import { Direction, OsqueryQueries } from '../../common/search_strategy';
import { generateTablePaginationOptions } from '../../common/utils/build_query';
import { getActionResponses } from '../routes/live_query/utils';

// ============================================================================
// Types
// ============================================================================

export interface LiveQueryStatusQuery {
  action_id: string;
  id?: string;
  query?: string;
  agents?: string[];
  pending: number;
  responded: number;
  successful: number;
  failed: number;
  docs: number;
  status: 'completed' | 'running';
}

export interface LiveQueryStatus {
  isCompleted: boolean;
  isExpired: boolean;
  status: 'completed' | 'running' | 'expired';
  queries: LiveQueryStatusQuery[];
  actionDetails: ActionDetailsStrategyResponse['actionDetails'];
}

export interface LiveQueryResults {
  data: ResultsStrategyResponse;
  totalCount: number;
}

export interface FetchLiveQueryDetailsOptions {
  actionId: string;
  spaceId: string;
  abortSignal?: AbortSignal;
  integrationNamespaces?: string[];
}

export interface FetchLiveQueryResultsOptions {
  actionId: string;
  spaceId?: string;
  pagination: { page: number; pageSize: number };
  sort?: { field: string; direction: 'asc' | 'desc' };
  kuery?: string;
  startDate?: string;
  abortSignal?: AbortSignal;
  integrationNamespaces?: string[];
  logger?: Logger;
}

export interface WaitForCompletionOptions {
  actionId: string;
  spaceId: string;
  pollIntervalMs?: number;
  maxWaitMs?: number;
  abortSignal?: AbortSignal;
  integrationNamespaces?: string[];
  logger?: Logger;
}

export interface WaitForResultsCountOptions {
  actionId: string;
  queryActionId: string;
  expectedCount: number;
  spaceId: string;
  pollIntervalMs?: number;
  maxWaitMs?: number;
  abortSignal?: AbortSignal;
  integrationNamespaces?: string[];
  logger?: Logger;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_POLL_INTERVAL_MS = 20000; // 20 seconds between polls
const DEFAULT_MAX_WAIT_MS = 5 * 60 * 1000; // 5 minutes maximum wait time

// ============================================================================
// Utility Functions
// ============================================================================

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

// ============================================================================
// Service Functions
// ============================================================================

/**
 * Fetches live query details including status and per-query aggregations.
 * Extracted from get_live_query_details_route.ts for reuse.
 */
export const fetchLiveQueryDetails = async (
  search: IScopedSearchClient,
  options: FetchLiveQueryDetailsOptions
): Promise<LiveQueryStatus> => {
  const { actionId, spaceId, abortSignal, integrationNamespaces } = options;

  // 1. Fetch action details
  const { actionDetails } = await lastValueFrom(
    search.search<ActionDetailsRequestOptions, ActionDetailsStrategyResponse>(
      {
        actionId,
        factoryQueryType: OsqueryQueries.actionDetails,
        spaceId,
      },
      { abortSignal, strategy: 'osquerySearchStrategy' }
    )
  );

  if (!actionDetails) {
    throw new Error('Action not found');
  }

  // 2. Calculate expiration
  const expirationDate = actionDetails.fields?.expiration?.[0];
  const isExpired = !expirationDate ? true : new Date(expirationDate) < new Date();

  // 3. Fetch action responses for each query
  const queries = actionDetails._source?.queries ?? [];
  const responseData = queries.length > 0
    ? await lastValueFrom(
      zip(
        ...map(queries, (query) =>
          getActionResponses(
            search,
            query.action_id,
            query.agents?.length ?? 0,
            integrationNamespaces
          )
        )
      )
    )
    : [];

  // 4. Calculate completion status
  const isCompleted = isExpired || (responseData.length > 0 && every(responseData, ['pending', 0]));
  const agentByActionIdStatusMap = mapKeys(responseData, 'action_id');

  // 5. Build query status array
  const queryStatuses: LiveQueryStatusQuery[] = queries.map((query) => {
    const agentStatus = agentByActionIdStatusMap[query.action_id] ?? {
      docs: 0,
      failed: 0,
      pending: query.agents?.length ?? 0,
      responded: 0,
      successful: 0,
    };

    return {
      action_id: query.action_id,
      id: query.id,
      query: query.query,
      agents: query.agents,
      pending: agentStatus.pending,
      responded: agentStatus.responded,
      successful: agentStatus.successful,
      failed: agentStatus.failed,
      docs: agentStatus.docs,
      status: (isCompleted || agentStatus.pending === 0) ? 'completed' : 'running',
    };
  });

  return {
    isCompleted,
    isExpired,
    status: isExpired ? 'expired' : isCompleted ? 'completed' : 'running',
    queries: queryStatuses,
    actionDetails,
  };
};

/**
 * Fetches live query results with pagination.
 * Extracted from get_live_query_results_route.ts for reuse.
 */
export const fetchLiveQueryResults = async (
  search: IScopedSearchClient,
  options: FetchLiveQueryResultsOptions
): Promise<LiveQueryResults> => {
  const {
    actionId,
    pagination,
    sort,
    kuery,
    startDate,
    abortSignal,
    integrationNamespaces,
    logger,
  } = options;

  logger?.error(
    `[fetchLiveQueryResults] Querying with actionId: ${actionId}, ` +
    `integrationNamespaces: ${JSON.stringify(integrationNamespaces)}, ` +
    `pagination: page=${pagination.page}, pageSize=${pagination.pageSize}`
  );

  const res = await lastValueFrom(
    search.search<ResultsRequestOptions, ResultsStrategyResponse>(
      {
        actionId,
        factoryQueryType: OsqueryQueries.results,
        kuery,
        startDate,
        pagination: generateTablePaginationOptions(pagination.page, pagination.pageSize),
        sort: sort
          ? [{ field: sort.field, direction: sort.direction as Direction }]
          : [{ field: '@timestamp', direction: Direction.desc }],
        integrationNamespaces,
      },
      { abortSignal, strategy: 'osquerySearchStrategy' }
    )
  );

  // totalCount comes from rawResponse.hits.total, not from res.totalCount
  const rawTotal = res.rawResponse?.hits?.total;
  const totalCount = typeof rawTotal === 'number' ? rawTotal : rawTotal?.value ?? 0;

  logger?.error(
    `[fetchLiveQueryResults] Query returned totalCount: ${totalCount}, edges: ${res.edges?.length ?? 0}, ` +
    `rawTotal: ${JSON.stringify(rawTotal)}`
  );

  return {
    data: res,
    totalCount,
  };
};

/**
 * Polls for live query completion until status is 'completed' or 'expired'.
 * Used by skill tools to ensure results are ready before fetching.
 */
export const waitForQueryCompletion = async (
  search: IScopedSearchClient,
  options: WaitForCompletionOptions
): Promise<LiveQueryStatus> => {
  const {
    actionId,
    spaceId,
    pollIntervalMs = DEFAULT_POLL_INTERVAL_MS,
    maxWaitMs = DEFAULT_MAX_WAIT_MS,
    abortSignal,
    integrationNamespaces,
    logger,
  } = options;

  logger?.error(
    `[waitForQueryCompletion] ENTRY - actionId: ${actionId}, spaceId: ${spaceId}, ` +
    `pollIntervalMs: ${pollIntervalMs}, maxWaitMs: ${maxWaitMs}`
  );

  const startTime = Date.now();
  let pollCount = 0;

  while (Date.now() - startTime < maxWaitMs) {
    pollCount++;

    logger?.error(`[waitForQueryCompletion] Poll ${pollCount} - Fetching query details...`);

    let status;
    try {
      status = await fetchLiveQueryDetails(search, {
        actionId,
        spaceId,
        abortSignal,
        integrationNamespaces,
      });
    } catch (error) {
      logger?.error(
        `[waitForQueryCompletion] Poll ${pollCount} FAILED - Error: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }

    const elapsedSeconds = Math.round((Date.now() - startTime) / 1000);
    const pendingCount = status.queries.reduce((sum, q) => sum + q.pending, 0);
    const respondedCount = status.queries.reduce((sum, q) => sum + q.responded, 0);
    const docsCount = status.queries.reduce((sum, q) => sum + q.docs, 0);

    logger?.error(
      `[waitForQueryCompletion] Poll ${pollCount}: status=${status.status}, isCompleted=${status.isCompleted}, ` +
      `isExpired=${status.isExpired}, responded=${respondedCount}, pending=${pendingCount}, docs=${docsCount}. ` +
      `Elapsed: ${elapsedSeconds}s`
    );

    if (status.isCompleted || status.isExpired) {
      logger?.error(
        `[waitForQueryCompletion] COMPLETED after ${pollCount} polls, ${elapsedSeconds}s. ` +
        `Status: ${status.status}, responded: ${respondedCount}, pending: ${pendingCount}, docs: ${docsCount}`
      );
      return status;
    }

    logger?.error(`[waitForQueryCompletion] Sleeping for ${pollIntervalMs}ms before next poll...`);
    await sleep(pollIntervalMs);
  }

  // Timeout - return current status
  logger?.error(
    `[waitForQueryCompletion] TIMEOUT after ${Math.round((Date.now() - startTime) / 1000)}s ` +
    `and ${pollCount} polls for action ${actionId}. Fetching final status...`
  );

  return fetchLiveQueryDetails(search, {
    actionId,
    spaceId,
    abortSignal,
    integrationNamespaces,
  });
};

/**
 * Polls for results count to match expected count after query completion.
 * Handles ES indexing delay between completion and results availability.
 */
export const waitForResultsCount = async (
  search: IScopedSearchClient,
  options: WaitForResultsCountOptions
): Promise<{ matched: boolean; totalCount: number }> => {
  const {
    queryActionId,
    expectedCount,
    pollIntervalMs = DEFAULT_POLL_INTERVAL_MS,
    maxWaitMs = DEFAULT_MAX_WAIT_MS,
    abortSignal,
    integrationNamespaces,
    logger,
  } = options;

  logger?.error(
    `[waitForResultsCount] ENTRY - queryActionId: ${queryActionId}, expectedCount: ${expectedCount}, ` +
    `pollIntervalMs: ${pollIntervalMs}, maxWaitMs: ${maxWaitMs}`
  );

  // If expected count is 0, return immediately
  if (expectedCount <= 0) {
    logger?.error(`[waitForResultsCount] Expected count is ${expectedCount}, returning immediately`);
    return { matched: true, totalCount: 0 };
  }

  const startTime = Date.now();
  let pollCount = 0;

  while (Date.now() - startTime < maxWaitMs) {
    pollCount++;

    logger?.error(`[waitForResultsCount] Poll ${pollCount} - Fetching results count...`);

    let results;
    try {
      results = await fetchLiveQueryResults(search, {
        actionId: queryActionId,
        pagination: { page: 0, pageSize: 1 }, // Just need count
        abortSignal,
        integrationNamespaces,
        logger,
      });
    } catch (error) {
      logger?.error(
        `[waitForResultsCount] Poll ${pollCount} FAILED - Error: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }

    const elapsedSeconds = Math.round((Date.now() - startTime) / 1000);
    logger?.error(
      `[waitForResultsCount] Poll ${pollCount}: ${results.totalCount}/${expectedCount} docs. Elapsed: ${elapsedSeconds}s`
    );

    if (results.totalCount >= expectedCount) {
      logger?.error(
        `[waitForResultsCount] MATCHED after ${pollCount} polls, ${elapsedSeconds}s. ` +
        `Got ${results.totalCount}/${expectedCount} docs`
      );
      return { matched: true, totalCount: results.totalCount };
    }

    logger?.error(`[waitForResultsCount] Sleeping for ${pollIntervalMs}ms before next poll...`);
    await sleep(pollIntervalMs);
  }

  // Timeout - return current count
  logger?.error(`[waitForResultsCount] Timeout reached, fetching final count...`);
  const finalResults = await fetchLiveQueryResults(search, {
    actionId: queryActionId,
    pagination: { page: 0, pageSize: 1 },
    abortSignal,
    integrationNamespaces,
    logger,
  });

  logger?.error(
    `[waitForResultsCount] TIMEOUT after ${Math.round((Date.now() - startTime) / 1000)}s ` +
    `and ${pollCount} polls. Got ${finalResults.totalCount}/${expectedCount} docs`
  );

  return { matched: false, totalCount: finalResults.totalCount };
};
