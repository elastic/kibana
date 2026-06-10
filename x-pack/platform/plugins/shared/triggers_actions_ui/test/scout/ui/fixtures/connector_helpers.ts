/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';
import { CONNECTORS_APP_PATH, CONNECTORS_LIST_SELECTORS } from './constants';

interface KbnUrl {
  get: (path: string) => string;
}

interface MonacoBridge {
  MonacoEnvironment?: {
    monaco?: {
      editor?: {
        getModels: () => Array<{ getValue: () => string; setValue: (s: string) => void }>;
      };
    };
  };
}

/**
 * Drives the Monaco JSON editor directly. `.fill()` on the textarea does not
 * propagate to React state, so we set the model value via the Monaco API.
 */
export const setMonacoValue = async (page: ScoutPage, value: string) => {
  await page.testSubj.locator('kibanaCodeEditor').waitFor({ state: 'visible' });
  await page.evaluate((v) => {
    const editor = (window as unknown as MonacoBridge).MonacoEnvironment?.monaco?.editor;
    if (!editor) throw new Error('MonacoEnvironment.monaco.editor not available');
    editor.getModels().forEach((m) => m.setValue(v));
  }, value);
};

export const getMonacoValue = async (page: ScoutPage): Promise<string> => {
  await page.testSubj.locator('kibanaCodeEditor').waitFor({ state: 'visible' });
  return page.evaluate(() => {
    const editor = (window as unknown as MonacoBridge).MonacoEnvironment?.monaco?.editor;
    return editor?.getModels()?.[0]?.getValue() ?? '';
  });
};

export const navigateToConnectors = async (page: ScoutPage, kbnUrl: KbnUrl) => {
  await page.goto(kbnUrl.get(CONNECTORS_APP_PATH));
  await page.locator(CONNECTORS_LIST_SELECTORS.TABLE_LOADED).waitFor();
};

export const searchConnectors = async (page: ScoutPage, name: string) => {
  const searchBox = page.locator(CONNECTORS_LIST_SELECTORS.SEARCH_INPUT);
  await searchBox.fill(name);
  await searchBox.press('Enter');
  await page.locator(CONNECTORS_LIST_SELECTORS.TABLE_LOADED).waitFor();
};

export const openConnectorFlyout = async (page: ScoutPage) => {
  await page.locator('[data-test-subj="connectorsTableCell-name"] button').click();
};

export const searchAndOpenConnector = async (page: ScoutPage, name: string) => {
  await searchConnectors(page, name);
  await openConnectorFlyout(page);
};

/**
 * Defensive teardown: close the connector flyout if a test left it open.
 * Conditional checks are acceptable here because teardown must tolerate any
 * end state the test failed in.
 */
export const closeFlyoutIfOpen = async (page: ScoutPage) => {
  const closeBtn = page.testSubj.locator('edit-connector-flyout-close-btn');
  if (await closeBtn.isVisible({ timeout: 1_000 }).catch(() => false)) {
    await closeBtn.click();
    const confirmBtn = page.testSubj.locator('confirmModalConfirmButton');
    if (await confirmBtn.isVisible({ timeout: 1_000 }).catch(() => false)) {
      await confirmBtn.click();
    }
  }
};

/**
 * Defensive teardown: cancel the rule-creation flow if a test left it open.
 */
export const cancelRuleCreation = async (page: ScoutPage) => {
  const cancelBtn = page.testSubj.locator('rulePageFooterCancelButton');
  if (await cancelBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await cancelBtn.click();
    const confirmBtn = page.testSubj
      .locator('confirmRuleCloseModal')
      .locator('[data-test-subj="confirmModalConfirmButton"]');
    if (await confirmBtn.isVisible({ timeout: 1_000 }).catch(() => false)) {
      await confirmBtn.click();
    }
  }
};
