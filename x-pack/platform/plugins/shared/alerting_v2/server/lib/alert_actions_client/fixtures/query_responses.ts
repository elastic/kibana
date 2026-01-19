/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESQLSearchResponse } from '@kbn/es-types';
import type { AlertEvent } from '../../../resources/alert_events';
import type { AlertTransition } from '../../../resources/alert_transitions';

export function anAlertEventESQLResponse(alertEvent?: Partial<AlertEvent>): ESQLSearchResponse {
  return {
    columns: [
      { name: '@timestamp', type: 'date' },
      { name: 'scheduled_timestamp', type: 'date' },
      { name: 'rule.id', type: 'keyword' },
      { name: 'rule.tags', type: 'keyword' },
      { name: 'alert_series_id', type: 'keyword' },
      { name: 'alert_id', type: 'keyword' },
      { name: 'status', type: 'keyword' },
      { name: 'source', type: 'keyword' },
      { name: 'tags', type: 'keyword' },
    ],
    values: [
      [
        alertEvent?.['@timestamp'] ?? '2025-01-01T00:00:00.000Z',
        alertEvent?.scheduled_timestamp ?? '2025-01-01T00:00:00.000Z',
        alertEvent?.rule?.id ?? 'test-rule-id',
        alertEvent?.rule?.tags ?? ['tag1', 'tag2'],
        alertEvent?.alert_series_id ?? 'test-series-id',
        alertEvent?.alert_id ?? 'test-alert-id',
        alertEvent?.status ?? 'active',
        alertEvent?.source ?? 'test-source',
        alertEvent?.tags ?? ['alert-tag'],
      ],
    ],
  };
}

export function anEmptyESQLResponse(): ESQLSearchResponse {
  return {
    columns: [],
    values: [],
  };
}

export function anAlertTransitionESQLResponse(
  alertTransition?: Partial<AlertTransition>
): ESQLSearchResponse {
  return {
    columns: [
      { name: '@timestamp', type: 'date' },
      { name: 'alert_series_id', type: 'keyword' },
      { name: 'episode_id', type: 'keyword' },
      { name: 'rule_id', type: 'keyword' },
      { name: 'start_state', type: 'keyword' },
      { name: 'end_state', type: 'keyword' },
    ],
    values: [
      [
        alertTransition?.['@timestamp'] ?? '2025-01-01T00:00:00.000Z',
        alertTransition?.alert_series_id ?? 'test-series-id',
        alertTransition?.episode_id ?? 'episode-1',
        alertTransition?.rule_id ?? 'test-rule-id',
        alertTransition?.start_state ?? 'inactive',
        alertTransition?.end_state ?? 'active',
      ],
    ],
  };
}
