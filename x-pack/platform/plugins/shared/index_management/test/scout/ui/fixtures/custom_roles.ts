/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRole } from '@kbn/scout';

export const CUSTOM_ROLES: Record<string, KibanaRole> = {
  indexManagementUser: {
    elasticsearch: {
      // would be nice if this wasn't needed
      cluster: ['monitor', 'manage_index_templates', 'manage_enrich'],
      indices: [
        {
          names: ['*'],
          privileges: ['all'],
        },
      ],
    },
    kibana: [
      {
        base: ['read'],
        feature: {},
        spaces: ['*'],
      },
    ],
  },
};
