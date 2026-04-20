/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsqlQueryResponse } from '@elastic/elasticsearch/lib/api/types';
import type { AlertSummaryBucket, AlertSummaryResponse } from '@kbn/alerting-v2-schemas';

/** Column names emitted by buildAlertSummaryQuery. */
const BUCKET_COL = 'bucket';
const ACTIVE_COL = 'active_events';
const RECOVERED_COL = 'recovered_events';

interface ColumnIndexes {
  bucket: number;
  active: number;
  recovered: number;
}

function indexColumns(response: EsqlQueryResponse): ColumnIndexes {
  const get = (name: string) => response.columns.findIndex((c) => c.name === name);
  return {
    bucket: get(BUCKET_COL),
    active: get(ACTIVE_COL),
    recovered: get(RECOVERED_COL),
  };
}

function bucketKeyFromValue(value: unknown): { key: number; key_as_string: string } | undefined {
  if (value == null) {
    return undefined;
  }
  // ES|QL returns datetime columns as ISO strings.
  if (typeof value === 'string') {
    const key = Date.parse(value);
    if (Number.isNaN(key)) return undefined;
    return { key, key_as_string: new Date(key).toISOString() };
  }
  if (typeof value === 'number') {
    return { key: value, key_as_string: new Date(value).toISOString() };
  }
  return undefined;
}

function toCount(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'bigint') return Number(value);
  return 0;
}

/**
 * Maps the raw ES|QL response produced by `buildAlertSummaryQuery` into the
 * public `AlertSummaryResponse` shape. Buckets with zero counts on one side
 * are preserved so the client can render continuous series without separate
 * gap-filling logic.
 */
export function toAlertSummaryResponse(response: EsqlQueryResponse): AlertSummaryResponse {
  const { bucket, active, recovered } = indexColumns(response);

  const activeSeries: AlertSummaryBucket[] = [];
  const recoveredSeries: AlertSummaryBucket[] = [];
  let activeEventCount = 0;
  let recoveredEventCount = 0;

  if (bucket < 0 || active < 0 || recovered < 0) {
    return { activeEventCount, recoveredEventCount, activeSeries, recoveredSeries };
  }

  for (const row of response.values ?? []) {
    const bucketKey = bucketKeyFromValue(row[bucket]);
    if (!bucketKey) continue;

    const activeCount = toCount(row[active]);
    const recoveredCount = toCount(row[recovered]);

    activeEventCount += activeCount;
    recoveredEventCount += recoveredCount;

    activeSeries.push({ ...bucketKey, doc_count: activeCount });
    recoveredSeries.push({ ...bucketKey, doc_count: recoveredCount });
  }

  return { activeEventCount, recoveredEventCount, activeSeries, recoveredSeries };
}
