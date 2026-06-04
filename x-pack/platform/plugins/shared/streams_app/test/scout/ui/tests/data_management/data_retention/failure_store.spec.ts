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
  openFailureStoreFlyout,
  removeFailureStoreDeletePhase,
  RETENTION_TEST_IDS,
  applyFailedLifecycleFlyout,
  setCustomRetention,
  setFailureStoreRetention,
  toggleFailureStore,
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
    // Ensure logs.otel has a backing data stream (deferred by default) so retention UI renders
    await apiServices.streams.restoreDataStream('logs.otel');
    // Start from a clean child state so a leftover fork from an interrupted run
    // doesn't make the fork below fail with a 409 Conflict.
    await apiServices.streams.clearStreamChildren('logs.otel');
    await apiServices.streams.forkStream('logs.otel', 'logs.otel.nginx', {
      field: 'service.name',
      eq: 'nginx',
    });
    await esClient.indices.putDataStreamOptions(
      {
        name: 'logs.otel.nginx',
        failure_store: {
          enabled: true,
        },
      },
      { meta: true }
    );
  });

  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsAdmin();
  });

  test.afterAll(async ({ logsSynthtraceEsClient, apiServices }) => {
    await apiServices.streams.clearStreamChildren('logs.otel');
    await logsSynthtraceEsClient.clean();
  });

  const STREAM_CONFIGS = [
    {
      label: 'classic streams',
      streamName: 'logs-generic-default' as const,
      isWired: false,
    },
    {
      label: 'wired streams',
      streamName: 'logs.otel.nginx' as const,
      isWired: true,
    },
  ];

  for (const { label, streamName, isWired } of STREAM_CONFIGS) {
    test(
      `should edit failure store successfully for ${label}`,
      { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
      async ({ page, pageObjects }) => {
        await pageObjects.streams.gotoDataRetentionTab(streamName);

        // Ensure the failure store is enabled.
        await toggleFailureStore(page, true);

        await setFailureStoreRetention(page, '7', 'd');
        await verifyRetentionDisplay(page, '7 days', true);
        await expect(
          page.getByTestId(RETENTION_TEST_IDS.failureStoreRetentionMetricSubtitle)
        ).toContainText('2 data phases');
      }
    );

    test(
      `should disable failure store for ${label}`,
      { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
      async ({ page, pageObjects }) => {
        await pageObjects.streams.gotoDataRetentionTab(streamName);

        await toggleFailureStore(page, false);
        await expect(
          page.getByTestId('disabledFailureStorePanel').getByText('Failure store disabled')
        ).toBeVisible();
      }
    );

    test(
      `should enable failure store for ${label}`,
      { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
      async ({ page, pageObjects }) => {
        await pageObjects.streams.gotoDataRetentionTab(streamName);

        // Ensure a consistent starting point (other tests may leave the failure store enabled).
        await toggleFailureStore(page, false);
        await toggleFailureStore(page, true);
        await verifyRetentionDisplay(page, '30 days', true);
        await expect(
          page.getByTestId(RETENTION_TEST_IDS.failureStoreRetentionMetricSubtitle)
        ).toContainText('2 data phases');
      }
    );

    test(
      `should be able to disable lifecycle for ${label}`,
      { tag: tags.stateful.classic },
      async ({ page, pageObjects }) => {
        await pageObjects.streams.gotoDataRetentionTab(streamName);

        // Ensure the failure store is enabled with a delete phase.
        await toggleFailureStore(page, true);

        // Remove the delete phase -> indefinite retention (lifecycle disabled).
        await removeFailureStoreDeletePhase(page);

        // Verify infinite retention is shown
        await expect(
          page.getByTestId(RETENTION_TEST_IDS.failureStoreRetentionMetric).getByText('∞')
        ).toBeVisible();
        await expect(
          page.getByTestId(RETENTION_TEST_IDS.failureStoreRetentionMetricSubtitle)
        ).toContainText('1 data phase');
      }
    );

    if (isWired) {
      test(
        `should inherit failure store for ${label}`,
        { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
        async ({ page, pageObjects }) => {
          await pageObjects.streams.gotoDataRetentionTab(streamName);

          // Ensure failure store is enabled first.
          await toggleFailureStore(page, true);

          // Enable inherit failure store (only wired non-root streams expose this checkbox).
          const flyout = await openFailureStoreFlyout(page);
          const inheritCheckbox = flyout.getByTestId(RETENTION_TEST_IDS.failedInheritCheckbox);
          await expect(inheritCheckbox).toBeVisible();
          await inheritCheckbox.check();
          await applyFailedLifecycleFlyout(page);

          // Inherits the parent's 30 day failure store retention.
          await expect(
            page.getByTestId(RETENTION_TEST_IDS.failureStoreRetentionMetric).getByText('30 days')
          ).toBeVisible();
          await expect(
            page.getByTestId(RETENTION_TEST_IDS.failureStoreRetentionMetricSubtitle)
          ).toContainText('2 data phases');
        }
      );
    }
  }

  test(
    'should not inherit failure store for root wired streams',
    { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
    async ({ page, pageObjects }) => {
      await pageObjects.streams.gotoDataRetentionTab('logs.otel');

      // The inherit checkbox should not be visible for root streams
      const flyout = await openFailureStoreFlyout(page);
      await expect(flyout.getByTestId(RETENTION_TEST_IDS.failedInheritCheckbox)).toBeHidden();
    }
  );

  test(
    'should set failure store retention to different value than main retention',
    { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
    async ({ page, pageObjects }) => {
      await pageObjects.streams.gotoDataRetentionTab('logs-generic-default');

      // Ensure failure store is enabled.
      await toggleFailureStore(page, true);

      // Set main retention to 30 days
      await setCustomRetention(page, '30', 'd');
      await verifyRetentionDisplay(page, '30 days');

      // Set failure store retention to 7 days
      await setFailureStoreRetention(page, '7', 'd');

      // Verify both are set correctly
      await expect(page.getByTestId(RETENTION_TEST_IDS.retentionMetric)).toContainText('30 days');
      await expect(page.getByTestId(RETENTION_TEST_IDS.failureStoreRetentionMetric)).toContainText(
        '7 days'
      );
    }
  );

  test(
    'should persist failure store retention across page reload',
    { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
    async ({ page, pageObjects }) => {
      await pageObjects.streams.gotoDataRetentionTab('logs-generic-default');

      await toggleFailureStore(page, true);
      await setFailureStoreRetention(page, '21', 'd');

      // Reload page
      await pageObjects.streams.gotoDataRetentionTab('logs-generic-default');

      // Verify value persists
      await expect(page.getByTestId(RETENTION_TEST_IDS.failureStoreRetentionMetric)).toContainText(
        '21 days'
      );
    }
  );

  test(
    'should cancel failure store retention edit',
    { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
    async ({ page, pageObjects }) => {
      await pageObjects.streams.gotoDataRetentionTab('logs-generic-default');

      await toggleFailureStore(page, true);

      // Establish a known delete phase so the edit entry point is deterministic.
      await setFailureStoreRetention(page, '14', 'd');

      // Get current value
      const initialRetention = await page
        .getByTestId(RETENTION_TEST_IDS.failureStoreRetentionMetric)
        .textContent();

      // Open the delete phase flyout via the phase popover, change the value but cancel
      const deletePhaseFlyout = page.getByTestId(RETENTION_TEST_IDS.failedDeletePhaseFlyout);
      await page.getByTestId('failureStore-lifecyclePhase-delete-button').click();
      await page.getByTestId('lifecyclePhase-delete-editButton').click();
      await expect(deletePhaseFlyout).toBeVisible();
      await deletePhaseFlyout.getByTestId(RETENTION_TEST_IDS.failedDeletePhaseValue).fill('99');
      await page.getByTestId('streamsEditFailedDeletePhaseFlyoutCancelButton').click();
      await expect(deletePhaseFlyout).toBeHidden();

      // Verify value unchanged
      await expect(page.getByTestId(RETENTION_TEST_IDS.failureStoreRetentionMetric)).toContainText(
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
