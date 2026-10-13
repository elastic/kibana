/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingsDefinition } from '@kbn/es-mappings';
import { ALERT_ACTIONS_DATA_STREAM } from '@kbn/alerting-v2-constants';
import { z } from '@kbn/zod/v4';
import { getIngestTimestampPipeline } from './ingest_timestamp_pipeline';
import type { ResourceDefinition } from './types';

export const ALERT_ACTIONS_DATA_STREAM_VERSION = 8;
export const ALERT_ACTIONS_BACKING_INDEX = '.ds-.alert-actions-*';
export const ALERT_ACTIONS_RESOURCE_KEY = `data_stream:${ALERT_ACTIONS_DATA_STREAM}`;

const mappings: MappingsDefinition = {
  dynamic: false,
  properties: {
    '@timestamp': { type: 'date' },
    last_series_event_timestamp: { type: 'date' },
    expiry: { type: 'date' },
    // Object since v7; v6 and below stored the user profile uid (or `system`) as a keyword.
    actor: {
      type: 'object',
      properties: {
        type: { type: 'keyword' }, // user | internal
        profile_uid: { type: 'keyword' }, // only set for user actors with a resolved profile
      },
    },
    assignee_uid: { type: 'keyword' },
    action_type: { type: 'keyword' },
    group_hash: { type: 'keyword' },
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

// `internal` marks writes made by Kibana itself (e.g. the dispatcher) with no principal behind them.
const alertActionActorTypeSchema = z.enum(['user', 'internal']);

export const alertActionActorSchema = z.object({
  type: alertActionActorTypeSchema,
  profile_uid: z.string().optional(),
});

export const alertActionActorType = alertActionActorTypeSchema.enum;

export const alertActionSchema = z.object({
  '@timestamp': z.string(),
  group_hash: z.string(),
  last_series_event_timestamp: z.string(),
  expiry: z.string().optional(),
  actor: alertActionActorSchema,
  assignee_uid: z.string().nullable().optional(),
  action_type: z.string(),
  // Null for series-level actions (tag/snooze/unsnooze): they target the
  // series as a whole, not one alert.
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
export type AlertActionActor = z.infer<typeof alertActionActorSchema>;
/** Write shape: `@timestamp` is set by the data stream's ingest pipeline at index time. */
export type AlertActionDocument = Omit<AlertAction, '@timestamp'> & { '@timestamp'?: string };

export const getAlertActionsResourceDefinition = (): ResourceDefinition => ({
  key: ALERT_ACTIONS_RESOURCE_KEY,
  dataStreamName: ALERT_ACTIONS_DATA_STREAM,
  version: ALERT_ACTIONS_DATA_STREAM_VERSION,
  mappings,
  lifecycle: {},
  finalPipeline: getIngestTimestampPipeline(ALERT_ACTIONS_DATA_STREAM),
  // Data streams created from v7 or below store the alert id and status as `episode_id` and
  // `episode_status`, which v8 readers ignore, and those created from v6 or below map `actor` as a
  // keyword, which cannot be turned into an object in place. Keep this at 7 when bumping the version.
  forceReset: { version: 7 },
});
