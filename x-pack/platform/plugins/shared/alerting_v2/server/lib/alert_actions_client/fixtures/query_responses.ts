/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsqlQueryResponse, FieldValue } from '@elastic/elasticsearch/lib/api/types';
import { encodeSeriesId } from '@kbn/alerting-v2-utils';
import type { RawAlertEventRow } from '../types';

/**
 * Canonical column order emitted by every alert-event ES|QL projection in
 * this client (see the shared `KEEP …` clause in
 * `context_loaders/load_latest_alert_events.ts`). Kept in lock-step with
 * `RawAlertEventRow` so a new field on `AlertEventRecord` shows up here
 * as a build failure until it's projected consistently across production
 * and tests.
 */
const ALERT_EVENT_COLUMNS: ReadonlyArray<{ name: string; type: string }> = [
  { name: '@timestamp', type: 'date' },
  { name: 'group_hash', type: 'keyword' },
  { name: 'episode_id', type: 'keyword' },
  { name: 'episode_status', type: 'keyword' },
  { name: 'episode_status_count', type: 'long' },
  { name: 'rule_id', type: 'keyword' },
  { name: 'rule_version', type: 'long' },
  { name: 'space_id', type: 'keyword' },
  { name: 'status', type: 'keyword' },
  { name: 'source', type: 'keyword' },
  { name: 'data_json', type: 'keyword' },
  { name: 'severity', type: 'keyword' },
];

const toAlertEventRow = (record: Partial<RawAlertEventRow>): FieldValue[] => [
  record['@timestamp'] ?? '2025-01-01T00:00:00.000Z',
  record.group_hash ?? 'test-group-hash',
  record.episode_id ?? 'episode-1',
  record.episode_status === undefined ? 'active' : record.episode_status,
  record.episode_status_count === undefined ? null : record.episode_status_count,
  // Use explicit undefined-check so callers can pass null to simulate a missing rule_id
  record.rule_id === undefined ? 'test-rule-id' : record.rule_id,
  record.rule_version ?? 1,
  record.space_id ?? 'default',
  record.status ?? 'breached',
  record.source ?? 'internal',
  record.data_json === undefined ? null : record.data_json,
  record.severity === undefined ? null : record.severity,
];

/**
 * Mocks an ES|QL response for the canonical alert-event projection
 * (`RawAlertEventRow`). One function covers every alert-event loader in
 * the client:
 *
 * - Single-route paths (`loadLastSeriesAlertEventOrThrow`,
 *   `loadLastEpisodeAlertEventOrThrow`): pass one record (or omit the
 *   argument to accept defaults).
 * - Batched paths (`loadLatestAlertEventsByEpisodeId`): pass an array — one entry per
 *   returned row.
 * - "No matches" case: pass an empty array.
 */
export const getAlertEventESQLResponse = (
  records: ReadonlyArray<Partial<RawAlertEventRow>> = [{}]
): EsqlQueryResponse => ({
  columns: [...ALERT_EVENT_COLUMNS],
  values: records.map(toAlertEventRow),
});

/**
 * Mocks an ES|QL response for the by-series projection
 * (`loadLatestAlertEventsBySeries`): the alert-event columns plus the
 * `series_id` each row was grouped under. Unless a record names one, it is
 * derived from the record's own owner, space and hash, as the ES|QL
 * expression does.
 */
export const getSeriesEventESQLResponse = (
  records: ReadonlyArray<Partial<RawAlertEventRow> & { series_id?: string | null }> = [{}]
): EsqlQueryResponse => ({
  columns: [...ALERT_EVENT_COLUMNS, { name: 'series_id', type: 'keyword' }],
  values: records.map((record) => {
    const row = toAlertEventRow(record);
    const [, groupHash, , , , ruleId, , spaceId, , source] = row;
    return [
      ...row,
      record.series_id === undefined
        ? encodeSeriesId({
            space_id: String(spaceId),
            group_hash: String(groupHash),
            rule_id: ruleId == null ? null : String(ruleId),
            source: source == null ? null : String(source),
          })
        : record.series_id,
    ];
  }),
});

export const getEmptyESQLResponse = (): EsqlQueryResponse => ({
  columns: [],
  values: [],
});

/**
 * Column order of the action-state projection in
 * `context_loaders/load_alert_action_states.ts`.
 */
const ALERT_ACTION_STATE_COLUMNS: ReadonlyArray<{ name: string; type: string }> = [
  { name: 'alert_id', type: 'keyword' },
  { name: 'last_ack_action', type: 'keyword' },
  { name: 'last_assignee_uid', type: 'keyword' },
  { name: 'last_tags', type: 'keyword' },
];

/** One action-state row as the loader reads it; omitted columns are null. */
export interface AlertActionStateRowOverrides {
  alert_id?: string;
  last_ack_action?: 'ack' | 'unack' | null;
  last_assignee_uid?: string | null;
  last_tags?: string | string[] | null;
}

/**
 * `FieldValue` has no array variant, but a multi-valued ES|QL column does
 * come back as a nested array — which is what `last_tags` carries.
 */
type EsqlCell = FieldValue | FieldValue[];

const toAlertActionStateRow = (row: AlertActionStateRowOverrides): EsqlCell[] => [
  row.alert_id ?? 'episode-1',
  row.last_ack_action ?? null,
  row.last_assignee_uid ?? null,
  row.last_tags ?? null,
];

export const getAlertActionStateESQLResponse = (
  rows: readonly AlertActionStateRowOverrides[] = []
): EsqlQueryResponse => ({
  columns: [...ALERT_ACTION_STATE_COLUMNS],
  values: rows.map(toAlertActionStateRow) as EsqlQueryResponse['values'],
});

/**
 * Column order of the series-state projection in
 * `context_loaders/load_series_action_states.ts`.
 */
const SERIES_ACTION_STATE_COLUMNS: ReadonlyArray<{ name: string; type: string }> = [
  { name: 'series_id', type: 'keyword' },
  { name: 'last_snooze_action', type: 'keyword' },
  { name: 'snoozed_until', type: 'date' },
];

/** One series-state row as the loader reads it; omitted columns are null. */
export interface SeriesActionStateRowOverrides {
  series_id?: string;
  last_snooze_action?: 'snooze' | 'unsnooze' | null;
  snoozed_until?: string | null;
}

export const getSeriesActionStateESQLResponse = (
  rows: readonly SeriesActionStateRowOverrides[] = []
): EsqlQueryResponse => ({
  columns: [...SERIES_ACTION_STATE_COLUMNS],
  values: rows.map((row) => [
    row.series_id ?? 'series-1',
    row.last_snooze_action ?? null,
    row.snoozed_until ?? null,
  ]),
});
