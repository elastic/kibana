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
import { mockEmptyPipelinesList } from '../fixtures/mocks';

const MISSING_CUSTOM_PIPELINE_NAME = 'read-only-missing@custom';

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
    await expect(
      ingestPipelines.pipelineRowSelectionCheckbox(testData.TEST_PIPELINE_NAME)
    ).toBeHidden();
    await expect(ingestPipelines.pipelineRowEditAction(testData.TEST_PIPELINE_NAME)).toBeHidden();

    await ingestPipelines.openPipelineDetailsByName(testData.TEST_PIPELINE_NAME);
    await expect(ingestPipelines.detailsFlyout).toBeVisible();
    await expect(ingestPipelines.editPipelineButton).toBeHidden();
    await expect(ingestPipelines.detailsPanelFooter).toBeHidden();
  });

  test('user with only read_pipeline is shown the list instead of the create form', async ({
    pageObjects,
  }) => {
    const { ingestPipelines } = pageObjects;

    await ingestPipelines.gotoSubPath('create');

    await expect
      .poll(async () =>
        ingestPipelines.getPipelinesList({ searchFor: testData.TEST_PIPELINE_NAME })
      )
      .toContain(testData.TEST_PIPELINE_NAME);
    await expect(ingestPipelines.createFormNameField).toBeHidden();
  });

  test('user with only read_pipeline is not offered to create a missing custom pipeline', async ({
    pageObjects,
  }) => {
    const { ingestPipelines } = pageObjects;

    await ingestPipelines.openPipelineFlyoutFromUrl(MISSING_CUSTOM_PIPELINE_NAME);

    await expect(ingestPipelines.missingCustomPipelineCallout).toBeVisible();
    await expect(ingestPipelines.createCustomPipelineButton).toBeHidden();
  });

  test('user with only read_pipeline sees the read-only empty state', async ({
    page,
    pageObjects,
  }) => {
    const { ingestPipelines } = pageObjects;

    await mockEmptyPipelinesList(page);
    await ingestPipelines.goto();

    await expect(ingestPipelines.emptyListPrompt).toContainText('No ingest pipelines');
    await expect(ingestPipelines.createPipelineDropdown).toBeHidden();
  });
});
