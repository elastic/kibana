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

// Failing: See https://github.com/elastic/kibana/issues/267280
test.describe.skip('Tags management — accessibility', { tag: tags.stateful.classic }, () => {
  test.afterAll(async ({ kbnClient }) => {
    await kbnClient.savedObjects.cleanStandardList();
  });

  test('tags management page a11y', async ({ page, browserAuth, pageObjects, kbnUrl }) => {
    await browserAuth.loginAsPrivilegedUser();
    await page.goto(kbnUrl.app('management/kibana/tags'));
    await pageObjects.tagManagement.waitForTableLoaded();

    await test.step('main page', async () => {
      const { violations } = await page.checkA11y({ include: A11Y_SELECTORS });
      expect(violations).toStrictEqual([]);
    });

    await test.step('create tag panel', async () => {
      await pageObjects.tagManagement.openCreateModal();
      const { violations } = await page.checkA11y({ include: A11Y_SELECTORS });
      expect(violations).toStrictEqual([]);
    });

    await test.step('tag listing after creation', async () => {
      await pageObjects.tagManagement.fillForm(
        { name: 'a11yTag', color: '#fc03db', description: 'a11y test tag' },
        { submit: true }
      );
      const { violations } = await page.checkA11y({ include: A11Y_SELECTORS });
      expect(violations).toStrictEqual([]);
    });

    await test.step('tag actions panel', async () => {
      await pageObjects.tagManagement.openCollapsedRowMenu(0);
      const { violations } = await page.checkA11y({ include: A11Y_SELECTORS });
      expect(violations).toStrictEqual([]);
      await page.keyboard.press('Escape');
    });

    await test.step('tag assignment flyout and listing', async () => {
      await pageObjects.tagManagement.openCollapsedRowMenu(0);
      await pageObjects.tagManagement.clickActionItem('assign');
      const { violations: flyoutViolations } = await page.checkA11y({ include: A11Y_SELECTORS });
      expect(flyoutViolations).toStrictEqual([]);
      await page.testSubj.click('euiFlyoutCloseButton');
      await pageObjects.tagManagement.getAssignFlyoutCloseButton().waitFor({ state: 'hidden' });
      const { violations: pageViolations } = await page.checkA11y({ include: A11Y_SELECTORS });
      expect(pageViolations).toStrictEqual([]);
    });

    await test.step('edit tag panel', async () => {
      await pageObjects.tagManagement.openCollapsedRowMenu(0);
      await pageObjects.tagManagement.clickActionItem('edit');
      await pageObjects.tagManagement.getTagModalForm().waitFor({ state: 'visible' });
      const { violations } = await page.checkA11y({ include: A11Y_SELECTORS });
      expect(violations).toStrictEqual([]);
      await page.testSubj.click('createModalCancelButton');
    });

    await test.step('bulk actions panel', async () => {
      await pageObjects.tagManagement.openCreateModal();
      await pageObjects.tagManagement.fillForm(
        { name: 'a11yTag2', color: '#fc04db', description: 'a11y test tag 2' },
        { submit: true }
      );
      await pageObjects.tagManagement.selectAllTags();
      await pageObjects.tagManagement.openBulkActionMenu();
      const { violations } = await page.checkA11y({ include: A11Y_SELECTORS });
      expect(violations).toStrictEqual([]);
    });

    await test.step('delete tags confirmation panel', async () => {
      await page.testSubj.click('actionBar-button-delete');
      const { violations } = await page.checkA11y({ include: A11Y_SELECTORS });
      expect(violations).toStrictEqual([]);
      await page.testSubj.click('confirmModalConfirmButton');
    });
  });
});
