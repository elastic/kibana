/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRole } from '@kbn/scout';

// The API Keys management app needs *some* Kibana feature privilege for the user to reach Kibana at
// all; the app's own visibility is driven purely by the Elasticsearch cluster privileges below
// (see `apiKeysManagementFeature` in server/features/security_features.ts).
const KIBANA_ACCESS: KibanaRole['kibana'] = [
  { base: [], feature: { advancedSettings: ['read'] }, spaces: ['*'] },
];

/**
 * `manage_own_api_key` scopes every `_query/api_key` response to the logged-in user's own keys, so
 * specs that assert on the whole grid (empty prompt, pagination counts) are isolated from keys
 * owned by anyone else in the deployment.
 */
export const OWN_API_KEYS_ROLE: KibanaRole = {
  elasticsearch: { cluster: ['manage_own_api_key'] },
  kibana: KIBANA_ACCESS,
};

/** `manage_api_key` additionally exposes other users' keys, needed by the owner filter. */
export const ALL_API_KEYS_ROLE: KibanaRole = {
  elasticsearch: { cluster: ['manage_api_key'] },
  kibana: KIBANA_ACCESS,
};

/** `read_security` grants the `view` UI capability but not `save`, which renders the app read-only. */
export const READ_SECURITY_ROLE: KibanaRole = {
  elasticsearch: { cluster: ['read_security'] },
  kibana: KIBANA_ACCESS,
};

/** Role descriptors typed into the "Restrict privileges" editor by the update spec. */
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
