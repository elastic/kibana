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
const WIRED_STREAM = 'logs.otel';

test.describe(
  'Advanced tab permissions',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.beforeAll(async ({ apiServices, logsSynthtraceEsClient }) => {
      await generateLogsData(logsSynthtraceEsClient)({ index: CLASSIC_STREAM });
      await apiServices.streams.restoreDataStream(WIRED_STREAM);
    });

    test.afterAll(async ({ apiServices, logsSynthtraceEsClient }) => {
      await apiServices.streams.deleteStream(CLASSIC_STREAM);
      await logsSynthtraceEsClient.clean();
    });

    // Classic streams
    test('should NOT show Advanced tab for viewer role on classic stream', async ({
      browserAuth,
      pageObjects,
      page,
    }) => {
      await pageObjects.streams.gotoDataRetentionTab(CLASSIC_STREAM);
      await browserAuth.loginAsViewer();
      await pageObjects.streams.gotoDataRetentionTab(CLASSIC_STREAM);

      await expect(page.getByRole('tab', { name: 'Advanced' })).toBeHidden();
    });

    test('should NOT show Advanced tab for editor role on classic stream', async ({
      browserAuth,
      pageObjects,
      page,
    }) => {
      await pageObjects.streams.gotoDataRetentionTab(CLASSIC_STREAM);
      await browserAuth.loginAs('editor');
      await pageObjects.streams.gotoDataRetentionTab(CLASSIC_STREAM);

      await expect(page.getByRole('tab', { name: 'Advanced' })).toBeHidden();
    });

    test('should show Advanced tab for admin role on classic stream', async ({
      browserAuth,
      page,
      pageObjects,
    }) => {
      await pageObjects.streams.gotoDataRetentionTab(CLASSIC_STREAM);
      await browserAuth.loginAsAdmin();
      await pageObjects.streams.gotoDataRetentionTab(CLASSIC_STREAM);

      await expect(page.getByRole('tab', { name: 'Advanced' })).toBeVisible();
      await pageObjects.streams.verifyClassicBadge();
    });

    // Wired streams
    test('should NOT show Advanced tab for viewer role on wired stream', async ({
      browserAuth,
      page,
      pageObjects,
    }) => {
      await pageObjects.streams.gotoDataRetentionTab(WIRED_STREAM);
      await browserAuth.loginAsViewer();
      await pageObjects.streams.gotoDataRetentionTab(WIRED_STREAM);

      await expect(page.getByRole('tab', { name: 'Advanced' })).toBeHidden();
    });

    test('should NOT show Advanced tab for editor role on wired stream', async ({
      browserAuth,
      page,
      pageObjects,
    }) => {
      await pageObjects.streams.gotoDataRetentionTab(WIRED_STREAM);
      await browserAuth.loginAs('editor');
      await pageObjects.streams.gotoDataRetentionTab(WIRED_STREAM);

      await expect(page.getByRole('tab', { name: 'Advanced' })).toBeHidden();
    });

    test('should show Advanced tab for admin role on wired stream', async ({
      browserAuth,
      page,
      pageObjects,
    }) => {
      await pageObjects.streams.gotoDataRetentionTab(WIRED_STREAM);
      await browserAuth.loginAsAdmin();
      await pageObjects.streams.gotoDataRetentionTab(WIRED_STREAM);

      await expect(page.getByRole('tab', { name: 'Advanced' })).toBeVisible();
    });
  }
);
