/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { deletePipeline } from '../../helpers';
import { test, testData } from '../fixtures';

test.describe('Ingest pipelines stateful list URL behavior', { tag: tags.stateful.classic }, () => {
  test.beforeAll(async ({ esClient }) => {
    await esClient.ingest.putPipeline({
      id: testData.TEST_PIPELINE_NAME,
      processors: [],
    });
  });

  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsIngestPipelinesUser();
    await pageObjects.ingestPipelines.goto();
  });

  test.afterAll(async ({ esClient }) => {
    await deletePipeline({ esClient, pipelineName: testData.TEST_PIPELINE_NAME });
  });

  test('adds pipeline query param when flyout is opened and removes it when closed', async ({
    page,
    pageObjects,
  }) => {
    await pageObjects.ingestPipelines.openPipelineDetailsByName(testData.TEST_PIPELINE_NAME);

    await expect.poll(() => page.url()).toContain(`pipeline=${testData.TEST_PIPELINE_NAME}`);

    await pageObjects.ingestPipelines.closePipelineDetailsFlyout();

    await expect.poll(() => page.url()).not.toContain(`pipeline=${testData.TEST_PIPELINE_NAME}`);
  });

  test('sets query params for search and filters when changed', async ({ page, pageObjects }) => {
    await pageObjects.ingestPipelines.searchPipelineList('test');

    await expect.poll(() => page.url()).toContain('queryText=test');

    await pageObjects.ingestPipelines.filterByManaged();

    await expect.poll(() => page.url()).toContain('managed=on');
  });

  test('removes only pipeline query param and leaves other query params', async ({
    page,
    pageObjects,
  }) => {
    await pageObjects.ingestPipelines.searchPipelineList('test');
    await pageObjects.ingestPipelines.openPipelineDetailsByName(testData.TEST_PIPELINE_NAME);

    await expect.poll(() => page.url()).toContain(`pipeline=${testData.TEST_PIPELINE_NAME}`);
    await expect.poll(() => page.url()).toContain('queryText=test');

    await pageObjects.ingestPipelines.closePipelineDetailsFlyout();

    await expect.poll(() => page.url()).toContain('queryText=test');
    await expect.poll(() => page.url()).not.toContain(`pipeline=${testData.TEST_PIPELINE_NAME}`);
  });

  test('opens the details flyout through the URL', async ({ page, pageObjects }) => {
    await page.goto(`${page.url()}?pipeline=${testData.TEST_PIPELINE_NAME}`);

    await pageObjects.ingestPipelines.waitForDetailsFlyoutTitle(testData.TEST_PIPELINE_NAME);
    await expect(pageObjects.ingestPipelines.detailsFlyout).toBeVisible();
  });
});
