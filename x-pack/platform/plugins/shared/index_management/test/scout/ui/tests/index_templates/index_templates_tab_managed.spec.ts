/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../../fixtures';

// Stateful only: the managed template this asserts on (`ilm-history-7`) is installed by ILM, which
// serverless does not have.
test.describe('Index templates tab - managed templates', { tag: tags.stateful.classic }, () => {
  test('shows warning callout when deleting a managed index template', async ({
    browserAuth,
    page,
    pageObjects,
  }) => {
    await browserAuth.loginAsIndexManagementUser();
    await pageObjects.indexManagement.navigateToIndexManagementTab('templates');

    // Open the flyout for a managed index template (present on every stateful cluster)
    await pageObjects.indexManagement.clickTemplateDetailsLink('ilm-history-7');

    await page.testSubj.locator('manageTemplateButton').click();
    await page.testSubj.locator('deleteIndexTemplateButton').click();

    await expect(page.testSubj.locator('deleteManagedAssetsCallout')).toBeVisible();
  });
});
