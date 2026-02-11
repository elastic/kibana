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
 * Returns a tracker object to verify which actions were called
 */
async function setupMockPipelineTaskEndpoints(page: ScoutPage) {
  const callTracker = {
    scheduleCalls: 0,
    cancelCalls: 0,
    acknowledgeCalls: 0,
    resetCounts: () => {
      callTracker.scheduleCalls = 0;
      callTracker.cancelCalls = 0;
      callTracker.acknowledgeCalls = 0;
    },
  };

  // Mock the task schedule endpoint - returns task ID
  await page.route(
    '**/internal/streams/logs-generic-default/_pipeline_suggestion/_task',
    async (route) => {
      const request = route.request();
      const body = request.postDataJSON();

      if (body?.action === 'schedule') {
        callTracker.scheduleCalls++;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'completed',
            pipeline: MOCK_GROK_PIPELINE,
          }),
        });
      } else if (body?.action === 'cancel') {
        callTracker.cancelCalls++;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ status: 'canceled' }),
        });
      } else if (body?.action === 'acknowledge') {
        callTracker.acknowledgeCalls++;
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

  return callTracker;
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

    // Verify the Technical Preview badge is visible when AI suggestions are available
    await expect(page.getByText('Technical Preview')).toBeVisible();

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
    const callTracker = await setupMockPipelineTaskEndpoints(page);

    // Generate suggestion
    await pageObjects.streams.clickSuggestPipelineButton();
    await expect(pageObjects.streams.getPipelineSuggestionCallout()).toBeVisible();
    await expect(page.getByText('Review processing suggestions')).toBeVisible();

    // Reject and verify we're back to empty state
    // Also verify acknowledge was called to clear server state
    callTracker.resetCounts();
    await pageObjects.streams.rejectPipelineSuggestion();
    await expect(pageObjects.streams.getPipelineSuggestionCallout()).toBeHidden();
    await expect(page.getByText('Extract fields from your data')).toBeVisible();
    expect(await pageObjects.streams.getProcessorsListItemsFast()).toHaveLength(0);
    // Wait a tick for the fire-and-forget acknowledge call to complete
    await page.waitForTimeout(100);
    expect(callTracker.acknowledgeCalls).toBe(1);

    // Generate again and accept
    callTracker.resetCounts();
    await pageObjects.streams.clickSuggestPipelineButton();
    await expect(pageObjects.streams.getPipelineSuggestionCallout()).toBeVisible();
    await pageObjects.streams.acceptPipelineSuggestion();

    // Verify processors exist after accept
    await expect(pageObjects.streams.getPipelineSuggestionCallout()).toBeHidden();
    const processors = await pageObjects.streams.getProcessorsListItems();
    expect(processors.length).toBeGreaterThan(0);
    // Wait a tick for the fire-and-forget acknowledge call to complete
    await page.waitForTimeout(100);
    expect(callTracker.acknowledgeCalls).toBe(1);
  });

  test('should regenerate suggestions', async ({ page, pageObjects }) => {
    // Wait for page to load
    await expect(page.getByText('Extract fields from your data')).toBeVisible();
    // Note: we don't need the callTracker for this test, but the function returns it
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

  test('should show loading only after initial in_progress status and allow cancel', async ({
    page,
    pageObjects,
  }) => {
    // Wait for page to load
    await expect(page.getByText('Extract fields from your data')).toBeVisible();

    const callTracker = {
      cancelCalls: 0,
    };

    // Mock the cancel endpoint for the in-progress task
    await page.route(
      '**/internal/streams/logs-generic-default/_pipeline_suggestion/_task',
      async (route) => {
        const body = route.request().postDataJSON();
        const action = body?.action;
        callTracker.cancelCalls += Number(action === 'cancel');

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ status: 'canceled' }),
        });
      }
    );

    // Unroute any existing status endpoint mock
    await page.unroute(STATUS_ENDPOINT_PATTERN);

    let releaseFirstStatus!: () => void;
    const firstStatusGate = new Promise<void>((resolve) => {
      releaseFirstStatus = resolve;
    });

    const statusGates = [firstStatusGate, Promise.resolve()];
    const statusResponses = [{ status: 'in_progress' }, { status: 'in_progress' }];
    let statusCallCount = 0;

    // Gate the first status response so we can assert we don't show loading before we know status.
    await page.route(STATUS_ENDPOINT_PATTERN, async (route) => {
      const idx = Math.min(statusCallCount, statusGates.length - 1);
      await statusGates[idx];
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(statusResponses[idx]),
      });
      statusCallCount++;
    });

    // Reload the page to trigger initial existing-task status check
    await page.reload();

    // While the first status request is still pending, we should NOT show the loading prompt.
    await expect(page.getByText('Extract fields from your data')).toBeVisible();
    await expect(page.getByTestId('streamsAppPipelineSuggestionLoadingPrompt')).toHaveCount(0);

    // Now return the initial status response indicating an in-progress task.
    releaseFirstStatus();

    // Once we know the task is in-progress, we should show the loading prompt.
    await expect(page.getByTestId('streamsAppPipelineSuggestionLoadingPrompt')).toBeVisible();

    // Cancel should be available and should return to the empty state.
    await page.getByTestId('streamsAppPipelineSuggestionCancelButton').click();
    await expect(page.getByTestId('streamsAppPipelineSuggestionLoadingPrompt')).toHaveCount(0);
    await expect(pageObjects.streams.getPipelineSuggestionCallout()).toBeHidden();
    await expect(page.getByText('Extract fields from your data')).toBeVisible();

    // Wait a tick for the fire-and-forget cancel call to complete
    await page.waitForTimeout(100);
    expect(callTracker.cancelCalls).toBe(1);

    // Cancel should not produce a user-visible error toast.
    await expect(page.getByText('Failed to generate pipeline suggestion')).toHaveCount(0);
  });

  test('should acknowledge when dismissing "no suggestions found" state', async ({
    page,
    pageObjects,
  }) => {
    // Wait for page to load
    await expect(page.getByText('Extract fields from your data')).toBeVisible();

    // Set up mock with an empty pipeline to simulate "no suggestions found"
    const callTracker = {
      acknowledgeCalls: 0,
    };

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
              // null pipeline triggers noSuggestionsFound state
              pipeline: null,
            }),
          });
        } else if (body?.action === 'acknowledge') {
          callTracker.acknowledgeCalls++;
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ status: 'acknowledged', pipeline: null }),
          });
        } else {
          await route.continue();
        }
      }
    );

    // Unroute any existing status endpoint mock
    await page.unroute(STATUS_ENDPOINT_PATTERN);

    await page.route(STATUS_ENDPOINT_PATTERN, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'completed',
          pipeline: null,
        }),
      });
    });

    // Generate suggestion - should go to noSuggestionsFound state
    await pageObjects.streams.clickSuggestPipelineButton();

    // Should show the "no suggestions found" callout with the title
    await expect(page.getByText('Could not generate suggestions', { exact: true })).toBeVisible();

    // Dismiss using the EuiCallOut's built-in dismiss button (has aria-label="Dismiss")
    const dismissButton = page.getByRole('button', { name: 'Dismiss' });
    await expect(dismissButton).toBeVisible();
    await dismissButton.click();

    // Wait a tick for the fire-and-forget acknowledge call to complete
    await page.waitForTimeout(100);
    expect(callTracker.acknowledgeCalls).toBe(1);

    // Should be back to empty state
    await expect(page.getByText('Extract fields from your data')).toBeVisible();
  });
});
