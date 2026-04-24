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

async function dismissVisibleToasts(page: ScoutPage): Promise<void> {
  const closeButtons = await page.testSubj
    .locator('globalToastList')
    .locator('[data-test-subj="toastCloseButton"]')
    .all();
  for (const btn of closeButtons) {
    await btn.click().catch(() => {});
  }

  if (closeButtons.length > 0) {
    await page.testSubj
      .locator('globalToastList')
      .locator('[data-test-subj="toastCloseButton"]')
      // eslint-disable-next-line playwright/no-nth-methods -- wait until toast stack clears after dismiss clicks
      .first()
      .waitFor({ state: 'hidden', timeout: 5_000 })
      .catch(() => {});
  }
}

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

    // The "N agents selected" confirmation text is rendered as a `<span>` that's a
    // SIBLING of the EuiComboBox (see `public/agents/agents_table.tsx:358`), not a
    // descendant — so `this.agentSelection.getByText(...)` misses it even though
    // the text is on-page. Scope to the page instead.
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

  /**
   * Submit the live-query form and surface the server-assigned `action_id`
   * (when the POST response carries one). Callers can feed the id to
   * `helpers/poll_live_query_history.ts::waitForLiveQueryComplete` before
   * asserting results, to gate on agent-side completion rather than racing
   * the UI aggregator. Callers chain `waitForSingleQueryResults` /
   * `waitForPackResults` for results visibility. Returns `undefined` if the
   * response body can't be parsed — existing callers that don't need the id
   * remain unaffected.
   */
  async submitQuery(): Promise<string | undefined> {
    // Clear any open toasts that may intercept the Submit click.
    for (let dismissRound = 0; dismissRound < 2; dismissRound++) {
      await dismissVisibleToasts(this.page);
    }

    const { actionId } = await submitLiveQuery(this.page, this.submitButton);

    return actionId;
  }

  /**
   * Wait for a single-query submission's results to render. Single-query mode
   * surfaces the aggregate `osqueryResultsTable` — this method waits on that
   * directly. Use `waitForPackResults()` for pack-mode submissions, which
   * render results inside the `osqueryResultsPanel` instead.
   */
  async waitForSingleQueryResults(): Promise<void> {
    await this.resultsTable.waitFor({ state: 'visible', timeout: OSQUERY_UI_RESULTS_TIMEOUT_MS });
  }

  /**
   * Wait for a pack-mode submission's results to render. Pack-mode rendering
   * differs between the two entry points that call this method:
   *   - Live-query page (`live_query_pack_submission`, `custom_space`):
   *     results land in `osqueryResultsPanel` with one `dataGridRowCell` per
   *     result doc and a clickable `resultsTab`.
   *   - Alert flyout (`alert_case_creation`): results land in
   *     `osqueryResultsTable` (the same test-subj single-query uses) because
   *     the flyout doesn't render the per-query tab UI.
   * Race both signals and return on whichever resolves first. Scoping the
   * cell probe to `osqueryResultsPanel` is important because a page-wide
   * `dataGridRowCell` would also match the alerts EuiDataGrid rendered
   * behind the osquery flyout — which would resolve the race immediately
   * before any osquery result has landed.
   */
  async waitForPackResults(): Promise<void> {
    // The alert-flyout context renders `resultsTable` directly (no tabbed layout); the live-query-page context renders a `resultsTab` that must be clicked to reveal the grid. Probing `isVisible` rather than branching on context keeps the helper reusable across both.
    if (await this.resultsTab.isVisible().catch(() => false)) {
      await this.resultsTab.click();
    }

    // eslint-disable-next-line playwright/no-nth-methods -- any populated cell in the osquery panel indicates pack results loaded
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

  // Switches the live-query form from single-query mode into pack mode. The
  // mode selector is an `EuiCard` with `selectable`; the card's onClick lives
  // on the selectable footer button, so we target the card's role+name. Unlike
  // the alert flyout (`alert_flyout.ts:171-182`) the live-query page renders
  // the selectable card directly on the page body, so the pack mode completion
  // signal is that the single-query Monaco editor has unmounted.
  async selectPackMode(): Promise<void> {
    const packCard = this.page.locator('.euiCard', {
      has: this.page.getByText('Run a set of queries in a pack.'),
    });
    await packCard.waitFor({ state: 'visible', timeout: 15_000 });
    await packCard.click();
    await this.queryEditor.waitFor({ state: 'hidden', timeout: 15_000 });
  }

  /**
   * Select a pack from the live-query page's `select-live-pack` combobox.
   * The combobox is `asPlainText`, so the helper asserts on the rendered
   * label (the search input is replaced on commit). Callers SHOULD still
   * assert the pack name visible in the downstream pack-preview block if
   * they need confirmation the pack loaded.
   */
  async selectLivePack(packName: string): Promise<void> {
    await selectSingleAsPlainTextOption(this.page, {
      wrapper: { dataTestSubj: 'select-live-pack' },
      optionName: packName,
    });
  }

  // Click the per-query accordion toggle in pack results. Callers assert on
  // downstream visibility (rows / cells / tabs) — this method intentionally
  // does not assert on anything so callers can choose the appropriate signal.
  async togglePackQuery(queryName: string): Promise<void> {
    await this.page.testSubj.locator(`toggleIcon-${queryName}`).click();
  }

  /**
   * Select a saved query from the `savedQuerySelect` combobox on the
   * live-query form. Gates on Monaco's model carrying non-empty content
   * before returning — the useful "selection committed" signal for this
   * specific combobox is the editor populating.
   */
  async selectSavedQueryFromDropdown(savedQueryName: string): Promise<void> {
    await selectSingleAsPlainTextOption(this.page, {
      wrapper: { dataTestSubj: 'savedQuerySelect' },
      optionName: savedQueryName,
    });
    await waitForMonacoNonEmpty(this.page);
  }
}
