/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import { LOG_PREFIX, probeDatasetTimeRanges } from './dataset_probe';
import { selectTimeRange, type SelectedTimeRange } from './select_time_range';

export type { SelectedTimeRange };

export interface SelectDefaultTimeRangeParams {
  esqlQueries: string[];
  esClient: IScopedClusterClient;
  logger: Logger;
  projectRouting?: string;
  nowMs?: number;
}

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/**
 * Probe the datasets behind the given ES|QL queries and pick a data-aware
 * default time range. Never throws: empty queries, no data, or a probe failure
 * return `undefined` so the caller leaves the surface unset.
 */
export const selectDefaultTimeRange = async ({
  esqlQueries,
  esClient,
  logger,
  projectRouting,
  nowMs = Date.now(),
}: SelectDefaultTimeRangeParams): Promise<SelectedTimeRange | undefined> => {
  if (esqlQueries.length === 0) {
    return undefined;
  }

  try {
    const datasetTimeRanges = await probeDatasetTimeRanges({
      esClient,
      queries: esqlQueries,
      logger,
      projectRouting,
    });

    for (const { index, timeField, minMs, maxMs } of datasetTimeRanges) {
      logger.debug(
        `${LOG_PREFIX} probed ${index} (${timeField}): ${new Date(
          minMs
        ).toISOString()} to ${new Date(maxMs).toISOString()}`
      );
    }

    const timeRange = selectTimeRange(datasetTimeRanges, nowMs);
    if (!timeRange) {
      logger.debug(`${LOG_PREFIX} no data found for any dataset; leaving time range unset`);
      return undefined;
    }

    logger.info(
      `${LOG_PREFIX} set ${JSON.stringify(timeRange)} from ${datasetTimeRanges.length} dataset(s)`
    );
    return timeRange;
  } catch (error) {
    logger.warn(`${LOG_PREFIX} probe failed; leaving time range unset: ${getErrorMessage(error)}`);
    return undefined;
  }
};
