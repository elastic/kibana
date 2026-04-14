/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IlmPolicy } from '@elastic/elasticsearch/lib/api/types';
import { z } from '@kbn/zod/v4';
import type { AlertActionTypeRegistry } from '../../lib/alert_action_types';
import type { ResourceDefinition } from './types';

export const ALERT_ACTIONS_DATA_STREAM = '.alert-actions';
export const ALERT_ACTIONS_DATA_STREAM_VERSION = 2;
export const ALERT_ACTIONS_BACKING_INDEX = '.ds-.alert-actions-*';
export const ALERT_ACTIONS_ILM_POLICY_NAME = '.alert-actions-ilm-policy';

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

export const alertActionSchema = z.object({
  '@timestamp': z.string(),
  group_hash: z.string(),
  last_series_event_timestamp: z.string(),
  expiry: z.string().optional(),
  actor: z.string().nullable(),
  action_type: z.string(),
  episode_id: z.string().optional(),
  episode_status: z.string().optional(),
  rule_id: z.string(),
  notification_group_id: z.string().optional(),
  source: z.string().optional(),
  tags: z.array(z.string()).optional(),
  reason: z.string().optional(),
  space_id: z.string(),
});

export type AlertAction = z.infer<typeof alertActionSchema>;

export const getAlertActionsResourceDefinition = (
  registry: AlertActionTypeRegistry
): ResourceDefinition => ({
  key: `data_stream:${ALERT_ACTIONS_DATA_STREAM}`,
  dataStreamName: ALERT_ACTIONS_DATA_STREAM,
  version: ALERT_ACTIONS_DATA_STREAM_VERSION,
  mappings: registry.getComposedMappings(),
  ilmPolicy: { name: ALERT_ACTIONS_ILM_POLICY_NAME, policy: ALERT_ACTIONS_ILM_POLICY },
});
