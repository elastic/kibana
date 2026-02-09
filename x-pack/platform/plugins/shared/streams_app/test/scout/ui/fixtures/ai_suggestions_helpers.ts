/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import type { ToolingLog } from '@kbn/tooling-log';
import type { ChatCompletionStreamParams } from 'openai/lib/ChatCompletionStream';
import { createLlmProxy, type LlmProxy } from './llm_proxy';

export interface PartitionSuggestion {
  name: string;
  condition: {
    field: string;
    eq?: string;
    neq?: string;
    contains?: string;
    startsWith?: string;
    endsWith?: string;
    gt?: number;
    gte?: number;
    lt?: number;
    lte?: number;
  };
}

// Constants for test IDs
export const SUGGESTION_BUTTON_TEST_IDS = {
  accept: (streamName: string) => `suggestionAcceptButton-${streamName}`,
  reject: (streamName: string) => `suggestionRejectButton-${streamName}`,
  preview: (streamName: string) => `suggestionPreviewButton-${streamName}`,
  edit: (streamName: string) => `suggestionEditButton-${streamName}`,
} as const;

export const MODAL_TEST_IDS = {
  confirmationModal: 'streamsAppCreateStreamConfirmationModal',
  streamNameField: 'streamsAppCreateStreamConfirmationModalStreamName',
  cancelButton: 'streamsAppCreateStreamConfirmationModalCancelButton',
  createButton: 'streamsAppCreateStreamConfirmationModalCreateButton',
} as const;

// Mock suggestion data constants
export const MOCK_SUGGESTION_INFO: PartitionSuggestion = {
  name: 'info',
  condition: { field: 'severity_text', eq: 'info' },
};

export const MOCK_SUGGESTION_ERROR: PartitionSuggestion = {
  name: 'error',
  condition: { field: 'severity_text', eq: 'error' },
};

export const MOCK_SUGGESTION_WARN: PartitionSuggestion = {
  name: 'warn',
  condition: { field: 'severity_text', eq: 'warn' },
};

export const MOCK_SUGGESTIONS_MULTIPLE: PartitionSuggestion[] = [
  MOCK_SUGGESTION_INFO,
  MOCK_SUGGESTION_ERROR,
  MOCK_SUGGESTION_WARN,
];

export interface LlmProxySetup {
  llmProxy: LlmProxy;
  connectorId: string;
}

/**
 * Creates an LLM proxy and a connector pointing to it
 */
export async function setupLlmProxyAndConnector(
  log: ToolingLog,
  apiServices: {
    alerting: {
      connectors: {
        create: (params: {
          name: string;
          connectorTypeId: string;
          config: Record<string, unknown>;
          secrets: Record<string, unknown>;
        }) => Promise<{ id: string }>;
      };
    };
  }
): Promise<LlmProxySetup> {
  const llmProxy = await createLlmProxy(log);

  const connector = await apiServices.alerting.connectors.create({
    name: 'test-ai-connector',
    connectorTypeId: '.gen-ai',
    config: {
      apiProvider: 'OpenAI',
      apiUrl: `http://localhost:${llmProxy.getPort()}`,
      defaultModel: 'gpt-4',
    },
    secrets: { apiKey: 'test-api-key' },
  });

  return { llmProxy, connectorId: connector.id };
}

/**
 * Cleans up LLM proxy and connector
 */
export async function cleanupLlmProxyAndConnector(
  setup: LlmProxySetup,
  apiServices: {
    alerting: {
      connectors: {
        delete: (id: string) => Promise<void>;
      };
    };
  }
): Promise<void> {
  if (setup.connectorId) {
    try {
      await apiServices.alerting.connectors.delete(setup.connectorId);
    } catch {
      // Ignore errors if connector doesn't exist
    }
  }

  if (setup.llmProxy) {
    setup.llmProxy.close();
  }
}

/**
 * Sets the connector ID in localStorage so it gets selected automatically
 */
export async function selectConnectorInLocalStorage(
  page: ScoutPage,
  connectorId: string
): Promise<void> {
  await page.evaluate((id) => {
    localStorage.setItem('xpack.streamsApp.lastUsedConnector', id);
  }, connectorId);
}

export function partitionLogsWhenCondition(body: ChatCompletionStreamParams): boolean {
  return body.tools?.some((tool) => tool.function?.name === 'partition_logs') ?? false;
}

/**
 * Sets up an interceptor for partition_logs function calls
 */
export function setupPartitionLogsInterceptor(
  llmProxy: LlmProxy,
  partitions: PartitionSuggestion[],
  interceptorName?: string
): void {
  void llmProxy.interceptWithFunctionRequest({
    name: 'partition_logs',
    arguments: () =>
      JSON.stringify({
        index: 'logs',
        partitions,
      }),
    when: partitionLogsWhenCondition,
    interceptorName: interceptorName ?? 'partition_logs with mock suggestions',
  });
}

/**
 * Common setup for beforeEach: clear interceptors and select connector
 */
export async function setupTestPage(
  page: ScoutPage,
  llmProxy: LlmProxy,
  connectorId: string
): Promise<void> {
  // Clear any previous interceptors
  llmProxy.clear();

  // Set the connector ID in localStorage so it gets selected automatically
  await selectConnectorInLocalStorage(page, connectorId);
}

/**
 * Generates AI suggestions by clicking the button and waiting for results
 * Waits for either the suggestions callout or the no suggestions callout
 */
export async function generateSuggestions(page: ScoutPage, llmProxy: LlmProxy): Promise<void> {
  const button = page.getByTestId('streamsAppGenerateSuggestionButton');
  await expect(button).toBeVisible();
  await expect(button).toBeEnabled();
  await button.click();

  await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

  const suggestionsCallout = page.getByTestId('streamsAppReviewPartitioningSuggestionsCallout');
  const noSuggestionsCallout = page.getByTestId('streamsAppNoSuggestionsCallout');

  try {
    await suggestionsCallout.waitFor({ state: 'visible' });
  } catch {
    await noSuggestionsCallout.waitFor({ state: 'visible' });
  }
}

/**
 * Waits for a specific suggestion to be fully loaded and visible
 */
export async function waitForSuggestionVisible(page: ScoutPage, streamName: string): Promise<void> {
  await expect(page.getByTestId(`suggestionName-${streamName}`)).toBeVisible();

  await expect(page.getByTestId(SUGGESTION_BUTTON_TEST_IDS.accept(streamName))).toBeVisible();
}

export async function clickSuggestionAcceptButton(
  page: ScoutPage,
  streamName: string
): Promise<void> {
  await waitForSuggestionVisible(page, streamName);
  const button = page.getByTestId(SUGGESTION_BUTTON_TEST_IDS.accept(streamName));
  await button.click();
}

export async function clickSuggestionRejectButton(
  page: ScoutPage,
  streamName: string
): Promise<void> {
  await waitForSuggestionVisible(page, streamName);
  const button = page.getByTestId(SUGGESTION_BUTTON_TEST_IDS.reject(streamName));
  await button.click();
}

export async function clickSuggestionPreviewButton(
  page: ScoutPage,
  streamName: string
): Promise<void> {
  await waitForSuggestionVisible(page, streamName);
  const button = page.getByTestId(SUGGESTION_BUTTON_TEST_IDS.preview(streamName));
  await button.click();
}

export async function clickSuggestionEditButton(
  page: ScoutPage,
  streamName: string
): Promise<void> {
  await waitForSuggestionVisible(page, streamName);
  const button = page.getByTestId(SUGGESTION_BUTTON_TEST_IDS.edit(streamName));
  await button.click();
}

/**
 * Opens the confirmation modal by clicking Accept on a suggestion
 * @returns The modal locator
 */
export async function openSuggestionConfirmationModal(
  page: ScoutPage,
  streamName: string
): Promise<ReturnType<ScoutPage['getByTestId']>> {
  await clickSuggestionAcceptButton(page, streamName);
  const modal = page.getByTestId(MODAL_TEST_IDS.confirmationModal);
  await expect(modal).toBeVisible();
  return modal;
}

export async function clickModalCreateButton(
  modal: ReturnType<ScoutPage['getByTestId']>
): Promise<void> {
  const createButton = modal.getByTestId(MODAL_TEST_IDS.createButton);
  await createButton.click();
}

export async function clickModalCancelButton(
  modal: ReturnType<ScoutPage['getByTestId']>
): Promise<void> {
  const cancelButton = modal.getByTestId(MODAL_TEST_IDS.cancelButton);
  await cancelButton.click();
}

export async function setupAiSuggestionsTest(
  page: ScoutPage,
  llmSetup: LlmProxySetup,
  mockSuggestions: PartitionSuggestion[],
  browserAuth: { loginAsAdmin: () => Promise<void> },
  pageObjects: {
    streams: { gotoPartitioningTab: (stream: string) => Promise<void> };
    datePicker: { setAbsoluteRange: (range: { from: string; to: string }) => Promise<void> };
  },
  dateRange: { from: string; to: string }
): Promise<void> {
  await browserAuth.loginAsAdmin();
  await pageObjects.streams.gotoPartitioningTab('logs');
  await pageObjects.datePicker.setAbsoluteRange(dateRange);

  await setupTestPage(page, llmSetup.llmProxy, llmSetup.connectorId);
  setupPartitionLogsInterceptor(llmSetup.llmProxy, mockSuggestions);
  await generateSuggestions(page, llmSetup.llmProxy);
}

/**
 * Gets the full stream name (with prefix) for a suggestion
 */
export function getStreamName(suggestionName: string, parentStream = 'logs'): string {
  return `${parentStream}.${suggestionName}`;
}
