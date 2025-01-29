/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PolicyFromES } from '../common/types';

export const policyAllPhases: PolicyFromES = {
  name: 'test',
  modifiedDate: '2024-08-12T12:17:06.271Z',
  version: 1,
  policy: {
    name: 'test',
    phases: {
      hot: {
        actions: {
          rollover: {
            max_age: '30d',
            max_primary_shard_size: '50gb',
            max_primary_shard_docs: 25,
            max_docs: 235,
            max_size: '2gb',
          },
          set_priority: {
            priority: 100,
          },
          forcemerge: {
            max_num_segments: 3,
            index_codec: 'best_compression',
          },
          shrink: {
            number_of_shards: 1,
          },
          readonly: {},
        },
        min_age: '0ms',
      },
      warm: {
        min_age: '3d',
        actions: {
          set_priority: {
            priority: 50,
          },
          shrink: {
            max_primary_shard_size: '4gb',
          },
          forcemerge: {
            max_num_segments: 44,
            index_codec: 'best_compression',
          },
          allocate: {
            number_of_replicas: 3,
          },
          downsample: {
            fixed_interval: '1d',
          },
        },
      },
      cold: {
        min_age: '55d',
        actions: {
          searchable_snapshot: {
            snapshot_repository: 'found-snapshots',
          },
          set_priority: {
            priority: 0,
          },
          allocate: {
            number_of_replicas: 3,
          },
          downsample: {
            fixed_interval: '4d',
          },
        },
      },
      frozen: {
        min_age: '555d',
        actions: {
          searchable_snapshot: {
            snapshot_repository: 'found-snapshots',
          },
        },
      },
      delete: {
        min_age: '7365d',
        actions: {
          wait_for_snapshot: {
            policy: 'cloud-snapshot-policy',
          },
          delete: {},
        },
      },
    },
  },
};
