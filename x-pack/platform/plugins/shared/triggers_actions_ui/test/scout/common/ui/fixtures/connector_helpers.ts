/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaUrl, ScoutPage } from '@kbn/scout';
import { CONNECTORS_APP_PATH, CONNECTORS_LIST_SELECTORS } from './constants';

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

export const navigateToConnectors = async (page: ScoutPage, kbnUrl: KibanaUrl) => {
  await page.goto(kbnUrl.get(CONNECTORS_APP_PATH));
  // Accept either the loaded table (connectors exist) or the empty-state prompt
  // (zero connectors). The table selector never appears when the page is empty.
  await page
    .locator(CONNECTORS_LIST_SELECTORS.TABLE_LOADED)
    .or(page.locator(CONNECTORS_LIST_SELECTORS.EMPTY_STATE))
    .waitFor();
};

export const searchConnectors = async (page: ScoutPage, name: string) => {
  const searchBox = page.locator(CONNECTORS_LIST_SELECTORS.SEARCH_INPUT);
  // The search box only renders when connectors exist. If the page is showing the
  // empty state (zero connectors), skip the search — callers asserting count 0 will
  // still pass because there are no rows.
  const present = await searchBox
    .waitFor({ state: 'visible', timeout: 1_000 })
    .then(() => true)
    .catch(() => false);
  if (!present) return;
  await searchBox.fill(name);
  await searchBox.press('Enter');
  // Two-phase wait: catch the loading state then wait for it to clear.
  // Without this, waitFor() can match the pre-search "not loading" table
  // before React adds the loading class, returning stale results.
  await page
    .locator('.euiBasicTable[data-test-subj="actionsTable"].euiBasicTable-loading')
    .waitFor({ state: 'visible', timeout: 1_000 })
    .catch(() => {});
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
  if (await closeBtn.isVisible()) {
    await closeBtn.click();
    const confirmBtn = page.testSubj.locator('confirmModalConfirmButton');
    const confirmVisible = await confirmBtn
      .waitFor({ state: 'visible', timeout: 1_000 })
      .then(() => true)
      .catch(() => false);
    if (confirmVisible) await confirmBtn.click();
  }
};

/**
 * Defensive teardown: cancel the rule-creation flow if a test left it open.
 */
export const cancelRuleCreation = async (page: ScoutPage) => {
  const cancelBtn = page.testSubj.locator('rulePageFooterCancelButton');
  const cancelVisible = await cancelBtn
    .waitFor({ state: 'visible', timeout: 2_000 })
    .then(() => true)
    .catch(() => false);
  if (cancelVisible) {
    await cancelBtn.click();
    const confirmBtn = page.testSubj
      .locator('confirmRuleCloseModal')
      .getByTestId('confirmModalConfirmButton');
    const confirmVisible = await confirmBtn
      .waitFor({ state: 'visible', timeout: 1_000 })
      .then(() => true)
      .catch(() => false);
    if (confirmVisible) await confirmBtn.click();
  }
};
