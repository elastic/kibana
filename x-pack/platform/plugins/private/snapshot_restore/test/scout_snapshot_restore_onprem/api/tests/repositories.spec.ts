/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import type { RoleApiCredentials } from '@kbn/scout';

import { SNAPSHOT_RESTORE_ADMIN_ROLE } from '../../../scout/common/fixtures/constants';
import { API_BASE_PATH, COMMON_HEADERS } from '../../../scout/api/fixtures/constants';

apiTest.describe(
  'Snapshot and Restore - repositories (on-prem)',
  { tag: ['@local-stateful-classic'] },
  () => {
    let credentials: RoleApiCredentials;

    apiTest.beforeAll(async ({ requestAuth }) => {
      credentials = await requestAuth.getApiKeyForCustomRole(SNAPSHOT_RESTORE_ADMIN_ROLE);
    });

    apiTest('returns the on-prem repository types', async ({ apiClient }) => {
      const response = await apiClient.get(`${API_BASE_PATH}/repository_types`, {
        headers: { ...COMMON_HEADERS, ...credentials.apiKeyHeader },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);

      // The `snapshot_restore_onprem` config set omits `xpack.cloud.id`, so on top of the module
      // repository types the plugin also serves the on-prem file system and url types. That cannot
      // be done on real ECH, hence local only.
      expect(response.body).toStrictEqual(['azure', 'gcs', 's3', 'fs', 'url']);
    });
  }
);
