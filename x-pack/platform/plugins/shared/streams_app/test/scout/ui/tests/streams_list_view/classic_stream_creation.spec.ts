/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type EsClient, type ApiServicesFixture } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import type { Locator } from '@kbn/scout';
import { test } from '../../fixtures';

const CLASSIC_STREAM_TEMPLATE_NAME = 'classic_stream_template';
const CLASSIC_STREAM_INDEX_PATTERN_PREFIX = 'classic-stream';

function getCreatedStreamNameFromUrl(urlString: string): string {
  const match = urlString.match(/\/app\/streams\/([^/]+)\/management\/retention/);
  return decodeURIComponent(match?.[1] ?? '');
}

function buildUniqueTemplateConfig(testInfo: { workerIndex: number; testId: string }) {
  const uniqueId = `${testInfo.workerIndex}-${testInfo.testId}`;

  return {
    templateName: `${CLASSIC_STREAM_TEMPLATE_NAME}-${uniqueId}`,
    // We intentionally create a single-wildcard index pattern so the flyout always renders exactly
    // one wildcard input (`streamNameInput-wildcard-0`).
    indexPattern: `${CLASSIC_STREAM_INDEX_PATTERN_PREFIX}-${uniqueId}-*`,
  };
}

async function ensureClassicStreamIndexTemplate(
  esClient: EsClient,
  templateName: string,
  indexPattern: string
) {
  // Create a composable index template that supports data streams and includes a wildcard index pattern,
  // so it is eligible for the classic stream creation flyout.
  //
  // Use a very high priority to avoid "higher priority template conflict" validation errors.
  await esClient.indices.putIndexTemplate({
    name: templateName,
    index_patterns: [indexPattern],
    priority: 2000,
    data_stream: {},
    template: {
      settings: {},
      mappings: {},
    },
  });
}

async function selectClassicStreamTemplate(flyout: Locator, templateName: string) {
  await flyout.getByTestId('templateSearch').fill(templateName);
  const option = flyout.getByTestId(`template-option-${templateName}`);
  await expect(
    option,
    `Expected index template "${templateName}" to be available in the classic stream creation flyout`
  ).toBeVisible();
  await option.click();
}

async function cleanupClassicStreamCreation({
  apiServices,
  esClient,
  templateName,
  createdStreamName,
}: {
  apiServices: ApiServicesFixture;
  esClient: EsClient;
  templateName: string;
  createdStreamName?: string;
}) {
  // Cleanup resources created by this test.
  try {
    if (createdStreamName) {
      await apiServices.streams.deleteStream(createdStreamName);
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(`Failed to delete stream "${createdStreamName}" during cleanup`, e);
  }

  try {
    await esClient.indices.deleteIndexTemplate({ name: templateName });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(`Failed to delete index template "${templateName}" during cleanup`, e);
  }
}

test.describe('Streams list view - classic stream creation', { tag: ['@ess', '@svlOblt'] }, () => {
  test('creates a classic stream via the creation flyout', async ({
    apiServices,
    browserAuth,
    esClient,
    page,
    pageObjects,
  }, testInfo) => {
    const { templateName, indexPattern } = buildUniqueTemplateConfig(testInfo);
    let createdStreamName: string | undefined;

    await browserAuth.loginAsAdmin();
    await pageObjects.streams.gotoStreamMainPage();

    try {
      await ensureClassicStreamIndexTemplate(esClient, templateName, indexPattern);

      await page.getByRole('button', { name: 'Create classic stream' }).click();

      const flyout = page.getByTestId('create-classic-stream-flyout');
      await expect(flyout).toBeVisible();

      // Step 1: Select template
      await selectClassicStreamTemplate(flyout, templateName);

      // Step 2: Name and confirm (fill the single wildcard part)
      const wildcardInput = flyout.getByTestId('streamNameInput-wildcard-0');
      await expect(wildcardInput).toBeVisible();
      await wildcardInput.fill(`test-${templateName}`);

      await flyout.getByTestId('createButton').click();

      // Flyout closes on successful creation + navigation to the stream management page.
      await expect(flyout).toBeHidden({ timeout: 30000 });

      // Wait for navigation to the created stream management page.
      await expect(page).toHaveURL(/\/app\/streams\/.+\/management\/retention/);

      // Derive created stream name from the URL.
      createdStreamName = getCreatedStreamNameFromUrl(page.url());
      expect(createdStreamName, 'Expected created stream name to be present in URL').toBeTruthy();

      // Basic assertion that we landed on a classic stream.
      await pageObjects.streams.verifyClassicBadge();

      // Assert we are on the created stream page.
      await expect(page.getByRole('heading', { level: 1 })).toContainText(createdStreamName);
    } finally {
      await cleanupClassicStreamCreation({
        apiServices,
        esClient,
        templateName,
        createdStreamName,
      });
    }
  });
});
