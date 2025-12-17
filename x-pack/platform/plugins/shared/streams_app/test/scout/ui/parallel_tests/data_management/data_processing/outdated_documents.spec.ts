/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { expect, type TestInfo } from '@kbn/scout';
import moment from 'moment';
import {
  test,
  getUniqueClassicStreamName,
  getUniqueStreamName,
  safeDeleteStream,
} from '../../../fixtures';
import { generateLogsData } from '../../../fixtures/generators';

const INGESTION_DURATION_MINUTES = 5;
const INGESTION_RATE = 20;

// Store stream names for this worker
let newDocumentsStream: string;
let oldDocumentsStream: string;
let emptyStream: string;

test.describe('Stream data processing - outdated documents', { tag: ['@ess', '@svlOblt'] }, () => {
  const newDocumentsDateRange = {
    from: '',
    to: '',
  };

  const oldDocumentsDateRange = {
    from: '',
    to: '',
  };

  test.beforeAll(async ({ apiServices, logsSynthtraceEsClient }, testInfo: TestInfo) => {
    // Generate unique stream names for this worker
    newDocumentsStream = getUniqueClassicStreamName(testInfo, 'new-documents');
    oldDocumentsStream = getUniqueClassicStreamName(testInfo, 'old-documents');
    emptyStream = getUniqueStreamName(testInfo, 'empty');

    // Clean up any existing streams from previous runs
    await safeDeleteStream(apiServices, emptyStream);

    const newDocsTime = moment().utc().add(1, 'day').toDate().getTime();
    newDocumentsDateRange.from = moment(newDocsTime)
      .utc()
      .subtract(2, 'hours')
      .format('MMM D, YYYY @ HH:mm:ss.SSS');
    newDocumentsDateRange.to = moment(newDocsTime)
      .utc()
      .add(2, 'hours')
      .format('MMM D, YYYY @ HH:mm:ss.SSS');
    await generateLogsData(logsSynthtraceEsClient)({
      index: newDocumentsStream,
      startTime: new Date(newDocsTime - INGESTION_DURATION_MINUTES * 60 * 1000).toISOString(),
      endTime: new Date(newDocsTime).toISOString(),
      docsPerMinute: INGESTION_RATE,
    });

    // Set up basic processing to update the stream's updated_at timestamp to current time
    await apiServices.streams.updateStreamProcessors(newDocumentsStream, {
      steps: [
        {
          action: 'set',
          to: 'test_field',
          value: 'test_value',
        },
      ],
    });

    const oldDocsTime = moment().utc().subtract(1, 'day').toDate().getTime();
    oldDocumentsDateRange.from = moment(oldDocsTime)
      .utc()
      .subtract(2, 'hours')
      .format('MMM D, YYYY @ HH:mm:ss.SSS');
    oldDocumentsDateRange.to = moment(oldDocsTime)
      .utc()
      .add(2, 'hours')
      .format('MMM D, YYYY @ HH:mm:ss.SSS');
    await generateLogsData(logsSynthtraceEsClient)({
      index: oldDocumentsStream,
      startTime: new Date(oldDocsTime - INGESTION_DURATION_MINUTES * 60 * 1000).toISOString(),
      endTime: new Date(oldDocsTime).toISOString(),
      docsPerMinute: INGESTION_RATE,
    });

    // Set up basic processing to update the stream's updated_at timestamp to current time
    await apiServices.streams.updateStreamProcessors(oldDocumentsStream, {
      steps: [
        {
          action: 'set',
          to: 'test_field',
          value: 'test_value',
        },
      ],
    });

    await apiServices.streams.forkStream('logs', emptyStream, { always: {} });
  });

  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsAdmin();
  });

  test.afterAll(async ({ apiServices, logsSynthtraceEsClient }) => {
    await logsSynthtraceEsClient.clean();
    // Clean up only this worker's streams
    await safeDeleteStream(apiServices, emptyStream);
    await safeDeleteStream(apiServices, newDocumentsStream);
    await safeDeleteStream(apiServices, oldDocumentsStream);
  });

  test('with outdated documents - should display warning tip for latest samples datasource', async ({
    page,
    pageObjects,
  }) => {
    await pageObjects.streams.gotoProcessingTab(oldDocumentsStream);
    await expect(page.getByTestId('streamsAppProcessingOutdatedDocumentsTipAnchor')).toBeVisible();
  });

  test('with outdated documents - should display warning tip for kql samples datasource', async ({
    page,
    pageObjects,
  }) => {
    await pageObjects.streams.gotoProcessingTab(oldDocumentsStream);
    await pageObjects.streams.clickManageDataSourcesButton();
    await pageObjects.streams.addDataSource('kql');
    await page.getByTestId('streamsAppKqlSamplesDataSourceNameField').fill('Kql Samples');
    await pageObjects.datePicker.setAbsoluteRange(oldDocumentsDateRange);
    await page.getByTestId('querySubmitButton').click();
    await pageObjects.streams.closeFlyout();

    await expect(page.getByTestId('streamsAppProcessingOutdatedDocumentsTipAnchor')).toBeVisible();
  });

  test('with up to date documents - should not display warning tip for latest samples datasource', async ({
    page,
    pageObjects,
  }) => {
    await pageObjects.streams.gotoProcessingTab(newDocumentsStream);
    await expect(page.getByTestId('streamsAppProcessingOutdatedDocumentsTipAnchor')).toBeHidden();
  });

  test('with up to date documents - should not display warning tip for kql samples datasource', async ({
    page,
    pageObjects,
  }) => {
    await pageObjects.streams.gotoProcessingTab(newDocumentsStream);
    await pageObjects.streams.clickManageDataSourcesButton();
    await pageObjects.streams.addDataSource('kql');
    await page.getByTestId('streamsAppKqlSamplesDataSourceNameField').fill('Kql Samples');
    await pageObjects.datePicker.setAbsoluteRange(oldDocumentsDateRange);
    await page.getByTestId('querySubmitButton').click();
    await pageObjects.streams.closeFlyout();

    await expect(page.getByTestId('streamsAppProcessingOutdatedDocumentsTipAnchor')).toBeHidden();
  });

  test('with empty samples - should not display warning tip for latest samples datasource', async ({
    page,
    pageObjects,
  }) => {
    await pageObjects.streams.gotoProcessingTab(emptyStream);
    await expect(page.getByTestId('streamsAppProcessingOutdatedDocumentsTipAnchor')).toBeHidden();
  });

  test('with empty samples - should not display warning tip for kql samples datasource', async ({
    page,
    pageObjects,
  }) => {
    await pageObjects.streams.gotoProcessingTab(emptyStream);
    await pageObjects.streams.clickManageDataSourcesButton();
    await pageObjects.streams.addDataSource('kql');
    await page.getByTestId('streamsAppKqlSamplesDataSourceNameField').fill('Kql Samples');
    await page.getByTestId('querySubmitButton').click();
    await pageObjects.streams.closeFlyout();

    await expect(page.getByTestId('streamsAppProcessingOutdatedDocumentsTipAnchor')).toBeHidden();
  });

  test('should never display warning tip for custom samples datasource', async ({
    page,
    pageObjects,
  }) => {
    await pageObjects.streams.gotoProcessingTab(oldDocumentsStream);
    await pageObjects.streams.clickManageDataSourcesButton();
    await pageObjects.streams.addDataSource('custom');
    await page.getByTestId('streamsAppCustomSamplesDataSourceNameField').fill('Custom Samples');
    await pageObjects.streams.fillCustomSamplesEditor(
      `[{"@timestamp": "${moment()
        .subtract(5, 'years')
        .toISOString()}", "message": "Sample log 1"}]`
    );
    await pageObjects.streams.closeFlyout();

    await expect(page.getByTestId('streamsAppProcessingOutdatedDocumentsTipAnchor')).toBeHidden();
  });
});
