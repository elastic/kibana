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
import {
  getQualityIssueRow,
  openDegradedFieldFlyout,
  saveFailureStoreChanges,
  waitForFailedDocsCard,
  waitForQualityIssuesTable,
} from '../fixtures/data_quality_helpers';

const TEST_STREAM = 'logs-nginx-default';
const FORKED_STREAM = 'logs.otel.nginx';
const DEGRADED_FIELD = 'log.level';

test.describe(
  'Stream data quality',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.beforeAll(async ({ apiServices, esClient, logsSynthtraceEsClient }) => {
      const currentTime = Date.now();
      const generateLogs = generateLogsData(logsSynthtraceEsClient);

      // Create a test stream with routing rules first
      await apiServices.streams.forkStream('logs.otel', FORKED_STREAM, {
        field: 'service.name',
        eq: 'nginx',
      });

      // Generate some normal logs
      await generateLogs({
        index: TEST_STREAM,
        startTime: new Date(currentTime - 5 * 60 * 1000).toISOString(),
        endTime: new Date(currentTime).toISOString(),
        docsPerMinute: 10,
        isMalformed: false,
      });

      // Generate some malformed logs to create degraded fields
      await generateLogs({
        index: TEST_STREAM,
        startTime: new Date(currentTime - 60 * 1000).toISOString(),
        endTime: new Date(currentTime).toISOString(),
        docsPerMinute: 1,
        isMalformed: true,
      });

      // Add a processor that always fails to create failed docs, and enable the failure store so
      // those docs are stored instead of dropped: classic streams inherit it from the index
      // template, which enables it on stateful but not on serverless
      const { stream } = await apiServices.streams.getStreamDefinition(TEST_STREAM);
      await apiServices.streams.updateStream(TEST_STREAM, {
        ingest: {
          ...stream.ingest,
          processing: {
            steps: [
              {
                action: 'rename',
                from: 'non_existent_field',
                to: 'renamed_field',
                ignore_missing: false,
                override: false,
              },
            ],
          },
          failure_store: { lifecycle: { enabled: {} } },
        },
      });

      // Add 1 failed doc
      await generateLogs({
        index: TEST_STREAM,
        startTime: new Date(currentTime - 60 * 1000).toISOString(),
        endTime: new Date(currentTime).toISOString(),
        docsPerMinute: 1,
      });

      // The failure store is a separate index that the synthtrace refresh doesn't cover and that
      // refreshes on its own interval (30s on serverless), so refresh it until the failed document
      // is searchable for the UI
      const failureStoreIndex = `${TEST_STREAM}::failures`;
      await expect
        .poll(
          async () => {
            await esClient.indices.refresh({
              index: failureStoreIndex,
              allow_no_indices: true,
              ignore_unavailable: true,
            });
            const { count } = await esClient.count({
              index: failureStoreIndex,
              allow_no_indices: true,
              ignore_unavailable: true,
            });
            return count;
          },
          { timeout: 60_000 }
        )
        .toBeGreaterThan(0);
    });

    test.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsAdmin();
      await pageObjects.streams.gotoDataQualityTab(TEST_STREAM);
    });

    test.afterAll(async ({ apiServices, logsSynthtraceEsClient }) => {
      // Delete only the fork this suite created, so unrelated children of the shared
      // `logs.otel` root are left untouched
      await apiServices.streams.deleteStream(FORKED_STREAM);
      // Clean up the test stream
      await apiServices.streams.deleteStream(TEST_STREAM);
      // Clean up synthetic logs
      await logsSynthtraceEsClient.clean();
    });

    test('should show data quality metrics', async ({ page }) => {
      // Degraded and failed documents metrics should be visible
      await expect(
        page.getByTestId('datasetQualityDetailsSummaryKpiCard-Degraded documents')
      ).toBeVisible();
      const failedDocsCard = await waitForFailedDocsCard(page);

      // Edit failure store button should be visible for wired streams
      await failedDocsCard.click();
      await expect(page.getByTestId('datasetQualityDetailsEditFailureStore')).toBeVisible();

      // Quality issues table should be visible
      await expect(page.getByTestId('datasetQualityDetailsDegradedFieldTable')).toBeVisible();
    });

    test('date picker should show same time range as Streams Main page', async ({
      pageObjects,
    }) => {
      // Go to Main page
      await pageObjects.streams.gotoStreamMainPage();
      await pageObjects.streams.expectStreamsTableVisible();
      const mainTimeRange = {
        from: 'Sep 20, 2023 @ 00:00:00.000',
        to: 'Sep 20, 2023 @ 00:30:00.000',
      };
      // Change date picker
      await pageObjects.datePicker.setAbsoluteRange(mainTimeRange);

      // Go to Data Quality tab
      await pageObjects.streams.clickStreamNameLink(FORKED_STREAM);
      await pageObjects.streams.clickDataQualityTab();
      await pageObjects.streams.verifyDatePickerTimeRange(mainTimeRange);
    });

    test('changing time range should also update date picker on Streams Main page', async ({
      pageObjects,
    }) => {
      const dataQualityTimeRange = {
        from: 'Sep 20, 2023 @ 00:00:00.000',
        to: 'Sep 20, 2023 @ 00:30:00.000',
      };
      await pageObjects.datePicker.setAbsoluteRange(dataQualityTimeRange);

      // Go to Streams main page
      await pageObjects.streams.backToStreamsMainPage();
      await pageObjects.streams.verifyDatePickerTimeRange(dataQualityTimeRange);
    });

    test('time range should persist after page refresh on Data Quality tab', async ({
      page,
      pageObjects,
    }) => {
      const timeRange = {
        from: 'Sep 20, 2023 @ 00:00:00.000',
        to: 'Sep 20, 2023 @ 00:30:00.000',
      };
      // Set time range
      await pageObjects.datePicker.setAbsoluteRange(timeRange);

      // Refresh the page
      await page.reload();

      // Verify time range persisted after refresh
      await pageObjects.streams.verifyDatePickerTimeRange(timeRange);
    });

    test('time range should persist after page refresh on Retention tab', async ({
      page,
      pageObjects,
    }) => {
      const timeRange = {
        from: 'Sep 20, 2023 @ 00:00:00.000',
        to: 'Sep 20, 2023 @ 00:30:00.000',
      };
      // Go to Retention tab
      await pageObjects.streams.clickRetentionTab();
      // Scroll to date picker within the first ingestion rate panel
      // eslint-disable-next-line playwright/no-nth-methods
      const firstIngestionRatePanel = page.testSubj.locator('ingestionRatePanel').first();
      await expect(firstIngestionRatePanel).toBeVisible();
      await firstIngestionRatePanel.scrollIntoViewIfNeeded();

      // Set time range within the ingestion rate panel container
      await pageObjects.datePicker.setAbsoluteRangeInRootContainer({
        to: timeRange.to,
        from: timeRange.from,
        containerLocator: firstIngestionRatePanel,
      });

      // Verify time range is displayed correctly on Retention tab
      await pageObjects.streams.verifyDatePickerTimeRange(timeRange);

      // Refresh the page
      await page.reload();

      // Verify time range persisted after refresh
      await pageObjects.streams.verifyDatePickerTimeRange(timeRange);
    });

    test('time range should be globally synced across all tabs', async ({ pageObjects }) => {
      const timeRange = {
        from: 'Sep 20, 2023 @ 00:00:00.000',
        to: 'Sep 20, 2023 @ 00:30:00.000',
      };

      // Set time on Data Quality tab
      await pageObjects.datePicker.setAbsoluteRange(timeRange);

      // Verify on Retention tab
      await pageObjects.streams.clickRetentionTab();
      await pageObjects.streams.verifyDatePickerTimeRange(timeRange);

      // Verify on Main page
      await pageObjects.streams.backToStreamsMainPage();
      await pageObjects.streams.verifyDatePickerTimeRange(timeRange);

      // Navigate to a different stream and verify time persists
      await pageObjects.streams.clickStreamNameLink(FORKED_STREAM);
      await pageObjects.streams.clickDataQualityTab();
      await pageObjects.streams.verifyDatePickerTimeRange(timeRange);
    });

    test('should toggle between degraded and failed docs quality issues charts', async ({
      page,
    }) => {
      // Default chart should be for degraded docs
      await expect(page.getByTestId('datasetQualityDetailsLinkToDiscover')).toBeVisible();

      // Click to show failed docs chart
      const failedDocsCard = await waitForFailedDocsCard(page);
      await failedDocsCard.click();
      await expect(failedDocsCard).toHaveAttribute('aria-pressed', 'true');
    });

    test('should show degraded fields table with data', async ({ page }) => {
      // Quality issues table should be visible
      const degradedFieldTable = await waitForQualityIssuesTable(page, DEGRADED_FIELD);

      // Should show table headers (scope to the table to avoid ambiguity)
      await expect(degradedFieldTable.getByRole('columnheader', { name: 'Field' })).toBeVisible();
      await expect(
        degradedFieldTable.getByRole('columnheader', { name: 'Documents' })
      ).toBeVisible();
      await expect(degradedFieldTable.getByRole('columnheader', { name: 'Issue' })).toBeVisible();
      await expect(
        degradedFieldTable.getByRole('columnheader', { name: 'Last occurred' })
      ).toBeVisible();

      // Verify there is at least one degraded field row
      const degradedFieldRows = degradedFieldTable.getByTestId(
        'datasetQualityDetailsDegradedTableRow'
      );
      expect(await degradedFieldRows.count()).toBeGreaterThan(0);

      // Verify the log.level field is present (from malformed data)
      await expect(getQualityIssueRow(degradedFieldTable, DEGRADED_FIELD)).toBeVisible();
    });

    test('should open and close degraded field flyout', async ({ page, pageObjects }) => {
      // Expand the row of the log.level field (which we created as malformed)
      const flyout = await openDegradedFieldFlyout(page, DEGRADED_FIELD);

      // Verify flyout shows the field name
      await expect(flyout).toContainText(DEGRADED_FIELD);

      // Close the flyout
      await pageObjects.streams.closeFlyout();

      // Flyout should be hidden
      await expect(flyout).toBeHidden();
    });

    test('should navigate to Discover from degraded field flyout', async ({ page }) => {
      // Expand the row of the log.level field (which we created as malformed)
      const flyout = await openDegradedFieldFlyout(page, DEGRADED_FIELD);
      await expect(flyout).toContainText(DEGRADED_FIELD);

      // Click the link to Discover in the flyout
      await page.getByTestId('datasetQualityDetailsDegradedFieldFlyoutTitleLinkToDiscover').click();

      // Should navigate to Discover in ES|QL mode with field-specific _ignored query
      await expect(page).toHaveURL(/.*\/app\/discover/);
      await expect(page).toHaveURL(/.*esql.*FROM.*MV_CONTAINS.*_ignored.*log\.level/);
    });

    test('should edit failure store for wired streams', async ({ page }) => {
      // Open failed documents panel
      const failedDocsCard = await waitForFailedDocsCard(page);
      await failedDocsCard.click();

      // Click the edit button to open the failure store modal
      await page.getByTestId('datasetQualityDetailsEditFailureStore').click();

      // Modal should be visible
      await expect(page.getByTestId('editFailureStoreModal')).toBeVisible();

      // Inherit failure store switch should be visible for wired streams
      await expect(page.getByTestId('inheritFailureStoreSwitch')).toBeVisible();

      // Toggle the inherit failure store switch
      await page.getByTestId('inheritFailureStoreSwitch').click();
      await saveFailureStoreChanges(page);

      // Verify the modal is closed
      await expect(page.getByTestId('editFailureStoreModal')).toBeHidden();
    });
  }
);
