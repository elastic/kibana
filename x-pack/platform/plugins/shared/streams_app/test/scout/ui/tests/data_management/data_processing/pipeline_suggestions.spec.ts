/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect, type ScoutPage } from '@kbn/scout';
import { test } from '../../../fixtures';
import { generateLogsData } from '../../../fixtures/generators';
import {
  setupLlmProxyAndConnector,
  cleanupLlmProxyAndConnector,
  setupTestPage,
  type LlmProxySetup,
} from '../../../fixtures/ai_suggestions_helpers';
import { MOCK_GROK_PIPELINE } from '../../../fixtures/pipeline_suggestions_helpers';

/**
 * Helper to set up a mock pipeline suggestion response
 */
async function setupMockPipelineResponse(page: ScoutPage) {
  await page.route(
    '**/internal/streams/logs-generic-default/_suggest_processing_pipeline',
    async (route) => {
      // SSE format: each event is "data: <json>\n\n"
      const sseData = `data: ${JSON.stringify({
        type: 'suggested_processing_pipeline',
        pipeline: MOCK_GROK_PIPELINE,
      })}\n\n`;

      await route.fulfill({
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
        body: sseData,
      });
    }
  );
}

test.describe('Stream data processing - Pipeline suggestions', { tag: ['@ess'] }, () => {
  let llmSetup: LlmProxySetup;

  test.beforeAll(async ({ apiServices, logsSynthtraceEsClient, log }) => {
    await generateLogsData(logsSynthtraceEsClient)({ index: 'logs-generic-default' });
    llmSetup = await setupLlmProxyAndConnector(log, apiServices);
  });

  test.beforeEach(async ({ browserAuth, pageObjects, page, apiServices }) => {
    await browserAuth.loginAsAdmin();
    await apiServices.streams.clearStreamProcessors('logs-generic-default');
    await pageObjects.streams.gotoProcessingTab('logs-generic-default');
    await setupTestPage(page, llmSetup.llmProxy, llmSetup.connectorId);
  });

  test.afterAll(async ({ apiServices }) => {
    await cleanupLlmProxyAndConnector(llmSetup, apiServices);
    await apiServices.streams.clearStreamProcessors('logs-generic-default');
  });

  test('should show suggest pipeline button when no steps exist and hide when connector unavailable', async ({
    page,
    pageObjects,
  }) => {
    // Wait for the page content to load - the empty prompt should be visible
    await expect(page.getByText('Extract fields from your data')).toBeVisible();

    // Verify the generate button is visible with connector
    await expect(pageObjects.streams.getSuggestPipelineButton()).toBeVisible();

    // Mock no connectors and verify button is hidden
    await page.route('**/internal/streams/connectors', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ connectors: [] }),
      });
    });
    await page.reload();
    // Wait for the page to load again
    await expect(page.getByText('Extract fields from your data')).toBeVisible();
    await expect(pageObjects.streams.getSuggestPipelineButton()).toBeHidden();
  });

  test('should generate suggestion and allow accept/reject', async ({ page, pageObjects }) => {
    // Wait for page to load
    await expect(page.getByText('Extract fields from your data')).toBeVisible();
    await setupMockPipelineResponse(page);

    // Generate suggestion
    await pageObjects.streams.clickSuggestPipelineButton();
    await expect(pageObjects.streams.getPipelineSuggestionCallout()).toBeVisible();
    await expect(page.getByText('Review processing suggestions')).toBeVisible();

    // Reject and verify we're back to empty state
    await pageObjects.streams.rejectPipelineSuggestion();
    await expect(pageObjects.streams.getPipelineSuggestionCallout()).toBeHidden();
    await expect(page.getByText('Extract fields from your data')).toBeVisible();
    expect(await pageObjects.streams.getProcessorsListItemsFast()).toHaveLength(0);

    // Generate again and accept
    await pageObjects.streams.clickSuggestPipelineButton();
    await expect(pageObjects.streams.getPipelineSuggestionCallout()).toBeVisible();
    await pageObjects.streams.acceptPipelineSuggestion();

    // Verify processors exist after accept
    await expect(pageObjects.streams.getPipelineSuggestionCallout()).toBeHidden();
    const processors = await pageObjects.streams.getProcessorsListItems();
    expect(processors.length).toBeGreaterThan(0);
  });

  test('should regenerate suggestions', async ({ page, pageObjects }) => {
    // Wait for page to load
    await expect(page.getByText('Extract fields from your data')).toBeVisible();
    await setupMockPipelineResponse(page);

    // Generate first suggestion
    await pageObjects.streams.clickSuggestPipelineButton();
    await expect(pageObjects.streams.getPipelineSuggestionCallout()).toBeVisible();

    // Regenerate
    await pageObjects.streams.regeneratePipelineSuggestion();
    await expect(pageObjects.streams.getPipelineSuggestionCallout()).toBeVisible();
    await expect(page.getByTestId('streamsAppProcessorBlock')).toBeVisible();
  });
});
