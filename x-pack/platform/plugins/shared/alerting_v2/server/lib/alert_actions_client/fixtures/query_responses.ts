/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsqlQueryResponse, FieldValue } from '@elastic/elasticsearch/lib/api/types';
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
 * - Batched paths (`loadLatestAlertEventsByGroupHash`,
 *   `loadLatestAlertEventsByEpisodeId`): pass an array — one entry per
 *   returned row.
 * - "No matches" case: pass an empty array.
 */
export const getAlertEventESQLResponse = (
  records: ReadonlyArray<Partial<RawAlertEventRow>> = [{}]
): EsqlQueryResponse => ({
  columns: [...ALERT_EVENT_COLUMNS],
  values: records.map(toAlertEventRow),
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
