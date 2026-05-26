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

test.describe('Ingest pipelines tree details', { tag: tags.stateful.classic }, () => {
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

  test('displays the structure tree when the pipeline has Pipeline processors', async ({
    pageObjects,
  }) => {
    await pageObjects.ingestPipelines.openPipelineDetailsByName(testData.TREE_PIPELINE_NAME);

    await expect(pageObjects.ingestPipelines.pipelineTreePanel).toBeVisible();
  });

  test('does not display the structure tree when the pipeline has no Pipeline processors', async ({
    pageObjects,
  }) => {
    await pageObjects.ingestPipelines.openPipelineDetailsByName(testData.TEST_PIPELINE_NAME);

    await expect(pageObjects.ingestPipelines.pipelineTreePanel).toBeHidden();
    await expect(pageObjects.ingestPipelines.treeNode(testData.TREE_PIPELINE_NAME)).toBeHidden();
    await expect(pageObjects.ingestPipelines.treeNode(testData.TEST_PIPELINE_NAME)).toBeHidden();
  });

  test('opens the details panel for the selected tree node', async ({ pageObjects }) => {
    await pageObjects.ingestPipelines.openPipelineDetailsByName(testData.TREE_PIPELINE_NAME);

    await expect(pageObjects.ingestPipelines.pipelineTreePanel).toBeVisible();
    await expect(pageObjects.ingestPipelines.treeNode(testData.TEST_PIPELINE_NAME)).toBeVisible();
    expect(await pageObjects.ingestPipelines.getDetailsFlyoutTitle()).toBe(
      testData.TREE_PIPELINE_NAME
    );

    await pageObjects.ingestPipelines.clickTreeNode(testData.TEST_PIPELINE_NAME);
    await pageObjects.ingestPipelines.waitForDetailsFlyoutTitle(testData.TEST_PIPELINE_NAME);

    expect(await pageObjects.ingestPipelines.getDetailsFlyoutTitle()).toBe(
      testData.TEST_PIPELINE_NAME
    );
  });
});
