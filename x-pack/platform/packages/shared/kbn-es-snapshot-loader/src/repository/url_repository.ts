/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RepositoryStrategy } from './types';
import { DEFAULT_REPOSITORY_REGISTER_REQUEST_TIMEOUT_MS } from './constants';

export function createUrlRepository(snapshotUrl: string): RepositoryStrategy {
  return {
    type: 'url',
    validate() {
      let url: URL;
      try {
        url = new URL(snapshotUrl);
      } catch {
        throw new Error(`Invalid snapshot URL: ${snapshotUrl}`);
      }

      if (url.protocol !== 'file:') {
        throw new Error(`Only file:// snapshot URLs are supported (received: ${url.protocol})`);
      }
    },
    async register({ esClient, log, repoName }) {
      log.debug(`Connecting to snapshot at ${snapshotUrl}`);

      await esClient.snapshot.createRepository(
        {
          name: repoName,
          master_timeout: '2m',
          timeout: '2m',
          body: { type: 'url', settings: { url: snapshotUrl } },
        },
        { requestTimeout: DEFAULT_REPOSITORY_REGISTER_REQUEST_TIMEOUT_MS }
      );
    },
  };
}
