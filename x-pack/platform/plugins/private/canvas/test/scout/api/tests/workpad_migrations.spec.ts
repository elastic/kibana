/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Migrated from: x-pack/platform/test/functional/apps/canvas/migrations_smoke_test.ts
 *
 * Intent: verify that importing workpads from previous major versions does not
 * throw a migration error. The FTR version drove this through the Saved Objects
 * Management UI; here we call the SO `_import` API directly — the UI path adds
 * no Canvas-specific coverage.
 *
 * Note: the NDJSON fixtures live at test/scout/api/fixtures/exports/ (copied
 * from x-pack/platform/test/functional/apps/canvas/exports/).
 */

import fs from 'fs';
import path from 'path';
import FormData from 'form-data';
import { expect } from '@kbn/scout/api';
import type { ApiClientFixture, RoleApiCredentials } from '@kbn/scout';
import { apiTest } from '@kbn/scout';
import { testData } from '../fixtures';

const EXPORTS_DIR = path.join(__dirname, '../fixtures/exports');

const importNdjson = async (
  apiClient: ApiClientFixture,
  credentials: RoleApiCredentials,
  filename: string
) => {
  const fileContent = fs.readFileSync(path.join(EXPORTS_DIR, filename));
  const formData = new FormData();
  formData.append('file', fileContent, {
    filename,
    contentType: 'application/ndjson',
  });

  return apiClient.post('api/saved_objects/_import?overwrite=true', {
    headers: {
      ...testData.MULTIPART_HEADERS,
      ...credentials.apiKeyHeader,
      ...formData.getHeaders(),
    },
    body: formData.getBuffer(),
  });
};

apiTest.describe(
  'Canvas workpad migrations — SO _import smoke test',
  { tag: ['@local-stateful-classic'] },
  () => {
    let adminCredentials: RoleApiCredentials;

    apiTest.beforeAll(async ({ requestAuth, kbnClient }) => {
      adminCredentials = await requestAuth.getApiKeyForAdmin();
      // Clean any leftover canvas objects from previous runs
      await kbnClient.savedObjects.clean({ types: ['canvas-workpad', 'canvas-element'] });
    });

    apiTest.afterAll(async ({ kbnClient }) => {
      await kbnClient.savedObjects.clean({ types: ['canvas-workpad', 'canvas-element'] });
    });

    apiTest('imports an 8.2 workpad without migration errors', async ({ apiClient }) => {
      /*
       * In 8.1 Canvas introduced by-value embeddables, which requires expressions
       * to know about embeddable migrations. Starting in 8.3, we were seeing an
       * error during migration where it would appear that an 8.2 workpad was from
       * a future version. This was because there were missing embeddable migrations
       * on the expression because the Canvas plugin was adding the embeddable
       * expression with all of its migrations before other embeddables had
       * registered their own migrations.
       */
      const response = await importNdjson(apiClient, adminCredentials, '8.2.workpad.ndjson');

      expect(response).toHaveStatusCode(200);
      expect(response.body.success).toBe(true);
      expect(response.body.successCount).toBeGreaterThanOrEqual(1);
    });

    apiTest('migrates a workpad from 8.1 without errors', async ({ apiClient }) => {
      /*
       * This workpad from 8.1 has both by-value and by-reference embeddables.
       * Smoke test to ensure migrations do not fail for this shape.
       */
      const response = await importNdjson(
        apiClient,
        adminCredentials,
        '8.1.embeddable_test.ndjson'
      );

      expect(response).toHaveStatusCode(200);
      expect(response.body.success).toBe(true);
      expect(response.body.successCount).toBeGreaterThanOrEqual(1);
    });
  }
);
