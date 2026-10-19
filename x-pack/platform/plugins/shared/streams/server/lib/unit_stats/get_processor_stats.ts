/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamsUnit } from '@kbn/streams-schema';
import { buildProcessorStatsRequest } from './build_processor_stats_request';
import {
  mapProcessorStatsResponse,
  noProcessorStats,
  type ProcessorStatsAggregations,
} from './map_processor_stats_response';
import { errorForSearchFailure, isMissingStreamError } from './search_errors';
import type { UnitStatsQueryContext } from './types';

/**
 * One search for all the processor ids. An id with no bucket, or a missing stream, is no
 * data. A failed search puts the same error on every id, so the other kind is unaffected.
 */
export const getProcessorStats = async ({
  context,
  ids,
  seconds,
}: {
  context: UnitStatsQueryContext;
  ids: string[];
  seconds: number;
}): Promise<Record<string, StreamsUnit.StatsProcessorResult>> => {
  const { esClient, logger, unitId, window, configHash } = context;
  const results: Record<string, StreamsUnit.StatsProcessorResult> = {};

  try {
    const response = await esClient.search<unknown, ProcessorStatsAggregations>(
      buildProcessorStatsRequest({ unitId, window, ids, configHash })
    );
    const mapped = mapProcessorStatsResponse({ aggregations: response.aggregations, seconds });
    for (const id of ids) {
      results[id] = mapped.get(id) ?? noProcessorStats();
    }
  } catch (error) {
    const failure = isMissingStreamError(error)
      ? undefined
      : errorForSearchFailure(error, 'processor stats');
    if (failure) {
      logger.debug(`Processor stats failed for unit [${unitId}]: ${(error as Error).message}`);
    }
    for (const id of ids) {
      results[id] = { ...noProcessorStats(), ...(failure ? { error: failure } : {}) };
    }
  }

  return results;
};
