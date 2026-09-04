/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import type { DashboardAttachmentData } from '@kbn/agent-builder-dashboards-common';
import { selectDefaultTimeRange } from '@kbn/agent-builder-visualizations-server';
import { extractEsqlQueries } from './extract_esql_queries';

export interface ApplyDefaultTimeRangeParams {
  dashboardData: DashboardAttachmentData;
  esClient: IScopedClusterClient;
  logger: Logger;
  /** Current time in epoch ms, used to decide relative vs historical ranges */
  nowMs?: number;
}

/**
 * Give a freshly generated dashboard a data-aware default time range so its
 * panels render with data instead of falling back to the UI default.
 *
 * An explicit range already on the dashboard wins. Otherwise the wrapper
 * extracts Lens ES|QL queries and asks {@link selectDefaultTimeRange} for a
 * range. Fail-soft: the callee never throws, so missing data leaves the
 * dashboard unchanged.
 */
export const applyDefaultDashboardTimeRange = async ({
  dashboardData,
  esClient,
  logger,
  nowMs,
}: ApplyDefaultTimeRangeParams): Promise<DashboardAttachmentData> => {
  if (dashboardData.time_range) {
    return dashboardData;
  }

  const timeRange = await selectDefaultTimeRange({
    esqlQueries: extractEsqlQueries(dashboardData.panels),
    esClient,
    logger,
    projectRouting: dashboardData.project_routing,
    nowMs,
  });
  if (!timeRange) {
    return dashboardData;
  }
  return { ...dashboardData, time_range: timeRange };
};
