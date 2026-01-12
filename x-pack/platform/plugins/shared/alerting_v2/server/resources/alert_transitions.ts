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

export const ALERT_TRANSITIONS_DATA_STREAM = '.alerts-transitions';
export const ALERT_TRANSITIONS_ILM_POLICY_NAME = '.alerts-transitions-ilm-policy';

export const ALERT_TRANSITIONS_ILM_POLICY: IlmPolicy = {
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
    alert_series_id: { type: 'keyword' },
    episode_id: { type: 'keyword' },
    rule_id: { type: 'keyword' },
    start_state: { type: 'keyword' },
    end_state: { type: 'keyword' },
  },
};

const alertTransitionStateSchema = z.enum(['inactive', 'pending', 'recovering', 'active']);

export const alertTransitionStates = alertTransitionStateSchema.enum;

export const alertTransitionSchema = z.object({
  '@timestamp': z.string(),
  alert_series_id: z.string(),
  episode_id: z.string(),
  rule_id: z.string(),
  start_state: alertTransitionStateSchema,
  end_state: alertTransitionStateSchema,
});

export type AlertTransition = z.infer<typeof alertTransitionSchema>;
export type AlertTransitionState = z.infer<typeof alertTransitionStateSchema>;

export const getAlertTransitionsResourceDefinition = (): ResourceDefinition => ({
  key: `data_stream:${ALERT_TRANSITIONS_DATA_STREAM}`,
  dataStreamName: ALERT_TRANSITIONS_DATA_STREAM,
  mappings,
  ilmPolicy: { name: ALERT_TRANSITIONS_ILM_POLICY_NAME, policy: ALERT_TRANSITIONS_ILM_POLICY },
});
