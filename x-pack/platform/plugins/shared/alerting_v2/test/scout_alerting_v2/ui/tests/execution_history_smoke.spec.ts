/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';

/*
 * Custom-role auth (`browserAuth.loginWithCustomRole`) is not yet supported on
 * Elastic Cloud Hosted, so this suite only runs on local stateful (classic)
 * until ECH support lands.
 */
test.describe('Execution history — smoke', { tag: '@local-stateful-classic' }, () => {
  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsAlertingV2Viewer();
  });

  test('loads the page and shows the empty state when there are no events', async ({
    page,
    pageObjects,
  }) => {
    await pageObjects.executionHistory.goto();

    await test.step('URL is the execution_history app path', async () => {
      expect(page.url()).toContain('/app/management/alertingV2/execution_history');
    });

    await test.step('page header is visible', async () => {
      await expect(page.getByRole('heading', { name: /execution history/i })).toBeVisible();
    });

    await test.step('empty state copy is visible', async () => {
      await expect(pageObjects.executionHistory.emptyPrompt).toBeVisible();
    });
  });
});
