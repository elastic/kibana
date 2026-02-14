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

// Tests that the UI handles malformed processor configurations gracefully (missing array fields).
// This covers the fix for https://github.com/elastic/kibana/issues/252368 where the UI would crash
// with "undefined.map() is not a function" when processors had missing array fields like:
// - join.from (array of strings)
// - date.formats (array of strings)
// - concat.from (array of objects)
test.describe(
  'Stream data processing - malformed processor configuration handling',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.beforeAll(async ({ logsSynthtraceEsClient }) => {
      await generateLogsData(logsSynthtraceEsClient)({ index: 'logs-generic-default' });
    });

    test.afterAll(async ({ apiServices, logsSynthtraceEsClient }) => {
      await apiServices.streams.clearStreamProcessors('logs-generic-default');
      await logsSynthtraceEsClient.clean();
    });

    test('should render join processor with missing from field without crashing', async ({
      apiServices,
      browserAuth,
      page,
      pageObjects,
    }) => {
      await browserAuth.loginAsAdmin();

      // Create a malformed join processor configuration missing the 'from' array field
      // This simulates a corrupted or legacy configuration that could cause the UI to crash
      await apiServices.streams.updateStreamProcessors('logs-generic-default', {
        steps: [
          {
            action: 'join',
            to: 'attributes.joined_field',
            delimiter: ', ',
            // 'from' field intentionally omitted to simulate malformed config
          } as any,
        ],
      });

      await pageObjects.streams.gotoProcessingTab('logs-generic-default');

      // Verify the page renders without crashing
      const processors = await pageObjects.streams.getProcessorsListItems();
      expect(processors).toHaveLength(1);

      // Verify we can open the processor for editing without crash
      await pageObjects.streams.clickEditProcessor(0);

      // Verify the form is displayed (not crashed)
      await expect(page.getByTestId('streamsAppProcessorConfigurationCancelButton')).toBeVisible();

      // Cleanup: cancel editing
      await pageObjects.streams.clickCancelProcessorChanges();
    });

    test('should render date processor with missing formats field without crashing', async ({
      apiServices,
      browserAuth,
      page,
      pageObjects,
    }) => {
      await browserAuth.loginAsAdmin();

      // Create a malformed date processor configuration missing the 'formats' array field
      await apiServices.streams.updateStreamProcessors('logs-generic-default', {
        steps: [
          {
            action: 'date',
            from: 'message',
            to: '@timestamp',
            // 'formats' field intentionally omitted to simulate malformed config
          } as any,
        ],
      });

      await pageObjects.streams.gotoProcessingTab('logs-generic-default');

      // Verify the page renders without crashing
      const processors = await pageObjects.streams.getProcessorsListItems();
      expect(processors).toHaveLength(1);

      // Verify we can open the processor for editing without crash
      await pageObjects.streams.clickEditProcessor(0);

      // Verify the form is displayed (not crashed)
      await expect(page.getByTestId('streamsAppProcessorConfigurationCancelButton')).toBeVisible();

      // Verify the formats field is present and empty (default value applied)
      const formatsInput = page.getByPlaceholder('Type and then hit "ENTER"');
      await expect(formatsInput).toBeVisible();

      // Cleanup: cancel editing
      await pageObjects.streams.clickCancelProcessorChanges();
    });

    test('should render concat processor with missing from field without crashing', async ({
      apiServices,
      browserAuth,
      page,
      pageObjects,
    }) => {
      await browserAuth.loginAsAdmin();

      // Create a malformed concat processor configuration missing the 'from' array field
      await apiServices.streams.updateStreamProcessors('logs-generic-default', {
        steps: [
          {
            action: 'concat',
            to: 'attributes.combined_field',
            // 'from' field intentionally omitted to simulate malformed config
          } as any,
        ],
      });

      await pageObjects.streams.gotoProcessingTab('logs-generic-default');

      // Verify the page renders without crashing
      const processors = await pageObjects.streams.getProcessorsListItems();
      expect(processors).toHaveLength(1);

      // Verify we can open the processor for editing without crash
      await pageObjects.streams.clickEditProcessor(0);

      // Verify the form is displayed (not crashed)
      await expect(page.getByTestId('streamsAppProcessorConfigurationCancelButton')).toBeVisible();

      // Cleanup: cancel editing
      await pageObjects.streams.clickCancelProcessorChanges();
    });
  }
);
