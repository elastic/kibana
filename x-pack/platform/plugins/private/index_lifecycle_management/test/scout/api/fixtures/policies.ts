/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsClient } from '@kbn/scout';

// ILM policy with minimal configuration. Every `min_age` is at least a day, so no action runs
// against an attached index during the suite.
export const getPolicyPayload = (name: string) => ({
  name,
  phases: {
    hot: {
      min_age: '1d',
      actions: {
        set_priority: {
          priority: 100,
        },
      },
    },
    warm: {
      min_age: '10d',
      actions: {
        set_priority: {
          priority: 50,
        },
      },
    },
    delete: {
      min_age: '30d',
      actions: {
        delete: {},
      },
    },
  },
});

// ILM policy with full configuration. The searchable snapshot actions require an existing
// repository, and `wait_for_snapshot` references an SLM policy.
export const getPolicyPayloadWithSearchableSnapshots = (
  name: string,
  { repository, slmPolicy }: { repository: string; slmPolicy: string }
) => ({
  name,
  phases: {
    hot: {
      min_age: '1d',
      actions: {
        set_priority: {
          priority: 100,
        },
        unfollow: {},
        rollover: {
          max_age: '30d',
          max_size: '50gb',
        },
      },
    },
    warm: {
      actions: {
        set_priority: {
          priority: 50,
        },
        unfollow: {},
        readonly: {},
        allocate: {
          number_of_replicas: 5,
          include: {
            a: 'a',
          },
          exclude: {
            b: 'b',
          },
          require: {
            c: 'c',
          },
        },
        shrink: {
          number_of_shards: 1,
        },
        forcemerge: {
          max_num_segments: 1,
        },
      },
    },
    cold: {
      min_age: '10d',
      actions: {
        set_priority: {
          priority: 0,
        },
        unfollow: {},
        allocate: {
          number_of_replicas: 5,
          include: {
            a: 'a',
          },
          exclude: {
            b: 'b',
          },
          require: {
            c: 'c',
          },
        },
        freeze: {},
        searchable_snapshot: {
          snapshot_repository: repository,
        },
      },
    },
    frozen: {
      min_age: '20d',
      actions: {
        searchable_snapshot: {
          snapshot_repository: repository,
        },
      },
    },
    delete: {
      min_age: '30d',
      actions: {
        wait_for_snapshot: {
          policy: slmPolicy,
        },
        delete: {
          delete_searchable_snapshot: true,
        },
      },
    },
  },
});

/** Seeds a policy directly in ES so the request under test has something to act on. */
export const putPolicy = (
  esClient: EsClient,
  { name, ...policy }: ReturnType<typeof getPolicyPayload> & { _meta?: Record<string, unknown> }
) => esClient.ilm.putLifecycle({ name, policy });

export const deletePolicy = (esClient: EsClient, name: string) =>
  esClient.ilm.deleteLifecycle({ name }, { ignore: [404] });
