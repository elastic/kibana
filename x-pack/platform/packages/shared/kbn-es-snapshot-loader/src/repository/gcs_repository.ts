/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RepositoryStrategy } from './types';

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
      await esClient.snapshot.createRepository({
        name: repoName,
        body: {
          type: 'gcs',
          settings: {
            bucket: config.bucket,
            ...(config.basePath && { base_path: config.basePath }),
            ...(config.client && { client: config.client }),
          },
        },
      });
    },
  };
}
