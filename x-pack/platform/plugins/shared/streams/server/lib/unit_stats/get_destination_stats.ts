/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamsUnit } from '@kbn/streams-schema';
import { buildDestinationStatsRequest } from './build_destination_stats_request';
import {
  mapDestinationStatsResponse,
  noDestinationStats,
  type DestinationStatsAggregations,
} from './map_destination_stats_response';
import { isMissingStreamError, toSearchError } from './search_errors';
import type { UnitStatsQueryContext } from './types';

/**
 * One search for all the destination ids. An id with no bucket, or a missing stream, is no
 * data. A failed search puts the same error on every id, so the other kind is unaffected.
 */
export const getDestinationStats = async ({
  context,
  ids,
  seconds,
  bucketMs,
}: {
  context: UnitStatsQueryContext;
  ids: string[];
  seconds: number;
  bucketMs: number;
}): Promise<Record<string, StreamsUnit.StatsDestinationResult>> => {
  const { esClient, logger, unitId, window, configHash } = context;
  const results: Record<string, StreamsUnit.StatsDestinationResult> = {};

  try {
    const response = await esClient.search<unknown, DestinationStatsAggregations>(
      buildDestinationStatsRequest({ unitId, window, ids, configHash, bucketMs })
    );
    const mapped = mapDestinationStatsResponse({
      aggregations: response.aggregations,
      seconds,
      bucketMs,
    });
    for (const id of ids) {
      results[id] = mapped.get(id) ?? noDestinationStats(bucketMs);
    }
  } catch (error) {
    const failure = isMissingStreamError(error)
      ? undefined
      : toSearchError(error, 'destination stats').toStatsError();
    if (failure) {
      logger.debug(`Destination stats failed for unit [${unitId}]: ${(error as Error).message}`);
    }
    for (const id of ids) {
      results[id] = { ...noDestinationStats(bucketMs), ...(failure ? { error: failure } : {}) };
    }
  }

  return results;
};
