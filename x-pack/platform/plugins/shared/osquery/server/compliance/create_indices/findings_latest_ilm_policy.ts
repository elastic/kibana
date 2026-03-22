/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IlmPutLifecycleRequest } from '@elastic/elasticsearch/lib/api/types';

/**
 * ILM policy for the findings_latest index that manages the lifecycle
 * of deduplicated compliance findings data.
 * 
 * Hot phase: Keep actively queried data, rollover at 50GB or 30 days
 * Warm phase: Move older data to warm nodes after 7 days
 * Cold phase: Move to cold storage after 30 days 
 * Delete phase: Remove data after 90 days
 */
export const getFindingsLatestIlmPolicy = (): IlmPutLifecycleRequest => ({
  name: 'endpoint_compliance_findings_latest_policy',
  body: {
    policy: {
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
        warm: {
          min_age: '7d',
          actions: {
            set_priority: {
              priority: 50,
            },
            allocate: {
              number_of_replicas: 0,
            },
            forcemerge: {
              max_num_segments: 1,
            },
          },
        },
        cold: {
          min_age: '30d',
          actions: {
            set_priority: {
              priority: 0,
            },
            allocate: {
              number_of_replicas: 0,
            },
          },
        },
        delete: {
          min_age: '90d',
          actions: {
            delete: {},
          },
        },
      },
    },
  },
});