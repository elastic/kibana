/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsType } from '@kbn/core/server';

export const EVALS_REMOTE_KIBANA_CONFIG_SAVED_OBJECT_TYPE = 'evals-remote-kibana-config' as const;

export interface EvalsRemoteKibanaConfigAttributes {
  displayName: string;
  url: string;
  /**
   * API key for authenticating against the remote Kibana instance.
   * Encrypted at rest via Encrypted Saved Objects.
   */
  apiKey: string;
  createdAt: string;
  updatedAt: string;
}

export const evalsRemoteKibanaConfigSavedObjectType: SavedObjectsType = {
  name: EVALS_REMOTE_KIBANA_CONFIG_SAVED_OBJECT_TYPE,
  hidden: true,
  namespaceType: 'agnostic',
  mappings: {
    dynamic: false,
    properties: {
      displayName: { type: 'keyword' },
      url: { type: 'keyword' },
      apiKey: { type: 'binary' },
      createdAt: { type: 'date' },
      updatedAt: { type: 'date' },
    },
  },
  management: {
    importableAndExportable: false,
  },
};
