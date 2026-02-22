/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';
import { socManagerRole } from '../common/roles';
import { waitForPageReady } from '../common/constants';

test.describe(
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
      test.setTimeout(360_000);

      await test.step('Navigate to osquery', async () => {
        await page.gotoApp('osquery');
        await waitForPageReady(page);
      });

      await test.step('Click New live query', async () => {
        await page.testSubj.locator('newLiveQueryButton').click();
        await waitForPageReady(page);
      });

      await test.step('Select all agents', async () => {
        await pageObjects.liveQuery.selectAllAgents();
      });

      await test.step('Input query', async () => {
        await pageObjects.liveQuery.inputQuery('select * from uptime;');
      });

      // Click Advanced to expand the ECS mapping section
      await page.testSubj.locator('advanced-accordion-content').click();

      // First ECS mapping row: tags -> Static value "test1, test2"
      await pageObjects.liveQuery.typeInECSFieldInput('tags', 0);

      // Switch the value type to "Static value" via the EuiSuperSelect
      await page.testSubj.locator('osquery-result-type-select-0').click();
      await page.getByRole('option', { name: 'Static value' }).click();

      // Type static values
      const staticInput = page.testSubj
        .locator('osqueryColumnValueSelect')
        // eslint-disable-next-line playwright/no-nth-methods -- selecting ECS column value by index
        .nth(0)
        .locator('[data-test-subj="comboBoxSearchInput"]');
      await staticInput.click();
      await staticInput.pressSequentially('test1');
      await page.keyboard.press('Enter');
      await staticInput.pressSequentially('test2');
      await page.keyboard.press('Enter');

      await pageObjects.liveQuery.submitQuery();
      await pageObjects.liveQuery.checkResults();
      await expect(page.getByText('[ "test1", "test2" ]')).toBeVisible();

      // Second ECS mapping row: client.domain -> Static value "test3"
      await pageObjects.liveQuery.typeInECSFieldInput('client.domain', 1);

      // Switch the second value type to "Static value" via the EuiSuperSelect
      await page.testSubj.locator('osquery-result-type-select-1').click();
      await page.getByRole('option', { name: 'Static value' }).click();

      const staticInput2 = page.testSubj
        .locator('osqueryColumnValueSelect')
        // eslint-disable-next-line playwright/no-nth-methods -- selecting ECS column value by index
        .nth(1)
        .locator('[data-test-subj="comboBoxSearchInput"]');
      await staticInput2.click();
      await staticInput2.pressSequentially('test3');
      await page.keyboard.press('Enter');

      await pageObjects.liveQuery.submitQuery();
      await pageObjects.liveQuery.checkResults();
      await expect(page.getByText('[ "test1", "test2" ]')).toBeVisible();
      await expect(page.getByText('test3')).toBeVisible();

      // Remove "test1" from the first static value
      await page.locator('[title="Remove test1 from selection in this group"]').click();

      await pageObjects.liveQuery.submitQuery();
      await pageObjects.liveQuery.checkResults();
      await expect(page.getByText('[ "test2" ]')).toBeVisible();
      await expect(page.getByText('test3')).toBeVisible();
    });

    test('should hide and show ecs mappings on Advanced accordion click', async ({
      page,
      pageObjects,
    }) => {
      await page.gotoApp('osquery');
      await waitForPageReady(page);
      await page.testSubj.locator('newLiveQueryButton').click();
      await waitForPageReady(page);

      await pageObjects.liveQuery.selectAllAgents();

      // Select the "users_elastic" saved query which has ECS mappings
      const savedQuerySelect = page.testSubj.locator('savedQuerySelect');
      const searchInput = savedQuerySelect.locator('[data-test-subj="comboBoxSearchInput"]');
      for (let attempt = 0; attempt < 5; attempt++) {
        await searchInput.click();
        await page.testSubj
          .locator('globalLoadingIndicator')
          .waitFor({ state: 'hidden', timeout: 15_000 })
          .catch(() => {});
        await searchInput.fill('');
        await searchInput.pressSequentially('users_elastic');
        const option = page.locator('[role="option"]').filter({ hasText: 'users_elastic' });
        try {
          await option.waitFor({ state: 'visible', timeout: 10_000 });
          await option.click();
          break;
        } catch {
          await searchInput.press('Escape');
          await page.testSubj
            .locator('globalLoadingIndicator')
            .waitFor({ state: 'hidden', timeout: 5_000 })
            .catch(() => {});
          if (attempt === 4) {
            // Final attempt — let it fail with clear error
            await searchInput.click();
            await searchInput.fill('');
            await searchInput.pressSequentially('users_elastic');
            await option.waitFor({ state: 'visible', timeout: 15_000 });
            await option.click();
          }
        }
      }

      // ECS mapping section should be visible
      await expect(
        page.getByText('Use the fields below to map results from this query to ECS fields.')
      ).toBeVisible();

      const advancedAccordion = page.testSubj.locator('advanced-accordion-content');
      const advancedToggle = advancedAccordion.locator('.euiAccordion__button');

      // Click Advanced to toggle/hide
      await advancedToggle.click();
      await expect(advancedToggle).toHaveAttribute('aria-expanded', 'false');

      // Click Advanced again to show
      await advancedToggle.click();
      await expect(advancedToggle).toHaveAttribute('aria-expanded', 'true');
      await expect(
        page.getByText('Use the fields below to map results from this query to ECS fields.')
      ).toBeVisible();
    });
  }
);
