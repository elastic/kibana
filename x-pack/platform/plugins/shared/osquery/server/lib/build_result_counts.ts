/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SingleQueryResultCounts,
  PackResultCounts,
} from '../../common/api/live_query/result_counts';
import type { ResultCountsMap } from './get_result_counts_for_actions';

export const buildPackResultCounts = (
  queryActionIds: string[],
  resultCountsMap: ResultCountsMap
): PackResultCounts => {
  let totalRows = 0;
  let queriesWithResults = 0;
  let successfulAgents = 0;
  let errorAgents = 0;
  let maxRespondedAgents = 0;

  // Agent success/error counts are taken from the sub-query with the most
  // responded agents (not summed), since all pack queries target the same
  // agent set and per-agent status is identical across queries.
  for (const actionId of queryActionIds) {
    const counts = resultCountsMap.get(actionId);
    if (counts) {
      totalRows += counts.totalRows;
      if (counts.totalRows > 0) {
        queriesWithResults++;
      }

      if (counts.respondedAgents > maxRespondedAgents) {
        maxRespondedAgents = counts.respondedAgents;
        successfulAgents = counts.successfulAgents;
        errorAgents = counts.errorAgents;
      }
    }
  }

  return {
    total_rows: totalRows,
    queries_with_results: queriesWithResults,
    queries_total: queryActionIds.length,
    successful_agents: successfulAgents,
    error_agents: errorAgents,
  };
};

export const buildSingleQueryResultCounts = (
  queryActionId: string | undefined,
  resultCountsMap: ResultCountsMap
): SingleQueryResultCounts => {
  const counts = queryActionId ? resultCountsMap.get(queryActionId) : undefined;

  return {
    total_rows: counts?.totalRows ?? 0,
    responded_agents: counts?.respondedAgents ?? 0,
    successful_agents: counts?.successfulAgents ?? 0,
    error_agents: counts?.errorAgents ?? 0,
  };
};
