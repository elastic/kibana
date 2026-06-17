/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EnrollmentAPIKey } from '../models';

import type { ListResult, ListWithKuery } from './common';

export interface GetEnrollmentAPIKeysRequest {
  query: ListWithKuery;
}

export type GetEnrollmentAPIKeysResponse = ListResult<EnrollmentAPIKey> & {
  // deprecated in 8.x
  list?: EnrollmentAPIKey[];
};

export interface GetOneEnrollmentAPIKeyRequest {
  params: {
    keyId: string;
  };
}

export interface GetOneEnrollmentAPIKeyResponse {
  item: EnrollmentAPIKey;
}

export interface DeleteEnrollmentAPIKeyRequest {
  params: {
    keyId: string;
  };
  query: {
    forceDelete?: boolean;
  };
}

export interface DeleteEnrollmentAPIKeyResponse {
  action: string;
}

export interface PostEnrollmentAPIKeyRequest {
  body: {
    name?: string;
    policy_id: string;
    expiration?: string;
  };
}

export interface PostEnrollmentAPIKeyResponse {
  action: string;
  item: EnrollmentAPIKey;
}

export interface BulkDeleteEnrollmentAPIKeysRequest {
  body: {
    tokenIds?: string[];
    kuery?: string;
    // false (revoke): invalidate the API key and mark the token as inactive.
    // true (delete): invalidate the API key and remove the token document.
    forceDelete?: boolean;
  };
}

export interface BulkDeleteEnrollmentAPIKeysResponse {
  action: string;
  count: number;
  successCount: number;
  errorCount: number;
}
