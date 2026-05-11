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

const sharedDeploymentTags = [
  ...tags.stateful.classic,
  ...tags.serverless.observability.complete,
  ...tags.serverless.search,
  ...tags.serverless.security.complete,
];

test.describe('Ingest pipelines home and list', { tag: sharedDeploymentTags }, () => {
  test.beforeAll(async ({ esClient }) => {
    await esClient.ingest.putPipeline({
      id: testData.TEST_PIPELINE_NAME,
      processors: [],
    });
    await esClient.ingest.putPipeline({
      id: testData.TREE_PIPELINE_NAME,
      processors: testData.TREE_PIPELINE.processors,
    });
  });

  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsIngestPipelinesUser();
    await pageObjects.ingestPipelines.goto();
  });

  test.afterAll(async ({ esClient }) => {
    await deletePipeline({ esClient, pipelineName: testData.TEST_PIPELINE_NAME });
    await deletePipeline({ esClient, pipelineName: testData.TREE_PIPELINE_NAME });
  });

  test('loads the app', async ({ pageObjects, log }) => {
    await log.debug('Checking for section heading to say Ingest pipelines.');

    await expect(pageObjects.ingestPipelines.appTitle).toHaveText('Ingest pipelines');
  });

  test('displays the test pipeline in the list of pipelines', async ({ pageObjects }) => {
    await pageObjects.ingestPipelines.increasePipelineListPageSize();
    await expect
      .poll(async () =>
        pageObjects.ingestPipelines.getPipelinesList({
          searchFor: testData.TEST_PIPELINE_NAME,
        })
      )
      .toContain(testData.TEST_PIPELINE_NAME);
  });

  test('opens the details flyout', async ({ pageObjects, log }) => {
    await log.debug('Clicking the first pipeline in the list.');

    await pageObjects.ingestPipelines.openPipelineDetailsByName(testData.TEST_PIPELINE_NAME);

    await expect(pageObjects.ingestPipelines.detailsFlyout).toBeVisible();
  });
});
