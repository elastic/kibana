/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { IlmPolicy } from '@elastic/elasticsearch/lib/api/types';
import { z } from '@kbn/zod';
import type { ResourceDefinition } from './types';

export const ALERT_EVENTS_DATA_STREAM = '.alerts-events';
export const ALERT_EVENTS_ILM_POLICY_NAME = '.alerts-events-ilm-policy';

export const ALERT_EVENTS_ILM_POLICY: IlmPolicy = {
  _meta: { managed: true },
  phases: {
    hot: {
      actions: {
        rollover: {
          max_age: '30d',
          max_primary_shard_size: '50gb',
        },
      },
    },
  },
};

const mappings: estypes.MappingTypeMapping = {
  dynamic: false,
  properties: {
    '@timestamp': { type: 'date' },
    scheduled_timestamp: { type: 'date' },
    type: { type: 'keyword' },
    rule: {
      properties: {
        id: { type: 'keyword' },
        tags: { type: 'keyword' },
      },
    },
    grouping: {
      properties: {
        key: { type: 'keyword' },
        value: { type: 'keyword' },
      },
    },
    data: { type: 'flattened' },
    parent_rule_id: { type: 'keyword' },
    status: { type: 'keyword' },
    alert_id: { type: 'keyword' },
    alert_series_id: { type: 'keyword' },
    source: { type: 'keyword' },
    episode_id: { type: 'keyword' },
    alert_state: { type: 'keyword' },
    breach_count: { type: 'long' },
    recover_count: { type: 'long' },
  },
};

export const commonAlertEventSchema = z.object({
  '@timestamp': z.string(),
  scheduled_timestamp: z.string().optional(),
  parent_rule_id: z.string().optional(),
  rule: z.object({
    id: z.string(),
    tags: z.array(z.string()).optional(),
  }),
  grouping: z
    .object({
      key: z.string(),
      value: z.string(),
    })
    .optional(),
  data: z.record(z.string(), z.any()).optional(),
  alert_id: z.string(), // ??
  alert_series_id: z.string(), // hash(alert_id + grouping key/value)
  source: z.string(), // "internal" | "external"
  status: z.enum(['breached', 'recover', 'no_data']),
});

export const signalAlertEventSchema = commonAlertEventSchema.extend({
  type: z.literal('signal'),
});

export const alertAlertEventSchema = commonAlertEventSchema.extend({
  type: z.literal('alert'),
  episode_id: z.string(),
  alert_state: z.enum(['inactive', 'pending', 'active', 'recovering']),
  breach_count: z.number(),
  recover_count: z.number(),
});

export const alertEventSchema = z.discriminatedUnion('type', [
  signalAlertEventSchema,
  alertAlertEventSchema,
]);

export type AlertEvent = z.infer<typeof alertEventSchema>;

export const getAlertEventsResourceDefinition = (): ResourceDefinition => ({
  key: `data_stream:${ALERT_EVENTS_DATA_STREAM}`,
  dataStreamName: ALERT_EVENTS_DATA_STREAM,
  mappings,
  ilmPolicy: { name: ALERT_EVENTS_ILM_POLICY_NAME, policy: ALERT_EVENTS_ILM_POLICY },
});
