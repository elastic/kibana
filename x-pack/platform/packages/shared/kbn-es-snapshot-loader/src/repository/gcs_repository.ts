/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RepositoryStrategy } from './types';
import { DEFAULT_REPOSITORY_REGISTER_REQUEST_TIMEOUT_MS } from './constants';

export interface GcsRepositoryConfig {
  bucket: string;
  basePath?: string;
  client?: string;
}

export function createGcsRepository(config: GcsRepositoryConfig): RepositoryStrategy {
  return {
    type: 'gcs',
    validate() {
      if (!config.bucket.trim()) {
        throw new Error('GCS repository bucket is required');
      }
    },
    async register({ esClient, repoName }) {
      await esClient.snapshot.createRepository(
        {
          name: repoName,
          // Repository verification can take longer than the default 30s cluster-event timeout,
          // especially for remote repository types (like GCS). Bump timeouts for reliability.
          master_timeout: '2m',
          timeout: '2m',
          body: {
            type: 'gcs',
            settings: {
              bucket: config.bucket,
              ...(config.basePath && { base_path: config.basePath }),
              ...(config.client && { client: config.client }),
            },
          },
        },
        { requestTimeout: DEFAULT_REPOSITORY_REGISTER_REQUEST_TIMEOUT_MS }
      );
    },
  };
}
