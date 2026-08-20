/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';

export type QueryBarLanguage = 'kql' | 'lucene';

const LANGUAGE_MENU_LABEL: Record<QueryBarLanguage, string> = {
  kql: 'KQL',
  lucene: 'Lucene',
};

/**
 * Switches the unified-search query bar between KQL and Lucene via the query-bar menu.
 */
export async function switchQueryLanguage(
  page: ScoutPage,
  language: QueryBarLanguage
): Promise<void> {
  const menuButton = page.testSubj.locator('showQueryBarMenu');
  const menuPanel = page.testSubj.locator('queryBarMenuPanel');
  const languageItem = page.testSubj.locator(`${language}LanguageMenuItem`);
  const languageLabel = LANGUAGE_MENU_LABEL[language];

  await menuButton.click();
  await menuPanel.waitFor({ state: 'visible' });
  await page.testSubj.locator('switchQueryLanguageButton').click();
  await languageItem.waitFor({ state: 'visible' });
  await languageItem.click();
  await page.testSubj.locator('contextMenuPanelTitleButton').click();
  await page.testSubj
    .locator('switchQueryLanguageButton', { hasText: `Language: ${languageLabel}` })
    .waitFor({ state: 'visible' });
  await menuButton.click();
  await menuPanel.waitFor({ state: 'hidden' });
}

/** Submits the unified-search query bar (does not hide Discover tab preview). */
export async function submitQueryBar(page: ScoutPage): Promise<void> {
  await page.testSubj.click('querySubmitButton');
}
