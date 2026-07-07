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

  /**
   * Narrow role that mirrors the FTR `index_management_user` definition exactly
   * (cluster privileges only, `advancedSettings:read` Kibana feature).
   * Used for the management sidebar smoke test to produce the same sidebar composition
   * as the original FTR test without granting broad Kibana `base:['read']` access.
   */
  indexManagementCapabilityCheck: {
    elasticsearch: {
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
        base: [],
        feature: {
          advancedSettings: ['read'],
          dashboard: ['read'],
        },
        spaces: ['*'],
      },
    ],
  },
};
