/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { tags } from '@kbn/scout';
import { test } from '../../../fixtures';
import { generateLogsData } from '../../../fixtures/generators';
import {
  openRetentionModal,
  saveRetentionChanges,
  setCustomRetention,
  setFailureStoreRetention,
  toggleFailureStore,
  toggleInheritSwitch,
  verifyRetentionDisplay,
} from '../../../fixtures/retention_helpers';

test.describe('Stream data retention - updating failure store', () => {
  test.beforeAll(async ({ apiServices, logsSynthtraceEsClient, esClient }) => {
    await generateLogsData(logsSynthtraceEsClient)({ index: 'logs-generic-default' });
    await esClient.indices.putDataStreamOptions(
      {
        name: 'logs-generic-default',
        failure_store: {
          enabled: true,
        },
      },
      { meta: true }
    );
    await apiServices.streams.forkStream('logs', 'logs.nginx', {
      field: 'service.name',
      eq: 'nginx',
    });
    await esClient.indices.putDataStreamOptions(
      {
        name: 'logs.nginx',
        failure_store: {
          enabled: true,
        },
      },
      { meta: true }
    );
  });

  test.beforeEach(async ({ apiServices, browserAuth }) => {
    await browserAuth.loginAsAdmin();
    // Clear existing processors before each test
    await apiServices.streams.clearStreamProcessors('logs-generic-default');
  });

  test.afterAll(async ({ logsSynthtraceEsClient, apiServices }) => {
    await apiServices.streams.clearStreamChildren('logs');
    await logsSynthtraceEsClient.clean();
  });

  test(
    'should edit failure store successfully for classic streams',
    { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
    async ({ page, pageObjects }) => {
      await pageObjects.streams.gotoDataRetentionTab('logs-generic-default');

      await setFailureStoreRetention(page, '7', 'd');
      await verifyRetentionDisplay(page, '7 days', true);
      await expect(
        page
          .getByTestId('failureStoreRetention-metric-subtitle')
          .getByText('Custom retention period')
      ).toBeVisible();
    }
  );

  test(
    'should disable failure store for classic streams',
    { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
    async ({ page, pageObjects }) => {
      await pageObjects.streams.gotoDataRetentionTab('logs-generic-default');

      await toggleFailureStore(page, false);
      await expect(
        page.getByTestId('disabledFailureStorePanel').getByText('Failure store disabled')
      ).toBeVisible();
    }
  );

  test(
    'should enable failure store for classic streams',
    { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
    async ({ page, pageObjects }) => {
      await pageObjects.streams.gotoDataRetentionTab('logs-generic-default');

      await toggleFailureStore(page, true);
      await verifyRetentionDisplay(page, '30 days', true);
      await expect(
        page
          .getByTestId('failureStoreRetention-metric-subtitle')
          .getByText('Default retention period')
      ).toBeVisible();
    }
  );

  test(
    'should be able to disable lifecycle for classic if is not serverless',
    { tag: tags.stateful.classic },
    async ({ page, pageObjects }) => {
      await pageObjects.streams.gotoDataRetentionTab('logs-generic-default');

      await page.getByTestId('streamFailureStoreEditRetention').click();

      // The disable lifecycle option should be visible on ESS
      await expect(page.getByTestId('disabledLifecycle')).toBeVisible();

      // Enable disable lifecycle
      await page.getByTestId('disabledLifecycle').click();
      await page.getByTestId('failureStoreModalSaveButton').click();

      // Verify infinite retention is shown
      await expect(page.getByTestId('failureStoreRetention-metric').getByText('∞')).toBeVisible();
      await expect(
        page.getByTestId('failureStoreRetention-metric-subtitle').getByText('Indefinite retention')
      ).toBeVisible();
    }
  );

  test(
    'should inherit failure store for classic streams',
    { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
    async ({ page, pageObjects }) => {
      await pageObjects.streams.gotoDataRetentionTab('logs-generic-default');

      // Enable inherit failure store
      await page.getByTestId('streamFailureStoreEditRetention').click();
      await page.getByTestId('inheritFailureStoreSwitch').click();
      await page.getByTestId('failureStoreModalSaveButton').click();
      await expect(
        page.getByTestId('failureStoreRetention-metric').getByText('30 days')
      ).toBeVisible();
      await expect(
        page
          .getByTestId('failureStoreRetention-metric-subtitle')
          .getByText('Inherit from index template')
      ).toBeVisible();
    }
  );

  test(
    'should edit failure store successfully for wired streams',
    { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
    async ({ page, pageObjects }) => {
      await pageObjects.streams.gotoDataRetentionTab('logs.nginx');

      await setFailureStoreRetention(page, '7', 'd');
      await verifyRetentionDisplay(page, '7 days', true);
      await expect(
        page
          .getByTestId('failureStoreRetention-metric-subtitle')
          .getByText('Custom retention period')
      ).toBeVisible();
    }
  );

  test(
    'should disable failure store for wired streams',
    { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
    async ({ page, pageObjects }) => {
      await pageObjects.streams.gotoDataRetentionTab('logs.nginx');

      // Disable failure store
      await page.getByTestId('streamFailureStoreEditRetention').click();
      await page.getByTestId('enableFailureStoreToggle').click();
      await page.getByTestId('failureStoreModalSaveButton').click();
      await expect(
        page.getByTestId('disabledFailureStorePanel').getByText('Failure store disabled')
      ).toBeVisible();
    }
  );

  test(
    'should enable failure store for wired streams',
    { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
    async ({ page, pageObjects }) => {
      await pageObjects.streams.gotoDataRetentionTab('logs.nginx');

      // Enable failure store again
      await page.getByTestId('streamsAppFailureStoreEnableButton').click();
      await page.getByTestId('enableFailureStoreToggle').click();
      await page.getByTestId('failureStoreModalSaveButton').click();
      await expect(
        page.getByTestId('failureStoreRetention-metric').getByText('30 days')
      ).toBeVisible();
      await expect(
        page
          .getByTestId('failureStoreRetention-metric-subtitle')
          .getByText('Default retention period')
      ).toBeVisible();
    }
  );

  test(
    'should be able to disable lifecycle for wired streams on ESS',
    { tag: tags.stateful.classic },
    async ({ page, pageObjects }) => {
      await pageObjects.streams.gotoDataRetentionTab('logs.nginx');

      await page.getByTestId('streamFailureStoreEditRetention').click();

      // The disable lifecycle option should be visible on ESS
      await expect(page.getByTestId('disabledLifecycle')).toBeVisible();

      // Enable disable lifecycle
      await page.getByTestId('disabledLifecycle').click();
      await page.getByTestId('failureStoreModalSaveButton').click();

      // Verify infinite retention is shown
      await expect(page.getByTestId('failureStoreRetention-metric').getByText('∞')).toBeVisible();
      await expect(
        page.getByTestId('failureStoreRetention-metric-subtitle').getByText('Indefinite retention')
      ).toBeVisible();
    }
  );

  test(
    'should inherit failure store for child wired streams',
    { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
    async ({ page, pageObjects }) => {
      await pageObjects.streams.gotoDataRetentionTab('logs.nginx');

      // Enable inherit failure store
      await page.getByTestId('streamFailureStoreEditRetention').click();
      await page.getByTestId('inheritFailureStoreSwitch').click();
      await page.getByTestId('failureStoreModalSaveButton').click();
      await expect(
        page.getByTestId('failureStoreRetention-metric').getByText('30 days')
      ).toBeVisible();
      await expect(
        page.getByTestId('failureStoreRetention-metric-subtitle').getByText('Inherit from parent')
      ).toBeVisible();
    }
  );

  test(
    'should not inherit failure store for root wired streams',
    { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
    async ({ page, pageObjects }) => {
      await pageObjects.streams.gotoDataRetentionTab('logs');

      // Try to enable inherit failure store - the switch should not be visible for root streams
      await page.getByTestId('streamFailureStoreEditRetention').click();
      await expect(page.getByTestId('inheritFailureStoreSwitch')).toBeHidden();
    }
  );

  test(
    'should set failure store retention to different value than main retention',
    { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
    async ({ page, pageObjects }) => {
      await pageObjects.streams.gotoDataRetentionTab('logs-generic-default');

      // Set main retention to 30 days
      await openRetentionModal(page);
      await toggleInheritSwitch(page, false);
      await setCustomRetention(page, '30', 'd');
      await saveRetentionChanges(page);
      await verifyRetentionDisplay(page, '30 days');

      // Set failure store retention to 7 days
      await setFailureStoreRetention(page, '7', 'd');

      // Verify both are set correctly
      await expect(page.getByTestId('retention-metric')).toContainText('30 days');
      await expect(page.getByTestId('failureStoreRetention-metric')).toContainText('7 days');
    }
  );

  test(
    'should persist failure store retention across page reload',
    { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
    async ({ page, pageObjects }) => {
      await pageObjects.streams.gotoDataRetentionTab('logs-generic-default');

      await setFailureStoreRetention(page, '21', 'd');

      // Reload page
      await pageObjects.streams.gotoDataRetentionTab('logs-generic-default');

      // Verify value persists
      await expect(page.getByTestId('failureStoreRetention-metric')).toContainText('21 days');
    }
  );

  test(
    'should cancel failure store retention edit',
    { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
    async ({ page, pageObjects }) => {
      await pageObjects.streams.gotoDataRetentionTab('logs-generic-default');

      // Get current value
      const initialRetention = await page.getByTestId('failureStoreRetention-metric').textContent();

      // Open modal and change value but cancel
      await page.getByTestId('streamFailureStoreEditRetention').click();
      await page.getByTestId('custom').click();
      const dialog = page.getByRole('dialog');
      await dialog.getByTestId('selectFailureStorePeriodValue').fill('99');
      await page.getByTestId('failureStoreModalCancelButton').click();

      // Verify value unchanged
      await expect(page.getByTestId('failureStoreRetention-metric')).toContainText(
        initialRetention || ''
      );
    }
  );

  test(
    'should show failure store disabled state',
    { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
    async ({ page, pageObjects }) => {
      await pageObjects.streams.gotoDataRetentionTab('logs-generic-default');

      await toggleFailureStore(page, false);

      await expect(page.getByTestId('disabledFailureStorePanel')).toBeVisible();
      await expect(page.getByText('Failure store disabled')).toBeVisible();
    }
  );
});
