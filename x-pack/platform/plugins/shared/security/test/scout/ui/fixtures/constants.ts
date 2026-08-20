/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRole } from '@kbn/scout';

export const API_KEYS_URL = /app\/management\/security\/api_keys\/?$/;
export const API_KEYS_CREATE_URL = /app\/management\/security\/api_keys\/create/;

const KIBANA_ACCESS: KibanaRole['kibana'] = [
  { base: [], feature: { advancedSettings: ['read'] }, spaces: ['*'] },
];

export const OWN_API_KEYS_ROLE: KibanaRole = {
  elasticsearch: { cluster: ['manage_own_api_key'] },
  kibana: KIBANA_ACCESS,
};

export const ALL_API_KEYS_ROLE: KibanaRole = {
  elasticsearch: { cluster: ['manage_api_key'] },
  kibana: KIBANA_ACCESS,
};

export const READ_SECURITY_ROLE: KibanaRole = {
  elasticsearch: { cluster: ['read_security'] },
  kibana: KIBANA_ACCESS,
};

export const RESTRICTED_ROLE_DESCRIPTORS = {
  viewer: {
    cluster: ['all'],
    indices: [
      {
        names: ['*'],
        privileges: ['all'],
        allow_restricted_indices: false,
      },
      {
        names: ['*'],
        privileges: ['monitor', 'read', 'view_index_metadata', 'read_cross_cluster'],
        allow_restricted_indices: true,
      },
    ],
    run_as: ['*'],
  },
};
