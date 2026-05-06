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

test.describe(
  'Stream data processing - fetch more matching samples',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.beforeAll(async ({ logsSynthtraceEsClient }) => {
      // Setup test data where the condition matches below our threshold
      // 95 docs with service.name = 'common-service'
      await generateLogsData(logsSynthtraceEsClient)({
        index: 'logs-generic-default',
        startTime: '2025-01-01T00:00:00.000Z',
        endTime: '2025-01-01T00:19:00.000Z',
        docsPerMinute: 5,
        defaults: { 'service.name': 'common-service' },
      });

      // 5 docs with service.name = 'rare-service' (5% of total, below 10% threshold)
      await generateLogsData(logsSynthtraceEsClient)({
        index: 'logs-generic-default',
        startTime: '2025-01-01T00:19:00.000Z',
        endTime: '2025-01-01T00:20:00.000Z',
        docsPerMinute: 5,
        defaults: { 'service.name': 'rare-service' },
      });
    });

    test.beforeEach(async ({ apiServices, browserAuth, pageObjects }) => {
      await browserAuth.loginAsAdmin();
      await apiServices.streams.clearStreamProcessors('logs-generic-default');
      await pageObjects.streams.gotoProcessingTab('logs-generic-default');
    });

    test.afterAll(async ({ apiServices, logsSynthtraceEsClient }) => {
      await apiServices.streams.clearStreamProcessors('logs-generic-default');
      await logsSynthtraceEsClient.clean();
    });

    test('should show fetch more button when condition match rate is below threshold, clicking it should fetch more documents until the threshold is reached', async ({
      page,
      pageObjects,
    }) => {
      // Create a condition matching 'rare-service' (~5% of docs, below 10% threshold)
      await pageObjects.streams.clickAddCondition();
      await pageObjects.streams.fillCondition('service.name', 'equals', 'rare-service');
      await pageObjects.streams.clickSaveCondition();

      // Fetch more button should be visible since the condition matches below the threshold
      await expect(page.getByTestId('streamsAppFetchMoreMatchingSamplesButton')).toBeVisible();
    });
  }
);
