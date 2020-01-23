/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SnapshotModel } from '../../../types';

export const cpu: SnapshotModel = {
  cpu_user: {
    avg: {
      field: 'system.cpu.user.pct',
    },
  },
  cpu_system: {
    avg: {
      field: 'system.cpu.system.pct',
    },
  },
  cpu_cores: {
    max: {
      field: 'system.cpu.cores',
    },
  },
  cpu: {
    bucket_script: {
      buckets_path: {
        user: 'cpu_user',
        system: 'cpu_system',
        cores: 'cpu_cores',
      },
      script: {
        source: '(params.user + params.system) / params.cores',
        lang: 'painless',
      },
      gap_policy: 'skip',
    },
  },
};
