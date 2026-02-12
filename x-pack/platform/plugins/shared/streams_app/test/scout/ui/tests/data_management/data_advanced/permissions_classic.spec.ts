/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../../../fixtures';
import { generateLogsData } from '../../../fixtures/generators';

const CLASSIC_STREAM = 'logs-classic-permissions-test';

test.describe(
  'Advanced tab permissions - Classic streams',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.beforeAll(async ({ logsSynthtraceEsClient }) => {
      // Generate logs to create a classic stream
      await generateLogsData(logsSynthtraceEsClient)({ index: CLASSIC_STREAM });
    });

    test.afterAll(async ({ apiServices, logsSynthtraceEsClient }) => {
      await apiServices.streams.deleteStream(CLASSIC_STREAM);
      await logsSynthtraceEsClient.clean();
    });

    test('should NOT show Advanced tab for viewer role on classic stream', async ({
      browserAuth,
      pageObjects,
      page,
    }) => {
      await browserAuth.loginAsViewer();
      await pageObjects.streams.gotoDataRetentionTab(CLASSIC_STREAM);

      // Verify the Advanced tab is not visible for viewer
      await expect(page.getByRole('tab', { name: 'Advanced' })).toBeHidden();
    });

    test('should NOT show Advanced tab for editor role on classic stream', async ({
      browserAuth,
      pageObjects,
      page,
    }) => {
      await browserAuth.loginAs('editor');
      await pageObjects.streams.gotoDataRetentionTab(CLASSIC_STREAM);

      // Verify the Advanced tab is not visible for editor
      await expect(page.getByRole('tab', { name: 'Advanced' })).toBeHidden();
    });

    test('should show Advanced tab for admin role on classic stream', async ({
      browserAuth,
      pageObjects,
      page,
    }) => {
      await browserAuth.loginAsAdmin();
      await pageObjects.streams.gotoAdvancedTab(CLASSIC_STREAM);

      // Verify the Advanced tab is visible for admin
      await expect(page.getByRole('tab', { name: 'Advanced' })).toBeVisible();
      // Verify we're on the classic stream by checking the classic badge
      await pageObjects.streams.verifyClassicBadge();
    });
  }
);
