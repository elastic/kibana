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

test.describe('Ingest pipelines read-only access', { tag: tags.stateful.classic }, () => {
  test.beforeAll(async ({ esClient }) => {
    await esClient.ingest.putPipeline({
      id: testData.TEST_PIPELINE_NAME,
      processors: [],
    });
  });

  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsReadPipelineUser();
    await pageObjects.ingestPipelines.goto();
  });

  test.afterAll(async ({ esClient }) => {
    await deletePipeline({ esClient, pipelineName: testData.TEST_PIPELINE_NAME });
  });

  test('user with only read_pipeline can view pipelines without management actions', async ({
    pageObjects,
  }) => {
    const { ingestPipelines } = pageObjects;

    await expect(ingestPipelines.appTitle).toHaveText('Ingest pipelines');
    await expect
      .poll(async () =>
        ingestPipelines.getPipelinesList({ searchFor: testData.TEST_PIPELINE_NAME })
      )
      .toContain(testData.TEST_PIPELINE_NAME);
    await expect(ingestPipelines.createPipelineDropdown).toBeHidden();

    await ingestPipelines.openPipelineDetailsByName(testData.TEST_PIPELINE_NAME);
    await expect(ingestPipelines.detailsFlyout).toBeVisible();
    await expect(ingestPipelines.editPipelineButton).toBeHidden();
    await expect(ingestPipelines.detailsPanelFooter).toBeHidden();
  });
});
