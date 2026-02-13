/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { tags } from '@kbn/scout';
import { test } from '../../../fixtures';
import { DATE_RANGE, generateLogsData } from '../../../fixtures/generators';
import {
  setupLlmProxyAndConnector,
  cleanupLlmProxyAndConnector,
  setupTestPage,
  type LlmProxySetup,
} from '../../../fixtures/ai_suggestions_helpers';

test.describe('Stream data routing - AI suggestions button', { tag: tags.stateful.classic }, () => {
  let llmSetup: LlmProxySetup;

  test.beforeAll(async ({ apiServices, logsSynthtraceEsClient, log }) => {
    await logsSynthtraceEsClient.clean();
    await generateLogsData(logsSynthtraceEsClient)({ index: 'logs' });

    llmSetup = await setupLlmProxyAndConnector(log, apiServices);
  });

  test.beforeEach(async ({ browserAuth, pageObjects, page }) => {
    await browserAuth.loginAsAdmin();
    await pageObjects.streams.gotoPartitioningTab('logs');
    await pageObjects.datePicker.setAbsoluteRange(DATE_RANGE);

    await setupTestPage(page, llmSetup.llmProxy, llmSetup.connectorId);
  });

  test.afterAll(async ({ apiServices, logsSynthtraceEsClient }) => {
    await cleanupLlmProxyAndConnector(llmSetup, apiServices);
    await logsSynthtraceEsClient.clean();
  });

  test('should show button when AI features are enabled', async ({ page }) => {
    const button = page.getByTestId('streamsAppGenerateSuggestionButton');
    await expect(button).toBeVisible();
    await expect(button).toContainText('Suggest partitions');
  });

  test('should disable button when no connector is selected', async ({ page }) => {
    await page.route('**/internal/streams/connectors', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ connectors: [] }),
      });
    });

    await page.reload();

    const button = page.getByTestId('streamsAppGenerateSuggestionButton');
    await expect(button).toBeHidden();
  });

  test('should show connector dropdown when multiple connectors exist', async ({ page }) => {
    await page.route('**/internal/streams/connectors', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({
          connectors: [
            {
              id: 'test-connector-1',
              name: 'Test Connector 1',
              actionTypeId: '.gen-ai',
            },
            {
              id: 'test-connector-2',
              name: 'Test Connector 2',
              actionTypeId: '.gen-ai',
            },
          ],
        }),
      });
    });

    await page.reload();

    const moreButton = page.getByTestId('streamsAppAiPickConnectorButton');
    await expect(moreButton).toBeVisible();
  });
});
