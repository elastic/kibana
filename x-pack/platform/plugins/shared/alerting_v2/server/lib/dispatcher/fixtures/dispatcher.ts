/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsqlQueryResponse } from '@elastic/elasticsearch/lib/api/types';
import type { AlertEpisode, AlertEpisodeSuppression, LastNotifiedRecord } from '../types';

export const createDispatchableAlertEventsResponse = (
  alertEpisodes: Array<AlertEpisode & { data_json?: string | null }>
): EsqlQueryResponse => {
  return {
    columns: [
      { name: 'last_event_timestamp', type: 'date' },
      { name: 'rule_id', type: 'keyword' },
      { name: 'group_hash', type: 'keyword' },
      { name: 'episode_id', type: 'keyword' },
      { name: 'episode_status', type: 'keyword' },
      { name: 'data_json', type: 'keyword' },
    ],
    values: alertEpisodes.map((alertEpisode) => [
      alertEpisode.last_event_timestamp,
      alertEpisode.rule_id,
      alertEpisode.group_hash,
      alertEpisode.episode_id,
      alertEpisode.episode_status,
      alertEpisode.data_json ?? null,
    ]),
  };
};

export const createAlertEpisodeSuppressionsResponse = (
  suppressions: AlertEpisodeSuppression[]
): EsqlQueryResponse => {
  return {
    columns: [
      { name: 'rule_id', type: 'keyword' },
      { name: 'group_hash', type: 'keyword' },
      { name: 'episode_id', type: 'keyword' },
      { name: 'should_suppress', type: 'boolean' },
    ],
    values: suppressions.map((suppression) => [
      suppression.rule_id,
      suppression.group_hash,
      suppression.episode_id,
      suppression.should_suppress,
    ]),
  };
};

export const createLastNotifiedTimestampsResponse = (
  records: LastNotifiedRecord[] = []
): EsqlQueryResponse => {
  return {
    columns: [
      { name: 'action_group_id', type: 'keyword' },
      { name: 'last_notified', type: 'date' },
    ],
    values: records.map((r) => [r.action_group_id, r.last_notified]),
  };
};
