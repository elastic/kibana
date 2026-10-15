/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { tags } from '@kbn/scout';

import { test } from '../fixtures';

// Modals, flyouts, and context menus render in EUI portals outside .kbnAppWrapper.
const A11Y_SELECTORS = ['.kbnAppWrapper', '[data-euiportal="true"]'];

test.describe('Tags management — accessibility', { tag: tags.stateful.classic }, () => {
  test.afterAll(async ({ kbnClient }) => {
    await kbnClient.savedObjects.cleanStandardList();
  });

  test('tags management page a11y', async ({ page, browserAuth, pageObjects }) => {
    const { tagManagement } = pageObjects;
    const { tagModal, assignFlyout, tagsTable } = tagManagement;

    await browserAuth.loginAsPrivilegedUser();
    await tagManagement.goto();

    await test.step('main page', async () => {
      const { violations } = await page.checkA11y({ include: A11Y_SELECTORS });
      expect(violations).toStrictEqual([]);
    });

    await test.step('create tag panel', async () => {
      await tagModal.openCreate();
      const { violations } = await page.checkA11y({ include: A11Y_SELECTORS });
      expect(violations).toStrictEqual([]);
    });

    await test.step('tag listing after creation', async () => {
      await tagModal.fillForm({ name: 'a11yTag', color: '#fc03db', description: 'a11y test tag' });
      await tagManagement.submitTagModal();
      const { violations } = await page.checkA11y({ include: A11Y_SELECTORS });
      expect(violations).toStrictEqual([]);
    });

    await test.step('tag assignment flyout and listing', async () => {
      await tagsTable.clickCollapsedRowAction('a11yTag', 'assign');
      await assignFlyout.waitForResultsLoaded();
      const { violations: flyoutViolations } = await page.checkA11y({ include: A11Y_SELECTORS });
      expect(flyoutViolations).toStrictEqual([]);
      await assignFlyout.closeButton.click();
      await assignFlyout.closeButton.waitFor({ state: 'hidden' });
      const { violations: pageViolations } = await page.checkA11y({ include: A11Y_SELECTORS });
      expect(pageViolations).toStrictEqual([]);
    });

    await test.step('edit tag panel', async () => {
      await tagsTable.clickRowAction('a11yTag', 'edit');
      await tagModal.form.waitFor({ state: 'visible' });
      const { violations } = await page.checkA11y({ include: A11Y_SELECTORS });
      expect(violations).toStrictEqual([]);
      await tagModal.cancel();
    });

    await test.step('bulk actions panel', async () => {
      await tagModal.openCreate();
      await tagModal.fillForm({
        name: 'a11yTag2',
        color: '#fc04db',
        description: 'a11y test tag 2',
      });
      await tagManagement.submitTagModal();
      await tagsTable.selectAllTags();
      await tagsTable.openBulkActionsMenu();
      await page.waitForFunction(
        () => document.querySelectorAll('[data-is-loading="true"]').length === 0
      );
      const { violations } = await page.checkA11y({ include: A11Y_SELECTORS });
      expect(violations).toStrictEqual([]);
    });

    await test.step('delete tags confirmation panel', async () => {
      await page.testSubj.click('actionBar-button-delete');
      await page.testSubj.locator('confirmModalConfirmButton').waitFor({ state: 'visible' });
      await page.waitForFunction(
        () => document.querySelectorAll('[data-is-loading="true"]').length === 0
      );
      const { violations } = await page.checkA11y({ include: A11Y_SELECTORS });
      expect(violations).toStrictEqual([]);
      await page.testSubj.click('confirmModalConfirmButton');
    });
  });
});
