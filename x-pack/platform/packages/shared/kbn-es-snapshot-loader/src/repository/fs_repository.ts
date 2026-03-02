/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RepositoryStrategy } from './types';

export interface FsRepositoryConfig {
  location: string;
  compress?: boolean;
}

export function createFsRepository(config: FsRepositoryConfig): RepositoryStrategy {
  return {
    type: 'fs',
    validate() {
      if (!config.location.trim()) {
        throw new Error('FS repository location is required');
      }
    },
    async register({ esClient, repoName }) {
      await esClient.snapshot.createRepository({
        name: repoName,
        body: {
          type: 'fs',
          settings: {
            location: config.location,
            ...(config.compress !== undefined ? { compress: config.compress } : {}),
          },
        },
      });
    },
  };
}
