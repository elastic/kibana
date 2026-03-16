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

test.describe(
  'Stream data processing - without AI features',
  { tag: tags.serverless.observability.logs_essentials },
  () => {
    test.beforeAll(async ({ logsSynthtraceEsClient }) => {
      await generateLogsData(logsSynthtraceEsClient)({ index: 'logs-generic-default' });
    });

    test.beforeEach(async ({ apiServices, browserAuth, pageObjects }) => {
      await browserAuth.loginAsAdmin();
      await apiServices.streams.clearStreamProcessors('logs-generic-default');
      await pageObjects.streams.gotoProcessingTab('logs-generic-default');
      await pageObjects.streams.waitForModifiedFieldsDetection();
    });

    test.afterAll(async ({ apiServices, logsSynthtraceEsClient }) => {
      await apiServices.streams.clearStreamProcessors('logs-generic-default');
      await logsSynthtraceEsClient.clean();
    });

    test('should show manual-only empty prompt when AI features are unavailable', async ({
      page,
    }) => {
      await expect(page.getByText('Extract fields from your data')).toBeVisible();
      await expect(page.getByText('Technical Preview')).toBeHidden();
      await expect(
        page.getByTestId('streamsAppStreamDetailEnrichmentCreateProcessorButton')
      ).toBeVisible();
      await expect(
        page.getByTestId('streamsAppStreamDetailEnrichmentCreateConditionButton')
      ).toBeVisible();
    });

    test('should create a processor from the manual empty prompt', async ({ pageObjects }) => {
      await pageObjects.streams.clickAddProcessor();
      await pageObjects.streams.fillProcessorFieldInput('message');
      await pageObjects.streams.fillGrokPatternInput('%{CUSTOM_WORD:attributes.method}');
      await pageObjects.streams.fillGrokPatternDefinitionsInput('{"CUSTOM_WORD": "%{WORD}"}');
      await pageObjects.streams.clickSaveProcessor();
      await pageObjects.streams.saveStepsListChanges();
      expect(await pageObjects.streams.getProcessorsListItems()).toHaveLength(1);
    });
  }
);
