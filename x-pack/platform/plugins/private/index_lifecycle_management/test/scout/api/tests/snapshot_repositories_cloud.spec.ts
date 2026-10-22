/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import type { RoleApiCredentials } from '@kbn/scout';

import {
  API_BASE_PATH,
  CLOUD_REPOSITORY_NAME,
  ILM_API_ROLE,
  getHeaders,
} from '../fixtures/constants';

// Cloud only: the managed `found-snapshots` repository always exists there. Local is covered in
// snapshot_repositories.spec.ts.
apiTest.describe(
  'Index Lifecycle Management - snapshot repositories (Cloud)',
  { tag: ['@cloud-stateful-classic'] },
  () => {
    let credentials: RoleApiCredentials;

    apiTest.beforeAll(async ({ requestAuth }) => {
      credentials = await requestAuth.getApiKeyForCustomRole(ILM_API_ROLE);
    });

    apiTest('returns the Cloud default repository', async ({ apiClient }) => {
      const response = await apiClient.get(`${API_BASE_PATH}/snapshot_repositories`, {
        headers: getHeaders(credentials),
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      // Other suites may add repositories on a shared deployment, so only check the managed one.
      expect(response.body.repositories).toContain(CLOUD_REPOSITORY_NAME);
    });
  }
);
