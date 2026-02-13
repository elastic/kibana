/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { tags } from '@kbn/scout';
import { test } from '../fixtures';
import { generateLogsData } from '../fixtures/generators';

const TEST_STREAM = 'logs.nginx';
const DATA_VIEW_ID = 'logs-data-view';
const DATA_VIEW_NAME = 'logs-*';

test.describe(
  'Stream metrics embeddable',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.beforeAll(async ({ apiServices, logsSynthtraceEsClient, kbnClient }) => {
      const currentTime = Date.now();
      const generateLogs = generateLogsData(logsSynthtraceEsClient);

      // Create a test stream with routing rules
      await apiServices.streams.forkStream('logs', 'logs.nginx', {
        field: 'service.name',
        eq: 'nginx',
      });

      // Generate some logs for the stream
      await generateLogs({
        index: TEST_STREAM,
        startTime: new Date(currentTime - 60 * 60 * 1000).toISOString(),
        endTime: new Date(currentTime).toISOString(),
        docsPerMinute: 5,
        isMalformed: false,
        defaults: {
          'service.name': 'nginx',
        },
      });

      // Create a data view for Dashboard to use (required to bypass onboarding screen)
      await kbnClient.savedObjects.create({
        type: 'index-pattern',
        id: DATA_VIEW_ID,
        overwrite: true,
        attributes: {
          title: DATA_VIEW_NAME,
          timeFieldName: '@timestamp',
        },
      });

      // Set the default index pattern
      await kbnClient.uiSettings.update({
        defaultIndex: DATA_VIEW_ID,
      });
    });

    test.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsAdmin();
      await pageObjects.dashboard.goto();
      await pageObjects.dashboard.openNewDashboard();
    });

    test.afterAll(async ({ apiServices, logsSynthtraceEsClient, kbnClient }) => {
      // Clear existing rules (this also deletes children streams)
      await apiServices.streams.clearStreamChildren('logs');
      // Try to clean up the test stream (may already be deleted by clearStreamChildren)
      try {
        await apiServices.streams.deleteStream(TEST_STREAM);
      } catch {
        // Ignore if already deleted
      }
      // Clean up synthetic logs
      await logsSynthtraceEsClient.clean();
      // Clean up the data view
      try {
        await kbnClient.savedObjects.delete({
          type: 'index-pattern',
          id: DATA_VIEW_ID,
        });
      } catch {
        // Ignore if already deleted
      }
      // Reset default index
      await kbnClient.uiSettings.update({
        defaultIndex: '',
      });
    });

    test('shows Stream metrics panel in the add panel flyout', async ({ page, pageObjects }) => {
      await pageObjects.dashboard.openAddPanelFlyout();

      // Search for the stream metrics panel
      await page.testSubj.locator('dashboardPanelSelectionFlyout__searchInput').fill('Stream');

      // Verify the Streams group exists
      await expect(page.testSubj.locator('dashboardEditorMenu-streamsGroup')).toBeVisible();

      // Verify the Stream metrics action is visible
      await expect(page.testSubj.locator('create-action-Stream metrics')).toBeVisible();
    });

    test('opens configuration flyout when adding Stream metrics panel', async ({
      page,
      pageObjects,
    }) => {
      await pageObjects.dashboard.openAddPanelFlyout();

      // Click on Stream metrics in the add panel flyout
      await page.testSubj.locator('dashboardPanelSelectionFlyout__searchInput').fill('Stream');
      await page.testSubj.click('create-action-Stream metrics');

      // Verify configuration flyout opens
      await expect(page.testSubj.locator('streamMetricsConfiguration')).toBeVisible();

      // Verify stream selector is present
      await expect(page.testSubj.locator('streamMetricsStreamSelector')).toBeVisible();

      // Cancel the flyout
      await page.testSubj.locator('streamMetricsCancelButton').click();
      await expect(page.testSubj.locator('streamMetricsConfiguration')).toBeHidden();
    });

    test('can configure and add a Stream metrics panel to the dashboard', async ({
      page,
      pageObjects,
    }) => {
      await pageObjects.dashboard.openAddPanelFlyout();

      // Click on Stream metrics in the add panel flyout
      await page.testSubj.locator('dashboardPanelSelectionFlyout__searchInput').fill('Stream');
      await page.testSubj.click('create-action-Stream metrics');

      // Wait for configuration flyout
      await expect(page.testSubj.locator('streamMetricsConfiguration')).toBeVisible();

      // Open the stream selector combo box
      await page.testSubj.click('streamMetricsStreamSelector > comboBoxSearchInput');

      // Wait for stream options to load and select the test stream
      await page
        .getByTestId('comboBoxOptionsList streamMetricsStreamSelector-optionsList')
        .locator(`button:has-text("${TEST_STREAM}")`)
        .click();

      // Confirm the selection
      await page.testSubj.locator('streamMetricsConfirmButton').click();

      // Verify configuration flyout closes
      await expect(page.testSubj.locator('streamMetricsConfiguration')).toBeHidden();

      // Verify the panel is added to the dashboard
      await expect(page.testSubj.locator('embeddablePanel')).toBeVisible();
    });

    test('Stream metrics panel displays metrics for the configured stream', async ({
      page,
      pageObjects,
    }) => {
      await pageObjects.dashboard.openAddPanelFlyout();

      // Add Stream metrics panel
      await page.testSubj.locator('dashboardPanelSelectionFlyout__searchInput').fill('Stream');
      await page.testSubj.click('create-action-Stream metrics');

      // Configure with test stream
      await expect(page.testSubj.locator('streamMetricsConfiguration')).toBeVisible();
      await page.testSubj.click('streamMetricsStreamSelector > comboBoxSearchInput');
      await page
        .getByTestId('comboBoxOptionsList streamMetricsStreamSelector-optionsList')
        .locator(`button:has-text("logs.nginx")`)
        .click();
      await page.testSubj.locator('streamMetricsConfirmButton').click();

      // Wait for the panel to render
      await expect(page.testSubj.locator('embeddablePanel')).toBeVisible();

      // Verify metrics labels are displayed
      // Note: Using text matching since these are displayed in metric cards
      await expect(page.getByText('Retention')).toBeVisible();
      await expect(page.getByText('Storage Size')).toBeVisible();
      await expect(page.getByText('Ingest Rate')).toBeVisible();
      await expect(page.getByText('Data Quality')).toBeVisible();

      // Verify chart section is displayed
      await expect(page.getByText('Ingestion over time')).toBeVisible();
    });

    test('shows error state for unconfigured panel', async ({ page, pageObjects }) => {
      await pageObjects.dashboard.openAddPanelFlyout();

      // Add Stream metrics panel
      await page.testSubj.locator('dashboardPanelSelectionFlyout__searchInput').fill('Stream');
      await page.testSubj.click('create-action-Stream metrics');

      // Try to save without selecting a stream
      await expect(page.testSubj.locator('streamMetricsConfiguration')).toBeVisible();

      // Verify the confirm button is disabled when no stream is selected
      const confirmButton = page.testSubj.locator('streamMetricsConfirmButton');
      await expect(confirmButton).toBeDisabled();
    });

    test('validates stream selection before allowing save', async ({ page, pageObjects }) => {
      await pageObjects.dashboard.openAddPanelFlyout();

      // Add Stream metrics panel
      await page.testSubj.locator('dashboardPanelSelectionFlyout__searchInput').fill('Stream');
      await page.testSubj.click('create-action-Stream metrics');

      // Configuration flyout should be open
      await expect(page.testSubj.locator('streamMetricsConfiguration')).toBeVisible();

      // Initially confirm button should be disabled (no stream selected)
      await expect(page.testSubj.locator('streamMetricsConfirmButton')).toBeDisabled();

      // Select a stream
      await page.testSubj.click('streamMetricsStreamSelector > comboBoxSearchInput');
      await page
        .getByTestId('comboBoxOptionsList streamMetricsStreamSelector-optionsList')
        .locator(`button:has-text("logs.nginx")`)
        .click();

      // Now confirm button should be enabled
      await expect(page.testSubj.locator('streamMetricsConfirmButton')).toBeEnabled();
    });
  }
);
