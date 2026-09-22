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

test.describe('Ingest pipelines create flows', { tag: sharedDeploymentTags }, () => {
  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsIngestPipelinesUser();
    await pageObjects.ingestPipelines.goto();
  });

  test.afterEach(async ({ esClient }) => {
    await deletePipeline({ esClient, pipelineName: testData.TEST_PIPELINE_NAME });
  });

  test('creates a pipeline', async ({ pageObjects }) => {
    await pageObjects.ingestPipelines.createNewPipeline(testData.PIPELINE);
    await pageObjects.ingestPipelines.closePipelineDetailsFlyout();
    await pageObjects.ingestPipelines.increasePipelineListPageSize();
    const pipelinesList = await pageObjects.ingestPipelines.getPipelinesList({
      searchFor: testData.TEST_PIPELINE_NAME,
    });

    expect(pipelinesList).toContain(testData.PIPELINE.name);
  });

  test('creates a pipeline from CSV', async ({ pageObjects }) => {
    await pageObjects.ingestPipelines.createPipelineFromCsv(testData.PIPELINE_CSV);
    await pageObjects.ingestPipelines.closePipelineDetailsFlyout();
    await pageObjects.ingestPipelines.increasePipelineListPageSize();
    const pipelinesList = await pageObjects.ingestPipelines.getPipelinesList({
      searchFor: testData.TEST_PIPELINE_NAME,
    });

    expect(pipelinesList).toContain(testData.PIPELINE_CSV.name);
  });
});
