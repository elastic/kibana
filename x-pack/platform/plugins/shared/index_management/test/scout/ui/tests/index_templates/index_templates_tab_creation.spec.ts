/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../../fixtures';

const INDEX_TEMPLATE_NAME = 'index-template-test-name';
const DEFAULT_SNAPSHOT_REPOSITORY_NAME = 'index-template-test-default-repo';
// ECH has no node-local `path.repo`, so reuse the managed repository it ships with (never create it).
const CLOUD_DEFAULT_SNAPSHOT_REPOSITORY_NAME = 'found-snapshots';

const enableDataStream = async (page: ScoutPage) => {
  const dataStreamSwitch = page.testSubj
    .locator('dataStreamField')
    .locator('[data-test-subj="input"]');
  if (!(await dataStreamSwitch.isChecked())) {
    await dataStreamSwitch.click();
  }
  await expect(dataStreamSwitch).toBeChecked();
  // The delete phase card is always rendered once the data lifecycle section is shown; it can be
  // below the fold.
  await page.testSubj.locator('dlmPhasesSelectorDeletePhaseCard').scrollIntoViewIfNeeded();
};

// Stateful only: serverless renders the phase selector without the hot and frozen phase cards, so
// neither the frozen phase nor the "2 data phases" lifecycle summary exists there.
test.describe('Index templates tab - template creation', { tag: tags.stateful.classic }, () => {
  // A default snapshot repository must exist for the data-lifecycle frozen phase card to render.
  test.beforeAll(async ({ esClient, config }) => {
    if (config.isCloud) {
      await esClient.cluster.putSettings({
        persistent: { 'repositories.default_repository': CLOUD_DEFAULT_SNAPSHOT_REPOSITORY_NAME },
      });
      return;
    }
    // `/tmp/repo` is one of the locations Scout's local stateful ES allows via `path.repo`.
    await esClient.snapshot.createRepository({
      name: DEFAULT_SNAPSHOT_REPOSITORY_NAME,
      repository: { type: 'fs', settings: { location: '/tmp/repo' } },
      verify: false,
    });
    await esClient.cluster.putSettings({
      persistent: { 'repositories.default_repository': DEFAULT_SNAPSHOT_REPOSITORY_NAME },
    });
  });

  // Open the wizard and complete the required step-1 fields.
  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsIndexManagementUser();
    await pageObjects.indexManagement.navigateToIndexManagementTab('templates');
    await pageObjects.indexManagement.indexTemplateWizard.open(INDEX_TEMPLATE_NAME, 'test-1');
  });

  test.afterEach(async ({ esClient }) => {
    await esClient.indices.deleteIndexTemplate({ name: INDEX_TEMPLATE_NAME }, { ignore: [404] });
  });

  test.afterAll(async ({ esClient, config }) => {
    await esClient.cluster.putSettings({
      persistent: { 'repositories.default_repository': null },
    });
    // Only remove the `fs` repository the local branch created; never the managed Cloud one.
    if (!config.isCloud) {
      await esClient.snapshot.deleteRepository(
        { name: DEFAULT_SNAPSHOT_REPOSITORY_NAME },
        { ignore: [404] }
      );
    }
  });

  test('can create an index template with data retention', async ({ page, pageObjects }) => {
    // Data lifecycle is only available for data stream templates, so enable it first
    await enableDataStream(page);

    // Enable the delete (data retention) phase and set the retention to 7 hours
    await page.testSubj.locator('dlmPhasesSelectorDeletePhaseCard').click();
    await page.testSubj.fill('deleteDurationValue', '7');
    await page.testSubj.locator('deleteDurationUnit').selectOption('h');

    await expect(page.testSubj.locator('totalRetentionBadge')).toHaveText('7h');

    // Navigate to the last step of the wizard
    await page.testSubj.locator('formWizardStep-5').click();
    await expect(page.testSubj.locator('lifecycleValue')).toHaveText('7 hours · 2 data phases');

    // Save it, and check the created template's details flyout
    await pageObjects.indexManagement.clickNextButton();
    await expect(page.testSubj.locator('title')).toContainText(INDEX_TEMPLATE_NAME);
    await page.testSubj.locator('closeDetailsButton').click();
  });

  test('can create a data stream index template with a frozen phase', async ({
    page,
    pageObjects,
  }) => {
    await enableDataStream(page);

    // Move data to the frozen phase after 30 days
    await page.testSubj.locator('dlmPhasesSelectorFrozenPhaseCard').scrollIntoViewIfNeeded();
    await page.testSubj.locator('dlmPhasesSelectorFrozenPhaseCard').click();
    await page.testSubj.fill('frozenDurationValue', '30');
    await page.testSubj.locator('frozenDurationUnit').selectOption('d');

    // Navigate to the last step of the wizard and inspect the request that would be sent
    await page.testSubj.locator('formWizardStep-5').click();
    await page.testSubj.locator('stepReviewRequestTab').click();

    await expect(page.testSubj.locator('requestTab')).toContainText('"frozen_after": "30d"');

    // Save it, and check the created template's details flyout
    await pageObjects.indexManagement.clickNextButton();
    await expect(page.testSubj.locator('title')).toContainText(INDEX_TEMPLATE_NAME);
    await page.testSubj.locator('closeDetailsButton').click();
  });
});
