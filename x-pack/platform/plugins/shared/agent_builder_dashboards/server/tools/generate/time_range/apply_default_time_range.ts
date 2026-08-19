/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import type { DashboardAttachmentData } from '@kbn/agent-builder-dashboards-common';
import { getErrorMessage } from '../core';
import { extractEsqlQueries, probeDatasetTimeRanges, LOG_PREFIX } from './dataset_probe';
import { selectTimeRange } from './select_time_range';

export interface ApplyDefaultTimeRangeParams {
  dashboardData: DashboardAttachmentData;
  esClient: IScopedClusterClient;
  logger: Logger;
  /** Current time in epoch ms, used to decide relative vs historical ranges */
  nowMs?: number;
}

/**
 * Give a freshly generated dashboard a data-aware default time range so its
 * panels render with data instead of falling back to `now-24h`
 *
 * Runs one `min`/`max` probe per dataset and **fails soft**: it never blocks
 * dashboard creation. It is skipped entirely when an explicit range was already
 * set (the user named a window) or when no panel is time-bound.
 */
export const applyDefaultDashboardTimeRange = async ({
  dashboardData,
  esClient,
  logger,
  nowMs = Date.now(),
}: ApplyDefaultTimeRangeParams): Promise<DashboardAttachmentData> => {
  // An explicit range — e.g. the user named a window via set_metadata — wins.
  if (dashboardData.time_range) {
    return dashboardData;
  }

  const queries = extractEsqlQueries(dashboardData.panels);
  if (queries.length === 0) {
    return dashboardData;
  }

  try {
    const datasetTimeRanges = await probeDatasetTimeRanges({
      esClient,
      queries,
      logger,
      projectRouting: dashboardData.project_routing,
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
      logger.debug(`${LOG_PREFIX} no data found for any dataset; keeping the default time range`);
      return dashboardData;
    }

    logger.info(
      `${LOG_PREFIX} set ${JSON.stringify(timeRange)} from ${datasetTimeRanges.length} dataset(s)`
    );
    return { ...dashboardData, time_range: timeRange };
  } catch (error) {
    logger.warn(
      `${LOG_PREFIX} probe failed; keeping the default time range: ${getErrorMessage(error)}`
    );
    return dashboardData;
  }
};
