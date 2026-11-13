/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql } from '@elastic/esql';
import { ALERT_EVENTS_DATA_STREAM } from '@kbn/alerting-v2-constants';

/** Raw ES|QL row: the number of alert series one connector created. */
export interface ImportAlertCountRow {
  'connector.id': string;
  alert_series_count: number;
}

/**
 * Counts the distinct alert series (`group_hash`) each connector created, across all time.
 * Repeated payloads for the same series count once.
 */
export const buildImportAlertCountsQuery = (connectorIds: readonly string[]) =>
  esql.from(ALERT_EVENTS_DATA_STREAM).where`type == "alert"`
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
