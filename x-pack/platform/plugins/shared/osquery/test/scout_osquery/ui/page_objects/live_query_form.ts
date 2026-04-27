/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';
import { OSQUERY_UI_RESULTS_TIMEOUT_MS } from '../../common/constants';
import { submitLiveQuery } from '../../common/submit_live_query';
import {
  getMonacoEditorText,
  setMonacoValue,
  waitForMonacoContains,
  waitForMonacoNonEmpty,
} from '../../common/monaco_helpers';
import { selectSingleAsPlainTextOption } from '../../common/combo_box_helpers';

export class LiveQueryFormPage {
  public readonly queryEditor: Locator;
  public readonly submitButton: Locator;
  public readonly resultsTable: Locator;
  public readonly agentSelection: Locator;
  public readonly resultsPanel: Locator;
  public readonly newLiveQueryButton: Locator;
  public readonly resultsTab: Locator;
  public readonly statusTab: Locator;
  public readonly packResultsHeading: Locator;
  public readonly advancedButton: Locator;
  public readonly timeoutInput: Locator;

  constructor(private readonly page: ScoutPage) {
    this.queryEditor = this.page.testSubj.locator('kibanaCodeEditor');
    this.submitButton = this.page.testSubj.locator('liveQuerySubmitButton');
    this.resultsTable = this.page.testSubj.locator('osqueryResultsTable');
    this.agentSelection = this.page.testSubj.locator('agentSelection');
    this.resultsPanel = this.page.testSubj.locator('osqueryResultsPanel');
    this.newLiveQueryButton = this.page.testSubj.locator('newLiveQueryButton');
    this.resultsTab = this.page.testSubj.locator('osquery-results-tab');
    this.statusTab = this.page.testSubj.locator('osquery-status-tab');
    this.packResultsHeading = this.page.getByRole('heading', { name: 'Results' });
    this.advancedButton = this.page.getByRole('button', { name: 'Advanced' });
    this.timeoutInput = this.page.testSubj
      .locator('advanced-accordion-content')
      .getByTestId('timeout-input');
  }

  async navigateToList(): Promise<void> {
    await this.page.gotoApp('osquery');
    await this.newLiveQueryButton.waitFor({ state: 'visible', timeout: 30_000 });
  }

  async clickNewLiveQuery(): Promise<void> {
    await this.navigateToList();
    await this.newLiveQueryButton.click();
    await this.submitButton.waitFor({ state: 'visible', timeout: 30_000 });
  }

  async selectAllAgents(): Promise<void> {
    const agentInput = this.agentSelection.getByTestId('comboBoxSearchInput');
    await agentInput.waitFor({ state: 'visible', timeout: 15_000 });
    await agentInput.click();

    const allAgentsOption = this.page.getByRole('option', { name: /All agents/ });
    await allAgentsOption.waitFor({ state: 'visible', timeout: 15_000 });
    await allAgentsOption.click();

    await this.page.keyboard.press('Escape');

    // "N agents selected" is a sibling of the combobox — assert on page, not agentSelection subtree.
    await this.page.getByText(/\d+ agents? selected\./).waitFor({
      state: 'visible',
      timeout: 60_000,
    });
  }

  async inputQuery(query: string): Promise<void> {
    await this.queryEditor.click();
    await this.queryEditor.pressSequentially(query);
  }

  async clearAndInputQuery(query: string): Promise<void> {
    await this.queryEditor.waitFor({ state: 'visible' });
    await this.queryEditor.click();
    await setMonacoValue(this.page, query);
    await waitForMonacoContains(this.page, query);
  }

  async clickSubmit(): Promise<void> {
    await this.submitButton.waitFor({ state: 'visible' });
    await this.submitButton.click();
  }

  /** Submit; returns `action_id` when parseable (else undefined). Pair with poll/history waiters. */
  async submitQuery(): Promise<string | undefined> {
    const { actionId } = await submitLiveQuery(this.page, this.submitButton);

    return actionId;
  }

  /**
   * Wait for aggregate `osqueryResultsTable` (single-query mode).
   * Pass `resultsContainer` when the form lives in a flyout (e.g. `osqueryAlertFlyout.flyoutBody`):
   * the wait is then scoped to that subtree and races the table with a `dataGridRowCell` like
   * `waitForPackResults`, so we do not resolve a page-wide `osqueryResultsTable` to a hidden node.
   */
  async waitForSingleQueryResults(resultsContainer?: Locator): Promise<void> {
    if (resultsContainer) {
      const table = resultsContainer.getByTestId('osqueryResultsTable');
      const dataCell = resultsContainer
        .getByTestId('osqueryResultsPanel')
        .getByTestId('dataGridRowCell')
        // eslint-disable-next-line playwright/no-nth-methods -- first data cell in panel
        .first();
      await Promise.race([
        table.waitFor({ state: 'visible', timeout: OSQUERY_UI_RESULTS_TIMEOUT_MS }),
        dataCell.waitFor({ state: 'visible', timeout: OSQUERY_UI_RESULTS_TIMEOUT_MS }),
      ]);

      return;
    }

    await this.resultsTable.waitFor({ state: 'visible', timeout: OSQUERY_UI_RESULTS_TIMEOUT_MS });
  }

  /**
   * Pack results: live-query page uses panel + optional results tab; flyout can show table directly.
   * Races table vs first data cell scoped to osqueryResultsPanel (avoids alert grid behind flyout).
   */
  async waitForPackResults(): Promise<void> {
    // Click results tab when present (live-query page); flyout path skips hidden tab.
    if (await this.resultsTab.isVisible().catch(() => false)) {
      await this.resultsTab.click();
    }

    // eslint-disable-next-line playwright/no-nth-methods -- first cell in osquery panel
    const dataCell = this.resultsPanel.getByTestId('dataGridRowCell').first();
    await Promise.race([
      this.resultsTable.waitFor({ state: 'visible', timeout: OSQUERY_UI_RESULTS_TIMEOUT_MS }),
      dataCell.waitFor({ state: 'visible', timeout: OSQUERY_UI_RESULTS_TIMEOUT_MS }),
    ]);
  }

  async clickAdvanced(): Promise<void> {
    await this.advancedButton.click();
  }

  async fillInQueryTimeout(timeout: string): Promise<void> {
    await this.timeoutInput.clear();
    await this.timeoutInput.fill(timeout);
  }

  async getQueryEditorHeight(): Promise<number> {
    const box = await this.queryEditor.boundingBox();

    return box?.height ?? 0;
  }

  async getMonacoEditorText(): Promise<string> {
    return getMonacoEditorText(this.page);
  }

  async pressShiftEnterInEditor(): Promise<void> {
    await this.queryEditor.click();
    await this.page.keyboard.press('Shift+Enter');
  }

  // Pack mode: click pack card; completion = single-query Monaco hidden (page body cards differ from flyout).
  async selectPackMode(): Promise<void> {
    const packCard = this.page.locator('.euiCard', {
      has: this.page.getByText('Run a set of queries in a pack.'),
    });
    await packCard.waitFor({ state: 'visible', timeout: 15_000 });
    await packCard.click();
    await this.queryEditor.waitFor({ state: 'hidden', timeout: 15_000 });
  }

  /** Plain-text pack combobox on live-query page (assert pack preview separately if needed). */
  async selectLivePack(packName: string): Promise<void> {
    await selectSingleAsPlainTextOption(this.page, {
      wrapper: { dataTestSubj: 'select-live-pack' },
      optionName: packName,
    });
  }

  // Expand pack query accordion; callers assert downstream UI.
  async togglePackQuery(queryName: string): Promise<void> {
    await this.page.testSubj.locator(`toggleIcon-${queryName}`).click();
  }

  /** Pick saved query; wait until Monaco non-empty (selection committed). */
  async selectSavedQueryFromDropdown(savedQueryName: string): Promise<void> {
    await selectSingleAsPlainTextOption(this.page, {
      wrapper: { dataTestSubj: 'savedQuerySelect' },
      optionName: savedQueryName,
    });
    await waitForMonacoNonEmpty(this.page);
  }
}
