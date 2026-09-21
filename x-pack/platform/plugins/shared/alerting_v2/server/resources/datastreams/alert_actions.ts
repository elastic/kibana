/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingsDefinition } from '@kbn/es-mappings';
import { ALERT_ACTIONS_DATA_STREAM } from '@kbn/alerting-v2-constants';
import { z } from '@kbn/zod/v4';
import type { ResourceDefinition } from './types';

// Pre-GA rename: alert_id/alert_status replace episode_id/episode_status. See alert_events.ts.
export const ALERT_ACTIONS_DATA_STREAM_VERSION = 6;
export const ALERT_ACTIONS_BACKING_INDEX = '.ds-.alert-actions-*';

const mappings: MappingsDefinition = {
  dynamic: false,
  properties: {
    '@timestamp': { type: 'date' },
    last_series_event_timestamp: { type: 'date' },
    expiry: { type: 'date' },
    actor: { type: 'keyword' },
    assignee_uid: { type: 'keyword' },
    action_type: { type: 'keyword' },
    group_hash: { type: 'keyword' },
    // Renamed from episode_id/episode_status in v6.
    alert_id: { type: 'keyword' },
    alert_status: { type: 'keyword' },
    rule_id: { type: 'keyword' },
    tags: { type: 'keyword' },
    action_group_id: { type: 'keyword' },
    source: { type: 'keyword' },
    reason: { type: 'text' },
    space_id: { type: 'keyword' },
  },
};

export const alertActionSchema = z.object({
  '@timestamp': z.string(),
  group_hash: z.string(),
  last_series_event_timestamp: z.string(),
  expiry: z.string().optional(),
  actor: z.string().nullable(),
  assignee_uid: z.string().nullable().optional(),
  action_type: z.string(),
  // Null for series-level actions (tag/snooze/unsnooze): they target the
  // series as a whole, not one alert lifecycle. Renamed from episode_id/episode_status in v6.
  alert_id: z.string().nullable().optional(),
  alert_status: z.string().optional(),
  rule_id: z.string().nullable(),
  action_group_id: z.string().optional(),
  source: z.string().optional(),
  tags: z.array(z.string()).optional(),
  reason: z.string().optional(),
  space_id: z.string(),
});

export type AlertAction = z.infer<typeof alertActionSchema>;

export const getAlertActionsResourceDefinition = (): ResourceDefinition => ({
  key: `data_stream:${ALERT_ACTIONS_DATA_STREAM}`,
  dataStreamName: ALERT_ACTIONS_DATA_STREAM,
  version: ALERT_ACTIONS_DATA_STREAM_VERSION,
  mappings,
  lifecycle: {},
});
