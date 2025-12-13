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

export const TRANSFORM_USERS = {
  transformPowerUser: {
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
        // Transform notifications indices
        {
          names: [
            '.transform-notifications-*',
            '.data-frame-notifications-*',
            '.transform-notifications-read',
          ],
          privileges: ['view_index_metadata', 'read'],
        },
      ],
    },
  } as KibanaRole,

  transformViewerUser: {
    kibana: [
      {
        base: [],
        feature: {
          discover: ['read'],
          transform: ['read'],
        },
        spaces: ['*'],
      },
    ],
    elasticsearch: {
      cluster: ['monitor_transform'],
      indices: [
        // Source index privileges
        { names: ['logstash-*'], privileges: ['read', 'view_index_metadata'] },
        // Transform notifications indices
        {
          names: [
            '.transform-notifications-*',
            '.data-frame-notifications-*',
            '.transform-notifications-read',
          ],
          privileges: ['view_index_metadata', 'read'],
        },
      ],
    },
  } as KibanaRole,

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
  } as KibanaRole,
};
