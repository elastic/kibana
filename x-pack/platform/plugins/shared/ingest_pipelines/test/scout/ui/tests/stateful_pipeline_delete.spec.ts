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

test.describe('Ingest pipelines delete', { tag: tags.stateful.classic }, () => {
  test.beforeAll(async ({ esClient }) => {
    await esClient.ingest.putPipeline({
      id: testData.MANAGED_PIPELINE_NAME,
      _meta: { managed: true },
      processors: [],
    });
  });

  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsIngestPipelinesUser();
    await pageObjects.ingestPipelines.goto();
  });

  test.afterAll(async ({ esClient }) => {
    await deletePipeline({ esClient, pipelineName: testData.MANAGED_PIPELINE_NAME });
  });

  test('shows warning callout when deleting a managed pipeline', async ({ pageObjects }) => {
    await pageObjects.ingestPipelines.filterByManaged();
    await pageObjects.ingestPipelines.openPipelineDetailsByName(testData.MANAGED_PIPELINE_NAME);
    await pageObjects.ingestPipelines.clickDeletePipelineAction();
    await expect(pageObjects.ingestPipelines.deleteManagedAssetsCallout).toBeVisible();
  });
});
