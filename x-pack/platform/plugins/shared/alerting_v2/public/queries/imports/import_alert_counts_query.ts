/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql } from '@elastic/esql';
import { ALERT_EVENTS_DATA_STREAM } from '@kbn/alerting-v2-constants';

/** How far back the imports list counts alerts. */
export const IMPORT_ALERT_COUNT_DAYS = 30;

/** The same window as a time range, for the alerts list the count links to. */
export const IMPORT_ALERT_COUNT_TIME_RANGE = {
  from: `now-${IMPORT_ALERT_COUNT_DAYS}d`,
  to: 'now',
} as const;

/** Raw ES|QL row: the number of alert series one connector created. */
export interface ImportAlertCountRow {
  'connector.id': string;
  alert_series_count: number;
}

/**
 * Counts the distinct alert series (`group_hash`) each connector created over the last
 * {@link IMPORT_ALERT_COUNT_DAYS} days. Repeated payloads for the same series count once.
 */
export const buildImportAlertCountsQuery = (connectorIds: readonly string[]) =>
  // Literal: an interpolated value would print as a query parameter. Keep in sync with
  // IMPORT_ALERT_COUNT_DAYS.
  esql.from(ALERT_EVENTS_DATA_STREAM).where`type == "alert"`.where`@timestamp >= NOW() - 30 days`
    .where`connector.id IN (${connectorIds.map((id) => esql.str(id))})`
    .pipe`STATS alert_series_count = COUNT_DISTINCT(group_hash) BY connector.id`
    // One row per connector, so the implicit result cap cannot drop one.
    .limit(Math.max(connectorIds.length, 1))
    .keep('connector.id', 'alert_series_count');

/** Maps each connector id to its alert series count. Connectors without alerts are absent. */
export const toImportAlertCounts = (
  rows: readonly ImportAlertCountRow[]
): Readonly<Record<string, number>> =>
  Object.fromEntries(
    rows.map(({ 'connector.id': connectorId, alert_series_count: count }) => [connectorId, count])
  );
