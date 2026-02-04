/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRole, ScoutTestConfig } from '@kbn/scout';

// Headers for internal APIs (version 1)
export const COMMON_API_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
  'x-elastic-internal-origin': 'kibana',
  'elastic-api-version': '1',
} as const;

// Headers for public APIs (version 2023-10-31)
export const PUBLIC_API_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
  'x-elastic-internal-origin': 'kibana',
  'elastic-api-version': '2023-10-31',
} as const;

/**
 * Returns streams user roles with privileges appropriate for the deployment type.
 * Some cluster privileges (manage_ilm, manage_data_stream_global_retention) are not
 * supported in serverless mode.
 */
export function getStreamsUsers(config: ScoutTestConfig): Record<string, KibanaRole> {
  const isServerless = config.serverless;

  // Cluster privileges that are only available in stateful deployments
  const statefulOnlyClusterPrivileges = isServerless
    ? []
    : ['manage_ilm', 'manage_data_stream_global_retention'];

  return {
    streamsAdmin: {
      kibana: [
        {
          base: ['all'],
          feature: {},
          spaces: ['*'],
        },
      ],
      elasticsearch: {
        cluster: [
          'manage_index_templates',
          'monitor',
          'manage_pipeline',
          ...statefulOnlyClusterPrivileges,
        ],
        indices: [
          { names: ['logs*'], privileges: ['all'] },
          { names: ['.ds-logs*'], privileges: ['all'] },
          { names: ['.streams*'], privileges: ['all'] },
          { names: ['.kibana_streams*'], privileges: ['all'] },
        ],
      },
    },

    streamsReadOnly: {
      kibana: [
        {
          base: ['read'],
          feature: {},
          spaces: ['*'],
        },
      ],
      elasticsearch: {
        cluster: ['monitor'],
        indices: [
          { names: ['logs*'], privileges: ['read', 'view_index_metadata'] },
          { names: ['.ds-logs*'], privileges: ['read', 'view_index_metadata'] },
          { names: ['.kibana_streams*'], privileges: ['read', 'view_index_metadata'] },
        ],
      },
    },

    streamsUnauthorized: {
      kibana: [
        {
          base: [],
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
}
