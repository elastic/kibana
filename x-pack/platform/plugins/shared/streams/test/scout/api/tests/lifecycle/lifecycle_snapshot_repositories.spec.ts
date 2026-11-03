/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import { streamsApiTest as apiTest } from '../../fixtures';
import { COMMON_API_HEADERS } from '../../fixtures/constants';

const REPOSITORY = 'streams_lifecycle_repo';

// File system repositories are forbidden on Cloud, see lifecycle_snapshot_repositories_cloud.spec.ts.
apiTest.describe('Lifecycle - snapshot repositories', { tag: ['@local-stateful-classic'] }, () => {
  apiTest.afterAll(async ({ esClient }) => {
    await esClient.snapshot.deleteRepository({ name: REPOSITORY }, { ignore: [404] });
  });

  apiTest('lists the snapshot repositories', async ({ apiClient, samlAuth, esClient }) => {
    await esClient.snapshot.createRepository({
      name: REPOSITORY,
      repository: { type: 'fs', settings: { location: `/tmp/repo/${REPOSITORY}` } },
      verify: false,
    });
    const { cookieHeader } = await samlAuth.asInteractiveUser('admin');

    const response = await apiClient.get('internal/streams/lifecycle/_snapshot_repositories', {
      headers: { ...COMMON_API_HEADERS, ...cookieHeader },
      responseType: 'json',
    });
    expect(response).toHaveStatusCode(200);
    const repositories = response.body.repositories as Array<{ name: string; type: string }>;
    expect(
      repositories.every(({ name, type }) => typeof name === 'string' && typeof type === 'string')
    ).toBe(true);
    const repository = repositories.find(({ name }) => name === REPOSITORY);
    expect(repository?.type).toBe('fs');
  });
});
