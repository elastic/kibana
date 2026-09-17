/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRole } from '@kbn/scout';

export const CUSTOM_ROLES: Record<string, KibanaRole> = {
  // Minimal role to access Stack Management + the Data Federation management app.
  // `data_federation` requires `cluster:manage` via registerElasticsearchFeature.
  data_federation_manager: {
    elasticsearch: {
      cluster: ['manage'],
      // The UI fetches data sets / data sources via Elasticsearch APIs that require index privileges.
      // We grant `manage` broadly to keep the suite focused on UI behavior (not RBAC composition).
      indices: [{ names: ['*'], privileges: ['manage'] }],
    },
    kibana: [
      { base: [], feature: { dashboard: ['read'], advancedSettings: ['read'] }, spaces: ['*'] },
    ],
  },
};
