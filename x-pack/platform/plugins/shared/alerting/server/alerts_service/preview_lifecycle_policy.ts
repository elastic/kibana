/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IlmPolicy } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

/**
 * Default alert index ILM policy
 * - _meta.managed: notify users this is a managed policy and should be modified
 *     at their own risk
 * - no delete phase as we want to keep these indices around indefinitely
 *
 * This should be used by all alerts-as-data indices
 */

export const PREVIEW_ALERTS_ILM_POLICY_NAME = '.preview.alerts-ilm-policy';
export const PREVIEW_ALERTS_ILM_POLICY: IlmPolicy = {
  _meta: {
    managed: true,
  },
  phases: {
    hot: {
      actions: {
        rollover: {
          max_age: '1d',
          max_primary_shard_size: '50gb',
        },
      },
      min_age: '0ms',
    },
    delete: {
      min_age: '1d',
      actions: {
        delete: {},
      },
    },
  },
};
