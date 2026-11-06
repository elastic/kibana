/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';

test.describe('Appearance selector modal', { tag: tags.stateful.classic }, () => {
  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsViewer();
    await pageObjects.home.goto();
  });

  test.afterAll(async ({ uiSettings }) => {
    // Reset the space-default dark mode back to the system default
    await uiSettings.unset('theme:darkMode');
  });

  test('has 4 color mode options', async ({ pageObjects }) => {
    const { appearance } = pageObjects;

    await appearance.open();

    for (const mode of ['light', 'dark', 'system', 'space_default'] as const) {
      expect(await appearance.isColorModeOptionVisible(mode)).toBe(true);
    }

    await appearance.discard();
  });

  test('color mode changes affect the rendered theme', async ({
    pageObjects,
    uiSettings,
    page,
  }) => {
    const { appearance } = pageObjects;

    await test.step('dark mode is applied after selecting dark', async () => {
      await appearance.open();
      await appearance.selectColorMode('dark');
      await appearance.save();
      await page.reload();
      expect(await appearance.getThemeTag()).toBe('borealisdark');
    });

    await test.step('light mode is applied after selecting light', async () => {
      await appearance.open();
      await appearance.selectColorMode('light');
      await appearance.save();
      await page.reload();
      expect(await appearance.getThemeTag()).toBe('borealislight');
    });

    await test.step('space_default follows the space theme:darkMode setting', async () => {
      // Set the space default theme to dark
      await uiSettings.set({ 'theme:darkMode': 'enabled' });

      // User profile is on light; switch to space_default to inherit the space theme
      await appearance.open();
      await appearance.selectColorMode('space_default');
      await appearance.save();
      await page.reload();
      expect(await appearance.getThemeTag()).toBe('borealisdark');
    });
  });
});
