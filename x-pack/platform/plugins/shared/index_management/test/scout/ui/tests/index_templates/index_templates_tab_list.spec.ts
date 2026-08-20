/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../../fixtures';

const PIPELINE_TEMPLATE_NAME = 'a_test_template';

test.describe('Index templates tab - templates list', { tag: tags.deploymentAgnostic }, () => {
  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsIndexManagementUser();
  });

  test.afterEach(async ({ esClient }) => {
    await esClient.indices.deleteIndexTemplate({ name: PIPELINE_TEMPLATE_NAME }, { ignore: [404] });
  });

  test('shows link to ingest pipeline when default pipeline is set', async ({
    esClient,
    page,
    pageObjects,
  }) => {
    // Seed a template with a default pipeline before loading the tab, so the list includes it.
    await esClient.indices.putIndexTemplate({
      name: PIPELINE_TEMPLATE_NAME,
      index_patterns: [`index_pattern_${Date.now()}`],
      template: { settings: { default_pipeline: 'test_pipeline' } },
    });
    await pageObjects.indexManagement.navigateToIndexManagementTab('templates');

    // Open the details flyout and follow the linked ingest pipeline
    await pageObjects.indexManagement.clickTemplateDetailsLink(PIPELINE_TEMPLATE_NAME);
    await page.testSubj.locator('linkedIngestPipeline').click();

    await expect(page).toHaveURL(/\/ingest\/ingest_pipelines\/edit\/test_pipeline/);
  });
});
