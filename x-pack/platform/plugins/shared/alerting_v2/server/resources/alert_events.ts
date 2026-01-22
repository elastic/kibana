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
    type: { type: 'keyword' }, // "signal" | "alert"
    rule: {
      properties: {
        id: { type: 'keyword' },
      },
    },
    source: { type: 'keyword' },
    data: { type: 'flattened' },
    status: { type: 'keyword' },
    group_hash: { type: 'keyword' },
    episode_id: { type: 'keyword' },
    episode_status: { type: 'keyword' },
    episode_status_count: { type: 'long' },
  },
};

export const commonAlertEventSchema = z.object({
  '@timestamp': z.string(),
  scheduled_timestamp: z.string().optional(),
  parent_rule_id: z.string().optional(),
  rule: z.object({
    id: z.string(),
  }),
  data: z.record(z.string(), z.any()).optional(),
  group_hash: z.string(), // hash(rule_id + grouping key/value + source)
  source: z.string(), // "internal" | "external"
  status: z.enum(['breach', 'recover', 'no_data']),
});

export const signalAlertEventSchema = commonAlertEventSchema.extend({
  type: z.literal('signal'),
});

export const alertAlertEventSchema = commonAlertEventSchema.extend({
  type: z.literal('alert'),
  episode_id: z.string(),
  episode_status: z.enum(['inactive', 'pending', 'active', 'recovering']), // breach: pending -> active | recover: recovering -> inactive
  episode_status_count: z.number().optional(),
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
