/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import type { KibanaRole } from '@kbn/scout';

// Base headers required by all ML API calls
export const COMMON_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
  'x-elastic-internal-origin': 'kibana',
} as const;

// Headers for internal ML endpoints (elastic-api-version: '1')
export const INTERNAL_API_HEADERS = {
  ...COMMON_HEADERS,
  [ELASTIC_HTTP_VERSION_HEADER]: '1',
} as const;

// Headers for public ML endpoints (elastic-api-version: '2023-10-31')
export const PUBLIC_API_HEADERS = {
  ...COMMON_HEADERS,
  [ELASTIC_HTTP_VERSION_HEADER]: '2023-10-31',
} as const;

export const ML_USERS: Record<string, KibanaRole> = {
  // Mirrors FTR: machine_learning_admin + ft_ml_source + ft_ml_dest + ft_ml_ui_extras + ml:all
  mlPoweruser: {
    kibana: [
      {
        base: [],
        feature: {
          ml: ['all'],
          savedObjectsManagement: ['all'],
          advancedSettings: ['all'],
          indexPatterns: ['all'],
          discover: ['all'],
          dashboard: ['all'],
        },
        spaces: ['*'],
      },
    ],
    elasticsearch: {
      cluster: ['manage_ml', 'monitor', 'manage_ingest_pipelines'],
      indices: [
        { names: ['*'], privileges: ['read', 'view_index_metadata'] },
        { names: ['user-*'], privileges: ['read', 'index', 'manage'] },
      ],
    },
  },

  // Mirrors FTR: machine_learning_user + ft_ml_source_readonly + ml:read
  mlViewer: {
    kibana: [
      {
        base: [],
        feature: {
          ml: ['read'],
          savedObjectsManagement: ['read'],
          advancedSettings: ['read'],
          indexPatterns: ['read'],
          discover: ['read'],
          dashboard: ['read'],
        },
        spaces: ['*'],
      },
    ],
    elasticsearch: {
      cluster: [],
      indices: [{ names: ['*'], privileges: ['read'] }],
    },
  },

  // Mirrors FTR: ft_ml_unauthorized — Kibana login possible, no ML feature or index write access
  mlUnauthorized: {
    kibana: [
      {
        base: [],
        feature: {
          discover: ['read'],
        },
        spaces: ['*'],
      },
    ],
    elasticsearch: {
      cluster: [],
      indices: [{ names: ['*'], privileges: ['read'] }],
    },
  },
};
