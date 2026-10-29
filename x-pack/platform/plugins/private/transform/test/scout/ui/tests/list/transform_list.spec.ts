/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test, testData } from '../../fixtures';

test.describe('Transform list', { tag: tags.deploymentAgnostic }, () => {
  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsTransformManager();
  });

  test('renders the list and opens the creation wizard', async ({ page, pageObjects, config }) => {
    const { transformManagement, transformWizard } = pageObjects;

    await test.step('loads the transform list page', async () => {
      await transformManagement.goto();
      expect(page.url()).toContain('/transform');
      await expect(transformManagement.statsBar).toBeVisible();
      await expect(transformManagement.createButton).toBeVisible();
    });

    await test.step('opens the wizard for the selected data view', async () => {
      await transformManagement.startTransformCreation('pivot');
      await transformManagement.selectSource(testData.DATA_VIEWS.ECOMMERCE.title);
      await expect(transformWizard.useFullDataButton).toBeVisible();
      // Data tiers don't exist on serverless.
      await expect(transformWizard.dataTierOptionsButton).toBeVisible({
        visible: !config.serverless,
      });
    });
  });

  test('is found through the global search', async ({ pageObjects }) => {
    const { transformManagement } = pageObjects;

    await transformManagement.goto();
    await transformManagement.searchGlobally('transform');
    const { globalSearchResultLabels } = transformManagement;
    await expect(globalSearchResultLabels.filter({ hasText: 'Transforms' })).toBeVisible();
    const [firstLabel] = await globalSearchResultLabels.allTextContents();
    expect(firstLabel).toContain('Transforms');
  });
});
