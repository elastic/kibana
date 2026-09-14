/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import { CRITICAL_SEVERITY_THRESHOLD } from '@kbn/significant-events-schema';
import {
  CRITICAL_ANALYSIS_BUCKET_INTERVAL,
  CRITICAL_ANALYSIS_LOOKBACK_MINUTES,
} from '../../../server/lib/significant_events/rules/schedule';
import type { ConnectionConfig } from '../lib/get_connection_config';
import { kibanaRequest } from '../lib/kibana';
import type { SeededQuery } from '../types';
import type { SeededAlertSeries } from './seed_alerts';

interface ChangePointBucket {
  key: string;
  change_points?: { type?: Record<string, unknown> };
}

export async function verifyChangePoint(
  seededQueries: SeededQuery[],
  seededSeries: SeededAlertSeries[],
  config: ConnectionConfig,
  space: string,
  log: ToolingLog
): Promise<void> {
  const criticalQueries = seededQueries.filter(
    ({ severityScore }) => (severityScore ?? 0) >= CRITICAL_SEVERITY_THRESHOLD
  );
  if (criticalQueries.length === 0) {
    log.info('verifyChangePoint: no critical queries in this scenario, skipping');
    return;
  }

  const response = await kibanaRequest(
    config,
    'POST',
    '/internal/significant_events/detections/workflow/_change_point_scan',
    {
      lookback: `now-${CRITICAL_ANALYSIS_LOOKBACK_MINUTES}m`,
      bucketInterval: CRITICAL_ANALYSIS_BUCKET_INTERVAL,
    },
    space
  );
  if (response.status >= 300) {
    throw new Error(
      `verifyChangePoint: scan failed (HTTP ${response.status}): ${JSON.stringify(response.data)}`
    );
  }

  const buckets =
    (response.data as { aggregations?: { by_rule?: { buckets?: ChangePointBucket[] } } })
      .aggregations?.by_rule?.buckets ?? [];

  for (const query of criticalQueries) {
    const bucket = buckets.find(({ key }) => key === query.ruleId);
    const verdictTypes = Object.keys(bucket?.change_points?.type ?? {});
    if (verdictTypes.length > 0 && !verdictTypes.includes('stationary')) {
      log.info(`verifyChangePoint: "${query.title}" detected ${verdictTypes.join(', ')}`);
      continue;
    }

    const series = seededSeries.find(({ ruleId }) => ruleId === query.ruleId);
    const diagnostic = series
      ? {
          ruleId: query.ruleId,
          bucketCount: series.points.length,
          from: new Date(series.points[0]?.bucket ?? 0).toISOString(),
          to: new Date(series.points.at(-1)?.bucket ?? 0).toISOString(),
          values: series.points.map(({ metricValue }) => metricValue),
          verdictTypes,
        }
      : { ruleId: query.ruleId, bucketCount: 0, verdictTypes };
    throw new Error(
      `verifyChangePoint: "${
        query.title
      }" did not produce a significant change point: ${JSON.stringify(diagnostic)}`
    );
  }
}
