/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsqlQueryResponse } from '@elastic/elasticsearch/lib/api/types';
import type {
  Alert,
  AlertSuppressionRow,
  LastNotifiedRecord,
  SeriesSuppressionRow,
} from '../types';

export const createDispatchableAlertEventsResponse = (
  alertEpisodes: Alert[]
): EsqlQueryResponse => {
  return {
    columns: [
      { name: 'last_event_timestamp', type: 'date' },
      { name: 'rule_id', type: 'keyword' },
      { name: 'source', type: 'keyword' },
      { name: 'space_id', type: 'keyword' },
      { name: 'group_hash', type: 'keyword' },
      { name: 'alert_id', type: 'keyword' },
      { name: 'alert_status', type: 'keyword' },
      { name: 'severity', type: 'keyword' },
    ],
    values: alertEpisodes.map((alertEpisode) => [
      alertEpisode.last_event_timestamp,
      alertEpisode.rule_id,
      alertEpisode.source,
      alertEpisode.space_id,
      alertEpisode.group_hash,
      alertEpisode.alert_id,
      alertEpisode.alert_status,
      alertEpisode.severity ?? null,
    ]),
  };
};

export const createAlertSuppressionsResponse = (
  suppressions: AlertSuppressionRow[] = []
): EsqlQueryResponse => {
  return {
    columns: [
      { name: 'rule_id', type: 'keyword' },
      { name: 'group_hash', type: 'keyword' },
      { name: 'alert_id', type: 'keyword' },
      { name: 'should_suppress', type: 'boolean' },
      { name: 'last_ack_action', type: 'keyword' },
      { name: 'last_deactivate_action', type: 'keyword' },
      { name: 'source', type: 'keyword' },
      { name: 'space_id', type: 'keyword' },
    ],
    values: suppressions.map((suppression) => [
      suppression.rule_id,
      suppression.group_hash,
      suppression.alert_id,
      suppression.should_suppress,
      suppression.last_ack_action ?? null,
      suppression.last_deactivate_action ?? null,
      suppression.source,
      suppression.space_id,
    ]),
  };
};

export const createSeriesSuppressionsResponse = (
  suppressions: SeriesSuppressionRow[] = []
): EsqlQueryResponse => {
  return {
    columns: [
      { name: 'rule_id', type: 'keyword' },
      { name: 'group_hash', type: 'keyword' },
      { name: 'should_suppress', type: 'boolean' },
      { name: 'last_snooze_action', type: 'keyword' },
      { name: 'source', type: 'keyword' },
      { name: 'space_id', type: 'keyword' },
    ],
    values: suppressions.map((suppression) => [
      suppression.rule_id,
      suppression.group_hash,
      suppression.should_suppress,
      suppression.last_snooze_action ?? null,
      suppression.source,
      suppression.space_id,
    ]),
  };
};

export interface AlertDataRow {
  alert_id: string;
  data_json: string | null;
}

export const createAlertDataResponse = (rows: AlertDataRow[]): EsqlQueryResponse => {
  return {
    columns: [
      { name: 'alert_id', type: 'keyword' },
      { name: 'data_json', type: 'keyword' },
    ],
    values: rows.map((row) => [row.alert_id, row.data_json]),
  };
};

export const createLastNotifiedTimestampsResponse = (
  records: LastNotifiedRecord[] = []
): EsqlQueryResponse => {
  return {
    columns: [
      { name: 'action_group_id', type: 'keyword' },
      { name: 'last_notified', type: 'date' },
      { name: 'alert_status', type: 'keyword' },
    ],
    values: records.map((r) => [r.action_group_id, r.last_notified, r.alert_status ?? null]),
  };
};
