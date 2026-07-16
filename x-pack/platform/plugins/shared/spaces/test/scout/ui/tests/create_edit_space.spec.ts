/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import { join } from 'path';

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

import { test } from '../fixtures';

const RUN_ID = randomUUID().slice(0, 8);
const AVATAR_PATH = join(__dirname, '../fixtures/acme_logo.png');

// The solution-view describe changes the side-nav type (es/classic), which is a
// stateful-classic-only concept: serverless projects have a fixed solution.
test.describe('Spaces Management: Create and Edit', { tag: tags.stateful.classic }, () => {
  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsAdmin();
  });

  test('creates a space with a given name', async ({ apiServices, pageObjects }) => {
    // The space id is auto-derived from the name (spaces -> hyphens). Keep the
    // token hyphen-free so it stays a single literal search term in the grid's
    // EuiSearchBar (a leading `-` in a token is parsed as negation).
    const token = `create${RUN_ID}`;
    const spaceName = `${token} space`;
    const spaceId = spaceName.replace(' ', '-');

    try {
      await pageObjects.spaces.gotoSpacesGrid();
      await pageObjects.spaces.clickCreateSpace();
      await expect(pageObjects.spaces.createPageLocator()).toBeVisible();

      await pageObjects.spaces.setSpaceName(spaceName);
      await pageObjects.spaces.changeSolutionView('classic');
      await pageObjects.spaces.saveSpace();

      // Filter after save: with parallel specs the deployment can hold more than
      // one page of spaces, so the new row may otherwise be paginated out of view.
      await expect(pageObjects.spaces.gridPageLocator()).toBeVisible();
      await pageObjects.spaces.filterSpacesGrid(token);
      await expect(pageObjects.spaces.spaceRowLocator(spaceId)).toBeVisible();
    } finally {
      await apiServices.spaces.delete(spaceId);
    }
  });

  test('allows changing space initials', async ({ apiServices, page, pageObjects }) => {
    const spaceId = `initials-${RUN_ID}`;
    await apiServices.spaces.create({ id: spaceId, name: `${spaceId} space` });

    try {
      await pageObjects.spaces.gotoEditSpace(spaceId);

      await test.step('edit space page has no accessibility violations', async () => {
        const { violations } = await page.checkA11y({ include: ['.kbnAppWrapper'] });
        expect(violations).toStrictEqual([]);
      });

      await pageObjects.spaces.setSpaceInitials('XX');
      await pageObjects.spaces.saveSpace();

      await expect(pageObjects.spaces.gridPageLocator()).toBeVisible();
      await expect(pageObjects.spaces.spaceAvatarLocator(spaceId)).toBeVisible();
      expect(await pageObjects.spaces.getSpaceAvatarText(spaceId)).toBe('XX');
    } finally {
      await apiServices.spaces.delete(spaceId);
    }
  });

  test('allows changing space avatar to an uploaded image', async ({
    apiServices,
    pageObjects,
  }) => {
    const spaceId = `avatar-${RUN_ID}`;
    await apiServices.spaces.create({ id: spaceId, name: `${spaceId} space` });

    try {
      await pageObjects.spaces.gotoEditSpace(spaceId);
      await pageObjects.spaces.uploadAvatar(AVATAR_PATH);
      await pageObjects.spaces.saveSpace();

      await expect(pageObjects.spaces.gridPageLocator()).toBeVisible();
      const avatar = pageObjects.spaces.spaceAvatarLocator(spaceId);
      await expect(avatar).toBeVisible();
      // An image avatar renders with role="img".
      await expect(avatar).toHaveAttribute('role', 'img');
    } finally {
      await apiServices.spaces.delete(spaceId);
    }
  });

  test('changing the space solution updates the side navigation', async ({
    apiServices,
    kbnUrl,
    page,
    pageObjects,
  }) => {
    // Use a dedicated space (entered as the active space) rather than the default
    // space so this test doesn't mutate global state other parallel specs rely on.
    const spaceId = `solution-${RUN_ID}`;
    await apiServices.spaces.create({ id: spaceId, name: `${spaceId} space` });

    const esSideNav = page.locator('[data-test-subj~="esSideNav"]');
    const mgtSideNav = page.testSubj.locator('mgtSideBarNav');
    const editUrl = kbnUrl.app(`management/kibana/spaces/edit/${spaceId}`, { space: spaceId });

    try {
      await page.goto(editUrl);
      await expect(pageObjects.spaces.viewPageLocator()).toBeVisible();
      await expect(page.testSubj.locator('spaces-view-page > generalPanel')).toBeVisible();
      await expect(page.testSubj.locator('spaces-view-page > navigationPanel')).toBeVisible();

      await test.step('starts on the classic side navigation', async () => {
        await expect(mgtSideNav).toBeVisible();
        await expect(esSideNav).toBeHidden();
      });

      await test.step('switches to the search solution side navigation', async () => {
        await pageObjects.spaces.changeSolutionView('es');
        await pageObjects.spaces.saveSpace();
        await pageObjects.spaces.confirmModal();

        await expect(esSideNav).toBeVisible();
        await expect(mgtSideNav).toBeHidden();
      });

      await test.step('switches back to classic, warning about user impact', async () => {
        await page.goto(editUrl);
        await expect(pageObjects.spaces.userImpactWarningLocator()).toBeHidden();

        await pageObjects.spaces.changeSolutionView('classic');
        // Switching an existing space warns that the change impacts other users.
        await expect(pageObjects.spaces.userImpactWarningLocator()).toBeVisible();

        await pageObjects.spaces.saveSpace();
        await pageObjects.spaces.confirmModal();

        await expect(mgtSideNav).toBeVisible();
        await expect(esSideNav).toBeHidden();
      });
    } finally {
      await apiServices.spaces.delete(spaceId);
    }
  });

  test('enabled features can be changed while the solution view remains unselected', async ({
    apiServices,
    page,
    pageObjects,
  }) => {
    const spaceId = `features-${RUN_ID}`;
    await apiServices.spaces.create({ id: spaceId, name: `${spaceId} space` });

    try {
      await pageObjects.spaces.gotoEditSpace(spaceId);

      // Security feature is enabled by default.
      expect(await pageObjects.spaces.isFeatureCategoryChecked('securitySolution')).toBe(true);

      // Do not set a solution view first — toggling a feature category directly.
      await pageObjects.spaces.toggleFeatureCategoryCheckbox('securitySolution');
      expect(await pageObjects.spaces.isFeatureCategoryChecked('securitySolution')).toBe(false);

      await test.step('feature category toggle has no accessibility violations', async () => {
        const { violations } = await page.checkA11y({ include: ['.kbnAppWrapper'] });
        expect(violations).toStrictEqual([]);
      });

      await test.step('expanded feature category has no accessibility violations', async () => {
        await pageObjects.spaces.openFeatureCategory('securitySolution');
        const { violations } = await page.checkA11y({ include: ['.kbnAppWrapper'] });
        expect(violations).toStrictEqual([]);
      });

      await expect(pageObjects.spaces.userImpactWarningLocator()).toBeVisible();

      await pageObjects.spaces.saveSpace();
      await pageObjects.spaces.confirmModal();

      // Re-open the edit page and confirm the feature is still unselected.
      await pageObjects.spaces.gotoEditSpace(spaceId);
      expect(await pageObjects.spaces.isFeatureCategoryChecked('securitySolution')).toBe(false);
    } finally {
      await apiServices.spaces.delete(spaceId);
    }
  });

  test('delete space confirm modal has no accessibility violations', async ({
    apiServices,
    page,
    pageObjects,
  }) => {
    const spaceId = `delete-${RUN_ID}`;
    await apiServices.spaces.create({ id: spaceId, name: `${spaceId} space` });

    try {
      await pageObjects.spaces.gotoEditSpace(spaceId);
      await pageObjects.spaces.clickDeleteSpaceOnEditPage();
      await expect(pageObjects.spaces.confirmDeleteModalLocator()).toBeVisible();

      const { violations } = await page.checkA11y({ include: ['.euiModal'] });
      expect(violations).toStrictEqual([]);

      await pageObjects.spaces.cancelModal();
    } finally {
      await apiServices.spaces.delete(spaceId);
    }
  });

  test('create space page has no accessibility violations', async ({ page, pageObjects }) => {
    await pageObjects.spaces.gotoSpacesGrid();
    await pageObjects.spaces.clickCreateSpace();
    await expect(pageObjects.spaces.createPageLocator()).toBeVisible();

    await pageObjects.spaces.setSpaceName(`a11y-${RUN_ID} space`);
    await pageObjects.spaces.changeSolutionView('classic');

    await test.step('create page', async () => {
      const { violations } = await page.checkA11y({ include: ['.kbnAppWrapper'] });
      expect(violations).toStrictEqual([]);
    });

    await test.step('color picker', async () => {
      await pageObjects.spaces.clickColorPicker();
      const { violations } = await page.checkA11y({ include: ['.kbnAppWrapper'] });
      expect(violations).toStrictEqual([]);
      await page.keyboard.press('Escape');
    });
  });
});
