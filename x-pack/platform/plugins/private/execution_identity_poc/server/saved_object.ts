/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsType } from '@kbn/core/server';

export const SA_TOKEN_SO_TYPE = 'execution_identity_poc_sa_token';

export interface ServiceAccountTokenAttributes {
  saId: string;
  token: string;
}

// SA ids contain '/'; map to an id-safe, deterministic saved-object id.
export const soIdForServiceAccount = (serviceAccountId: string): string =>
  serviceAccountId.replace(/[^a-zA-Z0-9_.-]/g, '_');

export const serviceAccountTokenType: SavedObjectsType = {
  name: SA_TOKEN_SO_TYPE,
  hidden: true,
  namespaceType: 'agnostic',
  mappings: {
    dynamic: false,
    properties: {
      saId: { type: 'keyword' },
    },
  },
};
