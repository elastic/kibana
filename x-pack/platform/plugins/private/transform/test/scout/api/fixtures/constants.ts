/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRole } from '@kbn/scout';

// versioned API headers common to all Transform API requests
export const COMMON_API_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
  'x-elastic-internal-origin': 'kibana',
  'elastic-api-version': '1',
} as const;

export const TRANSFORM_USERS: Record<string, KibanaRole> = {
  transformManager: {
    kibana: [
      {
        base: ['all'],
        feature: {},
        spaces: ['*'],
      },
    ],
    elasticsearch: {
      cluster: ['manage_transform', 'monitor', 'read_pipeline'],
      indices: [
        // Source index privileges
        { names: ['*'], privileges: ['read', 'view_index_metadata'] },
        // Destination index privileges
        { names: ['user-*'], privileges: ['read', 'index', 'manage', 'delete'] },
      ],
    },
  },

  transformViewerUser: {
    kibana: [
      {
        base: ['all'],
        feature: {},
        spaces: ['*'],
      },
    ],
    elasticsearch: {
      cluster: ['monitor_transform'],
      indices: [
        // Destination index read-only access
        { names: ['user-*'], privileges: ['read'] },
      ],
    },
  },

  transformUnauthorizedUser: {
    kibana: [
      {
        base: ['all'],
        feature: {},
        spaces: ['*'],
      },
    ],
    elasticsearch: {
      cluster: [],
      indices: [],
    },
  },
};
