/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test, testData } from '../fixtures';

test.describe('Ingest pipelines delete', { tag: tags.stateful.classic }, () => {
  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginWithCustomRole(testData.INGEST_PIPELINES_USER_ROLE);
    await pageObjects.ingestPipelines.goto();
  });

  test('shows warning callout when deleting a managed pipeline', async ({ pageObjects }) => {
    await pageObjects.ingestPipelines.filterByManaged();
    await pageObjects.ingestPipelines.openFirstPipelineDetails();
    await pageObjects.ingestPipelines.clickDeletePipelineAction();
    await expect(pageObjects.ingestPipelines.deleteManagedAssetsCallout).toBeVisible();
  });
});
