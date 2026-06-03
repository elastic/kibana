/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRole } from '@kbn/scout';

export const COMMON_API_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
  'x-elastic-internal-origin': 'kibana',
  'elastic-api-version': '1',
} as const;

/**
 * User roles for automatic_import feature privilege testing.
 *
 * - autoImportManager: has `automatic_import: all` → granted both manage + read API tags
 * - autoImportReader:  has `automatic_import: read` → granted only read API tag
 * - autoImportNoAccess: has global base `all` (typical broad Kibana access) but NO automatic_import
 *   feature entry — automatic_import uses excludeFromBasePrivileges, so base `all` does not imply its APIs
 *
 * Note: if SAML login fails for manager/reader (some setups require base access to authenticate),
 * add `base: ['all']` alongside the feature entry. The feature-level grant still controls
 * which API tags are present, so RBAC assertions remain valid.
 */
export const AUTO_IMPORT_USERS: Record<string, KibanaRole> = {
  autoImportManager: {
    kibana: [
      {
        base: [],
        feature: { automatic_import: ['all'], fleet: ['all'], integrations: ['all'] },
        spaces: ['*'],
      },
    ],
    elasticsearch: {
      cluster: ['monitor_inference'],
      indices: [
        {
          names: ['*'],
          privileges: ['read', 'view_index_metadata', 'monitor'],
        },
      ],
    },
  },

  autoImportReader: {
    kibana: [
      {
        base: [],
        feature: { automatic_import: ['read'], fleet: ['all'], integrations: ['all'] },
        spaces: ['*'],
      },
    ],
    elasticsearch: { cluster: [], indices: [] },
  },

  autoImportNoAccess: {
    kibana: [
      {
        base: [],
        feature: { fleet: ['all'], integrations: ['all'] },
        spaces: ['*'],
      },
    ],
    elasticsearch: { cluster: [], indices: [] },
  },
};
