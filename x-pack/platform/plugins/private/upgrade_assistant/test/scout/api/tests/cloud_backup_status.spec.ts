/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CookieHeader } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { apiTest, testData } from '../fixtures';
import {
  createCloudRepository,
  createCloudSnapshot,
  deleteCloudSnapshot,
  getAdminCookieHeader,
} from '../fixtures/helpers';

// All Upgrade Assistant API tests remain skipped until Kibana has a stable way to test them.
// See https://github.com/elastic/kibana/issues/266002.
apiTest.describe.skip(
  'Upgrade Assistant cloud backup status API',
  { tag: testData.UPGRADE_ASSISTANT_API_LOCAL_TAGS },
  () => {
    let adminCookieHeader: CookieHeader;
    let mostRecentSnapshotStartTime: string | number | Date | undefined;

    apiTest.beforeAll(async ({ samlAuth }) => {
      adminCookieHeader = await getAdminCookieHeader(samlAuth);
    });

    apiTest.afterAll(async ({ esClient }) => {
      await deleteCloudSnapshot(esClient, 'test_snapshot_1').catch(() => undefined);
      await deleteCloudSnapshot(esClient, 'test_snapshot_2').catch(() => undefined);
    });

    apiTest('returns status based on the most recent snapshot', async ({ apiClient, esClient }) => {
      await createCloudRepository(esClient);
      await createCloudSnapshot(esClient, 'test_snapshot_1');
      const mostRecentSnapshot = await createCloudSnapshot(esClient, 'test_snapshot_2');
      mostRecentSnapshotStartTime = mostRecentSnapshot.snapshot?.start_time;

      const response = await apiClient.get(`${testData.API_BASE_PATH}/cloud_backup_status`, {
        headers: { ...testData.COMMON_HEADERS, ...adminCookieHeader },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.isBackedUp).toBe(true);
      expect(response.body.lastBackupTime).toBe(mostRecentSnapshotStartTime);
    });

    apiTest('returns not-backed-up status without backups present', async ({ apiClient }) => {
      const response = await apiClient.get(`${testData.API_BASE_PATH}/cloud_backup_status`, {
        headers: { ...testData.COMMON_HEADERS, ...adminCookieHeader },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.isBackedUp).toBe(false);
      expect(response.body.lastBackupTime).toBeUndefined();
    });
  }
);
