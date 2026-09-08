/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

/**
 * Makes an AppMenu item visible, opening the overflow popover when it is not inline.
 * Share, Export, Inspect, and Open in Discover live in the overflow on classic chrome.
 */
export async function revealLensAppMenuItem(page: ScoutPage, testId: string): Promise<Locator> {
  const item = page.testSubj.locator(testId);
  if (await item.isVisible()) {
    return item;
  }

  const overflowButton = page.testSubj.locator('app-menu-overflow-button');
  const popover = page.testSubj.locator('app-menu-popover');

  if (await popover.isVisible()) {
    await overflowButton.click();
    await expect(popover).toBeHidden();
  }

  await expect(overflowButton).toBeVisible();
  await overflowButton.click();

  const popoverOpened = await popover
    .waitFor({ state: 'visible', timeout: 2000 })
    .then(() => true)
    .catch(() => false);
  if (!popoverOpened) {
    await overflowButton.click();
  }

  await expect(popover).toBeVisible();
  await expect(item).toBeVisible();
  return item;
}

/**
 * Clicks an AppMenu item, opening the overflow popover when the control is not inline.
 * Mirrors Discover/Dashboard Scout `clickAppMenuItem` for Lens classic chrome.
 */
export async function clickLensAppMenuItem(page: ScoutPage, testId: string): Promise<void> {
  const item = await revealLensAppMenuItem(page, testId);
  await item.click();
}
