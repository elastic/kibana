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

export const ALERT_ACTIONS_DATA_STREAM = '.alerts-actions';
export const ALERT_ACTIONS_ILM_POLICY_NAME = '.alerts-actions-ilm-policy';

export const ALERT_ACTIONS_ILM_POLICY: IlmPolicy = {
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
    last_series_event_timestamp: { type: 'date' },
    actor: { type: 'keyword' },
    action_type: { type: 'keyword' },
    episode_id: { type: 'keyword' },
    rule_id: { type: 'keyword' },
    source: { type: 'keyword' },
  },
};

export const alertActionSchema = z.object({
  '@timestamp': z.string(),
  alert_series_id: z.string(),
  last_series_event_timestamp: z.string(),
  actor: z.string(),
  action_type: z.string(),
  episode_id: z.string(),
  rule_id: z.string(),
  source: z.string(),
});

export type AlertAction = z.infer<typeof alertActionSchema>;

export const getAlertActionsResourceDefinition = (): ResourceDefinition => ({
  key: `data_stream:${ALERT_ACTIONS_DATA_STREAM}`,
  dataStreamName: ALERT_ACTIONS_DATA_STREAM,
  mappings,
  ilmPolicy: { name: ALERT_ACTIONS_ILM_POLICY_NAME, policy: ALERT_ACTIONS_ILM_POLICY },
});
