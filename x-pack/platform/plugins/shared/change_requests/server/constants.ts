/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StorageSettings, types } from '@kbn/storage-adapter';

export const changeRequestsStorageSettings = {
  name: '.kibana_change_requests',
  schema: {
    properties: {
      // Don't map anything until we know what the queries will look like
      // Ideally I could disable mappings at the root rather than wrap like this, should implement that in the storage adapter
      request: types.object({ enabled: false }),
    },
  },
} satisfies StorageSettings;

export const CHANGE_REQUESTS_API_PRIVILEGES = {
  manage: 'manage_change_requests',
  create: 'create_change_request',
} as const;

export const CHANGE_REQUESTS_UI_PRIVILEGES = {
  manage: 'manage',
  create: 'create',
} as const;
