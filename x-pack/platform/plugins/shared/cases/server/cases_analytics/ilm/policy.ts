/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IlmPolicy } from '@elastic/elasticsearch/lib/api/types';

/**
 * Default ILM policy for `.cases-data.*` indices.
 *
 * Hot-only by default — case data is operationally important and customers don't
 * generally want it deleted. Operators who want warm/cold tiers can override the
 * policy at deploy time by ID; this is just the floor.
 *
 * Rollover at 50 GB primary or 30 days, whichever first.
 */
export const CASES_DATA_ILM_POLICY: IlmPolicy = {
  phases: {
    hot: {
      min_age: '0ms',
      actions: {
        rollover: {
          max_primary_shard_size: '50gb',
          max_age: '30d',
        },
        set_priority: {
          priority: 100,
        },
      },
    },
  },
};
