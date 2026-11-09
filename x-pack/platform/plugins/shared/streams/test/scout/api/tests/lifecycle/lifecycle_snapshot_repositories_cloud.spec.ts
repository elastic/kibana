/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import { streamsApiTest as apiTest } from '../../fixtures';
import { COMMON_API_HEADERS } from '../../fixtures/constants';

// The managed `found-snapshots` repository always exists on Cloud. Local is covered in
// lifecycle_snapshot_repositories.spec.ts.
apiTest.describe(
  'Lifecycle - snapshot repositories (Cloud)',
  { tag: ['@cloud-stateful-classic'] },
  () => {
    apiTest('lists the Cloud default repository', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');

      const response = await apiClient.get('internal/streams/lifecycle/_snapshot_repositories', {
        headers: { ...COMMON_API_HEADERS, ...cookieHeader },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);
      const repository = (response.body.repositories as Array<{ name: string; type: string }>).find(
        ({ name }) => name === 'found-snapshots'
      );
      expect(repository).toBeDefined();
      expect(repository?.type).not.toBe('');
    });
  }
);
