/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { test } from '../../../fixtures';
import { generateLogsData } from '../../../fixtures/generators';

test.describe(
  'Stream data processing - error handling and recovery',
  { tag: ['@ess', '@svlOblt'] },
  () => {
    test.beforeAll(async ({ logsSynthtraceEsClient }) => {
      await generateLogsData(logsSynthtraceEsClient)({ index: 'logs-generic-default' });
    });

    test.beforeEach(async ({ apiServices, browserAuth, pageObjects }) => {
      await browserAuth.loginAsAdmin();
      // Clear existing processors before each test
      await apiServices.streams.clearStreamProcessors('logs-generic-default');

      await pageObjects.streams.gotoProcessingTab('logs-generic-default');
    });

    test.afterAll(async ({ apiServices, logsSynthtraceEsClient }) => {
      await apiServices.streams.clearStreamProcessors('logs-generic-default');
      await logsSynthtraceEsClient.clean();
    });

    test('should handle network failures during a processor creation', async ({
      page,
      pageObjects,
    }) => {
      await pageObjects.streams.clickAddProcessor();
      await pageObjects.streams.fillProcessorFieldInput('message');
      await pageObjects.streams.fillGrokPatternInput('%{WORD:attributes.method}');
      await pageObjects.streams.clickSaveProcessor();

      await pageObjects.streams.waitForModifiedFieldsDetection();

      // Simulate network failure
      await page.route('**/streams/**/_ingest', async (route) => {
        // Abort the request to simulate a network failure
        await route.abort();
      });

      await pageObjects.streams.saveStepsListChanges();
      await pageObjects.streams.confirmChangesInReviewModal();

      // Should show error and stay in creating state
      await pageObjects.toasts.waitFor();
      expect(await pageObjects.toasts.getHeaderText()).toBe(
        "An issue occurred saving processors' changes."
      );
      await pageObjects.toasts.closeAll();

      // Restore network and retry
      await page.route('**/streams/**/_ingest', async (route) => {
        await route.continue();
      });
      await pageObjects.streams.saveStepsListChanges();
      await pageObjects.streams.confirmChangesInReviewModal();

      // Should succeed
      expect(await pageObjects.streams.getProcessorsListItems()).toHaveLength(1);
    });

    test('should recover from API errors during a processor updates', async ({
      page,
      pageObjects,
    }) => {
      // Create a processor first
      await pageObjects.streams.clickAddProcessor();
      await pageObjects.streams.fillProcessorFieldInput('message');
      await pageObjects.streams.fillGrokPatternInput('%{WORD:attributes.method}');
      await pageObjects.streams.clickSaveProcessor();

      await pageObjects.streams.waitForModifiedFieldsDetection();

      await pageObjects.streams.saveStepsListChanges();
      await pageObjects.streams.confirmChangesInReviewModal();
      await pageObjects.toasts.closeAll();

      // Edit the processor
      await pageObjects.streams.clickEditProcessor(0);
      await pageObjects.streams.fillGrokPatternInput('%{WORD:attributes.hostname}');
      await pageObjects.streams.clickSaveProcessor();

      // Simulate network failure
      await page.route('**/streams/**/_ingest', async (route) => {
        // Abort the request to simulate a network failure
        await route.abort();
      });

      await pageObjects.streams.saveStepsListChanges();

      // Should show error and return to editing state
      await pageObjects.toasts.waitFor();
      expect(await pageObjects.toasts.getHeaderText()).toBe(
        "An issue occurred saving processors' changes."
      );
      await pageObjects.toasts.closeAll();

      // Restore network and retry
      await page.route('**/streams/**/_ingest', async (route) => {
        await route.continue();
      });
      await pageObjects.streams.saveStepsListChanges();

      // Should succeed
      await pageObjects.toasts.waitFor();
      expect(await pageObjects.toasts.getHeaderText()).toBe("Stream's processors updated");
    });
  }
);
