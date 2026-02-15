/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/* eslint-disable playwright/no-nth-methods */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';
import { socManagerRole } from '../common/roles';
import { waitForPageReady } from '../common/constants';

// FLAKY: https://github.com/elastic/kibana/issues/218380
test.describe.skip(
  'EcsMapping',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginWithCustomRole(socManagerRole);
    });

    test('should properly show static values in form and results', async ({
      page,
      pageObjects,
    }) => {
      test.setTimeout(180_000);

      await page.gotoApp('osquery');
      await waitForPageReady(page);
      await page.getByText('New live query').first().click();
      await waitForPageReady(page);

      await pageObjects.liveQuery.selectAllAgents();
      await pageObjects.liveQuery.inputQuery('select * from processes;');

      // Click Advanced to expand the ECS mapping section
      await page.testSubj.locator('advanced-accordion-content').click();

      // First ECS mapping row: tags -> Static value "test1, test2"
      await pageObjects.liveQuery.typeInECSFieldInput('tags', 0);

      // Select "Static value" from the osquery field type dropdown
      const fieldTypeSelect = page.testSubj.locator('osqueryColumnValueSelect').nth(0);
      await fieldTypeSelect.locator('[data-test-subj="comboBoxInput"]').click();
      await page
        .getByRole('option', { name: /Static value/i })
        .first()
        .click();

      // Type static values
      const staticInput = page.testSubj
        .locator('osqueryColumnValueSelect')
        .nth(0)
        .locator('[data-test-subj="comboBoxInput"]');
      await staticInput.click();
      await staticInput.pressSequentially('test1');
      await page.keyboard.press('Enter');
      await staticInput.pressSequentially('test2');
      await page.keyboard.press('Enter');

      await pageObjects.liveQuery.submitQuery();
      await pageObjects.liveQuery.checkResults();
      await expect(page.getByText('[ "test1", "test2" ]').first()).toBeVisible();

      // Second ECS mapping row: client.domain -> Static value "test3"
      await pageObjects.liveQuery.typeInECSFieldInput('client.domain', 1);

      const fieldTypeSelect2 = page.testSubj.locator('osqueryColumnValueSelect').nth(1);
      await fieldTypeSelect2.locator('[data-test-subj="comboBoxInput"]').click();
      await page
        .getByRole('option', { name: /Static value/i })
        .first()
        .click();

      const staticInput2 = page.testSubj
        .locator('osqueryColumnValueSelect')
        .nth(1)
        .locator('[data-test-subj="comboBoxInput"]');
      await staticInput2.click();
      await staticInput2.pressSequentially('test3');
      await page.keyboard.press('Enter');

      await pageObjects.liveQuery.submitQuery();
      await pageObjects.liveQuery.checkResults();
      await expect(page.getByText('[ "test1", "test2" ]').first()).toBeVisible();
      await expect(page.getByText('test3').first()).toBeVisible();

      // Remove "test1" from the first static value
      await page.locator('[title="Remove test1 from selection in this group"]').click();

      await pageObjects.liveQuery.submitQuery();
      await pageObjects.liveQuery.checkResults();
      await expect(page.getByText('[ "test2" ]').first()).toBeVisible();
      await expect(page.getByText('test3').first()).toBeVisible();
    });

    test('should hide and show ecs mappings on Advanced accordion click', async ({
      page,
      pageObjects,
    }) => {
      await page.gotoApp('osquery');
      await waitForPageReady(page);
      await page.getByText('New live query').first().click();
      await waitForPageReady(page);

      await pageObjects.liveQuery.selectAllAgents();

      // Select the "processes_elastic" saved query
      const savedQuerySelect = page.testSubj.locator('savedQuerySelect');
      const comboBox = savedQuerySelect.locator('[data-test-subj="comboBoxInput"]');
      await comboBox.click();
      await comboBox.pressSequentially('processes_elastic');
      const option = page.getByRole('option', { name: /processes_elastic/i }).first();
      await option.waitFor({ state: 'visible', timeout: 15_000 });
      await option.click();

      // ECS mapping section should be visible
      await expect(
        page.getByText('Use the fields below to map results from this query to ECS fields.').first()
      ).toBeVisible();

      // Click Advanced to toggle/hide
      await page.getByText('Advanced').first().click();
      await expect(
        page.getByText('Use the fields below to map results from this query to ECS fields.').first()
      ).not.toBeVisible();

      // Click Advanced again to show
      await page.getByText('Advanced').first().click();
      await expect(
        page.getByText('Use the fields below to map results from this query to ECS fields.').first()
      ).toBeVisible();
    });
  }
);
