/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRole } from '@kbn/scout';

// Roles for the ML feature_controls suites: full access, ml:read only, and a
// no-ML role (Discover read) that should NOT see the ML navlink.
export const CUSTOM_ROLES: Record<string, KibanaRole> = {
  global_all: {
    elasticsearch: {
      cluster: [],
      indices: [{ names: ['logstash-*'], privileges: ['read', 'view_index_metadata'] }],
    },
    kibana: [{ base: ['all'], feature: {}, spaces: ['*'] }],
  },

  ml_read: {
    elasticsearch: {
      cluster: [],
      indices: [{ names: ['logstash-*'], privileges: ['read', 'view_index_metadata'] }],
    },
    kibana: [
      {
        base: [],
        feature: { ml: ['read'], savedObjectsManagement: ['read'] },
        spaces: ['*'],
      },
    ],
  },

  ml_none: {
    elasticsearch: {
      cluster: [],
      indices: [{ names: ['logstash-*'], privileges: ['read', 'view_index_metadata'] }],
    },
    kibana: [{ base: [], feature: { discover: ['read'] }, spaces: ['*'] }],
  },
};
