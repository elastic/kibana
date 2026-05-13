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
    this.newLiveQueryButton = this.page.testSubj.locator('osqueryNavNewLiveQueryButton');
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

  /**
   * Pick one or more specific agents in the picker by hostname.
   *
   * Tier-A specs MUST use this instead of `selectAllAgents` — the "All agents"
   * path sends `agent_all: true` to `POST /api/osquery/live_queries`, which
   * triggers Fleet's `agentService.listAgents()` query against the `.fleet-agents`
   * index server-side. That index does not exist in Tier-A (no Fleet Server),
   * so the POST 500s with `index_not_found_exception`. Selecting specific
   * agent(s) fills `agent_ids: [...]` instead and bypasses the Fleet listAgents
   * call entirely (see `server/lib/parse_agent_groups.ts`).
   *
   * Multi-agent selection is supported — the picker is an EuiComboBox that
   * accumulates picks. Use this to preserve per-agent UI assertions
   * (e.g. "renders per-agent rows via the agent.name column").
   */
  async selectMockedAgents(hostnames: string | string[]): Promise<void> {
    const names = Array.isArray(hostnames) ? hostnames : [hostnames];

    const agentInput = this.agentSelection.getByTestId('comboBoxSearchInput');
    await agentInput.waitFor({ state: 'visible', timeout: 15_000 });

    for (const hostname of names) {
      await agentInput.click();
      const agentOption = this.page.getByRole('option', { name: new RegExp(hostname) });
      await agentOption.waitFor({ state: 'visible', timeout: 30_000 });
      await agentOption.click();
      // Selected pill renders the hostname inside the agentSelection subtree.
      await this.agentSelection.getByText(hostname).waitFor({
        state: 'visible',
        timeout: 30_000,
      });
    }

    await this.page.keyboard.press('Escape');
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
   * Submit and return the captured action ids:
   * - `actionId`: top-level umbrella id (use for `waitForLiveQueryComplete` / live-query history drill-downs).
   * - `queryActionIds`: per-query ids for seeding `indexActionResponses` / `indexResultRows` (results UI filters by these).
   *
   * Specs typically need `queryActionIds[0]` for single-query submissions.
   * See `common/submit_live_query.ts` for the rationale.
   */
  async submitQuery(): Promise<{ actionId?: string; queryActionIds: string[] }> {
    const { actionId, queryActionIds } = await submitLiveQuery(this.page, this.submitButton);

    return { actionId, queryActionIds };
  }

  /**
   * Wait for aggregate `osqueryResultsTable` (single-query mode).
   * Pass `resultsContainer` when the form lives in a flyout (e.g. `osqueryAlertFlyout.flyoutBody`):
   * the wait is then scoped to that subtree and races signals that mean "run is actionable in UI".
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
