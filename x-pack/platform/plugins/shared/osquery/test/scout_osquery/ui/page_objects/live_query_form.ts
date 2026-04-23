/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { OSQUERY_UI_RESULTS_TIMEOUT_MS } from '../../common/constants';
import { waitForKibanaChromeLoadingFinished } from '../../common/wait_for_kibana_loading_finished';
import { submitLiveQuery } from '../../common/submit_live_query';

/** Narrow shape for Monaco editor access in `page.evaluate`; omit conflicts with `Window.MonacoEnvironment` from monaco-editor typings. */
type WindowWithMonaco = Omit<Window, 'MonacoEnvironment'> & {
  MonacoEnvironment?: {
    monaco?: {
      editor: {
        getModels: () => Array<{ setValue: (value: string) => void; getValue: () => string }>;
      };
    };
  };
};

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
    await waitForKibanaChromeLoadingFinished(this.page).catch(() => {});

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

    await this.page.evaluate((newQuery: string) => {
      const w = window as WindowWithMonaco;
      const monacoEnv = w.MonacoEnvironment;
      if (monacoEnv?.monaco?.editor) {
        const models = monacoEnv.monaco.editor.getModels();
        for (const model of models) {
          model.setValue(newQuery);
        }
      }
    }, query);

    await this.page.waitForFunction(
      (expected: string) => {
        const w = window as unknown as WindowWithMonaco;
        const models = w.MonacoEnvironment?.monaco?.editor.getModels() ?? [];
        const text = models.map((m) => m.getValue()).join('\n');

        if (expected === '') {
          return text.trim() === '';
        }

        return text.includes(expected);
      },
      query,
      { timeout: 15_000 }
    );
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
   * the UI aggregator. Returns `undefined` if the response body can't be
   * parsed — existing callers that don't need the id remain unaffected.
   */
  async submitQuery(): Promise<string | undefined> {
    await waitForKibanaChromeLoadingFinished(this.page).catch(() => {});
    // Clear any open toasts that may intercept the Submit click.
    for (let dismissRound = 0; dismissRound < 2; dismissRound++) {
      await dismissVisibleToasts(this.page);
    }

    const { actionId } = await submitLiveQuery(this.page, this.submitButton);

    // Results UI lands as either a tab (single query) or a heading (pack).
    // Do a best-effort wait so callers can chain on results visibility.
    await Promise.race([
      this.resultsTab.waitFor({ state: 'visible', timeout: 30_000 }),
      this.packResultsHeading.waitFor({ state: 'visible', timeout: 30_000 }),
    ]).catch(() => {});

    return actionId;
  }

  async waitForResults(): Promise<void> {
    const start = Date.now();
    const maxWaitMs = OSQUERY_UI_RESULTS_TIMEOUT_MS;

    if (await this.resultsTab.isVisible().catch(() => false)) {
      await this.resultsTab.click();
    }

    while (Date.now() - start < maxWaitMs) {
      // Scope the cell probe to the osquery results panel. Page-wide `dataGridRowCell`
      // also matches cells in the alerts EuiDataGrid rendered behind the osquery flyout,
      // which would cause this race to resolve immediately — before any osquery result
      // has actually landed — and leave downstream actions (e.g. clicking "Add to Case")
      // clicking against a still-loading flyout.
      // eslint-disable-next-line playwright/no-nth-methods -- any populated cell in the osquery panel indicates results loaded
      const dataCell = this.resultsPanel.getByTestId('dataGridRowCell').first();

      try {
        await Promise.race([
          this.resultsTable.waitFor({ state: 'visible', timeout: 20_000 }),
          dataCell.waitFor({ state: 'visible', timeout: 20_000 }),
        ]);

        return;
      } catch {
        try {
          if (await this.statusTab.isVisible().catch(() => false)) {
            await this.statusTab.click();
            await this.resultsTab.waitFor({ state: 'visible', timeout: 10_000 }).catch(() => {});
            if (await this.resultsTab.isVisible().catch(() => false)) {
              await this.resultsTab.click();
            }
          } else {
            await waitForKibanaChromeLoadingFinished(this.page).catch(() => {});
          }
        } catch {
          await waitForKibanaChromeLoadingFinished(this.page).catch(() => {});
        }
      }
    }

    await this.resultsTable.waitFor({ state: 'visible', timeout: 60_000 });
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
    return this.page.evaluate(() => {
      const w = window as WindowWithMonaco;
      const models = w.MonacoEnvironment?.monaco?.editor.getModels() ?? [];

      return models.map((m) => m.getValue()).join('\n');
    });
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

  // Select a pack from the live-query page's `select-live-pack` combobox.
  // Mirrors `alert_flyout.ts:184-236` selector strategy (scope to the inner
  // `comboBoxSearchInput` leaf node; `dispatchEvent('click')` to bypass
  // Playwright's element-stability check while the EuiComboBox wrapper
  // remounts after the mode switch; type + ArrowDown + Enter + verify the
  // selection landed via `toHaveValue`).
  async selectLivePack(packName: string): Promise<void> {
    const searchInput = this.livePackSearchInput;
    await searchInput.waitFor({ state: 'visible', timeout: 15_000 });

    await expect(async () => {
      await searchInput.dispatchEvent('click');
      await expect(searchInput).toHaveAttribute('aria-expanded', 'true', {
        timeout: 2_000,
      });
    }).toPass({ timeout: 20_000, intervals: [250, 500, 1_000] });

    await searchInput.pressSequentially(packName, { delay: 20 });
    await this.page.keyboard.press('ArrowDown');
    await this.page.keyboard.press('Enter');
    await expect(searchInput).toHaveValue(
      new RegExp(packName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    );
  }

  // Click the per-query accordion toggle in pack results. Callers assert on
  // downstream visibility (rows / cells / tabs) — this method intentionally
  // does not assert on anything so callers can choose the appropriate signal.
  async togglePackQuery(queryName: string): Promise<void> {
    await this.page.testSubj.locator(`toggleIcon-${queryName}`).click();
  }

  // Select a saved query from the `savedQuerySelect` combobox on the
  // live-query form. Same scoping + race-avoidance strategy as `selectLivePack`
  // (inner `comboBoxSearchInput` leaf, ArrowDown + Enter). Gates on Monaco's
  // model actually carrying non-empty content before returning — same pattern
  // as `clearAndInputQuery` above. Callers can follow with `getMonacoEditorText`
  // to assert the populated value matches the expected saved-query body.
  async selectSavedQueryFromDropdown(savedQueryName: string): Promise<void> {
    const searchInput = this.savedQuerySearchInput;
    await searchInput.waitFor({ state: 'visible', timeout: 15_000 });

    await expect(async () => {
      await searchInput.dispatchEvent('click');
      await expect(searchInput).toHaveAttribute('aria-expanded', 'true', {
        timeout: 2_000,
      });
    }).toPass({ timeout: 20_000, intervals: [250, 500, 1_000] });

    await searchInput.pressSequentially(savedQueryName, { delay: 20 });
    await this.page.keyboard.press('ArrowDown');
    await this.page.keyboard.press('Enter');

    await this.page.waitForFunction(
      () => {
        const w = window as unknown as WindowWithMonaco;
        const models = w.MonacoEnvironment?.monaco?.editor.getModels() ?? [];

        return models.some((m) => m.getValue().trim().length > 0);
      },
      undefined,
      { timeout: 15_000 }
    );
  }

  private get livePackSearchInput(): Locator {
    return this.page.locator(
      '[data-test-subj="select-live-pack"] [data-test-subj="comboBoxSearchInput"]'
    );
  }

  private get savedQuerySearchInput(): Locator {
    return this.page.locator(
      '[data-test-subj="savedQuerySelect"] [data-test-subj="comboBoxSearchInput"]'
    );
  }
}
