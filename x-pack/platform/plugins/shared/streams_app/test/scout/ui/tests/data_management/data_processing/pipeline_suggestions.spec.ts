/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../../../fixtures';
import { generateLogsData } from '../../../fixtures/generators';
import {
  setupLlmProxyAndConnector,
  cleanupLlmProxyAndConnector,
  setupTestPage,
  type LlmProxySetup,
} from '../../../fixtures/ai_suggestions_helpers';
import { MOCK_GROK_PIPELINE } from '../../../fixtures/pipeline_suggestions_helpers';

const STATUS_ENDPOINT_PATTERN =
  '**/internal/streams/logs-generic-default/_pipeline_suggestion/_status';

/**
 * Helper to set up mock pipeline suggestion task endpoints
 */
async function setupMockPipelineTaskEndpoints(page: ScoutPage) {
  // Mock the task schedule endpoint - returns task ID
  await page.route(
    '**/internal/streams/logs-generic-default/_pipeline_suggestion/_task',
    async (route) => {
      const request = route.request();
      const body = request.postDataJSON();

      if (body?.action === 'schedule') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'completed',
            pipeline: MOCK_GROK_PIPELINE,
          }),
        });
      } else if (body?.action === 'cancel') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ status: 'canceled' }),
        });
      } else if (body?.action === 'acknowledge') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ status: 'acknowledged', pipeline: MOCK_GROK_PIPELINE }),
        });
      } else {
        await route.continue();
      }
    }
  );

  // Unroute any existing status endpoint mock, then add new one
  await page.unroute(STATUS_ENDPOINT_PATTERN);

  // Mock the task status endpoint - returns completed status with pipeline
  // Note: TaskResult spreads the payload directly, so pipeline is at root level
  await page.route(STATUS_ENDPOINT_PATTERN, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'completed',
        pipeline: MOCK_GROK_PIPELINE,
      }),
    });
  });
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

    // Set up default mocks BEFORE navigating to the page
    // Mock the bulk status endpoint to return no suggestions initially
    await page.route('**/internal/streams/_pipeline_suggestion/_bulk_status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    // Mock the initial status endpoint to return not_started (no existing suggestion)
    await page.route(STATUS_ENDPOINT_PATTERN, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'not_started',
        }),
      });
    });

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
    await setupMockPipelineTaskEndpoints(page);

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
    await setupMockPipelineTaskEndpoints(page);

    // Generate first suggestion
    await pageObjects.streams.clickSuggestPipelineButton();
    await expect(pageObjects.streams.getPipelineSuggestionCallout()).toBeVisible();

    // Regenerate
    await pageObjects.streams.regeneratePipelineSuggestion();
    await expect(pageObjects.streams.getPipelineSuggestionCallout()).toBeVisible();
    await expect(page.getByTestId('streamsAppProcessorBlock')).toBeVisible();
  });

  test('should restore existing suggestion on page load', async ({ page, pageObjects }) => {
    // Unroute any existing status endpoint mock
    await page.unroute(STATUS_ENDPOINT_PATTERN);

    // Set up the status endpoint to return a completed suggestion BEFORE page reload
    // Note: TaskResult spreads the payload directly, so pipeline is at root level
    await page.route(STATUS_ENDPOINT_PATTERN, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'completed',
          pipeline: MOCK_GROK_PIPELINE,
        }),
      });
    });

    // Reload the page to trigger the initial load
    await page.reload();

    // Wait for page to load and check that suggestion is shown immediately
    await expect(pageObjects.streams.getPipelineSuggestionCallout()).toBeVisible();
    await expect(page.getByText('Review processing suggestions')).toBeVisible();
  });
});
