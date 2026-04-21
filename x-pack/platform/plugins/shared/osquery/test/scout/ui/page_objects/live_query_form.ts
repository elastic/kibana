/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';
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

  constructor(private readonly page: ScoutPage) {
    this.queryEditor = this.page.testSubj.locator('kibanaCodeEditor');
    this.submitButton = this.page.testSubj.locator('liveQuerySubmitButton');
    this.resultsTable = this.page.testSubj.locator('osqueryResultsTable');
    this.agentSelection = this.page.testSubj.locator('agentSelection');
    this.resultsPanel = this.page.testSubj.locator('osqueryResultsPanel');
  }

  async navigateToList(): Promise<void> {
    await this.page.gotoApp('osquery');
    await this.page.testSubj
      .locator('newLiveQueryButton')
      .waitFor({ state: 'visible', timeout: 30_000 });
  }

  async clickNewLiveQuery(): Promise<void> {
    await this.navigateToList();
    await this.page.testSubj.locator('newLiveQueryButton').click();
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

    await this.agentSelection.getByText(/\d+ agents? selected\./).waitFor({
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

  async submitQuery(): Promise<void> {
    await waitForKibanaChromeLoadingFinished(this.page).catch(() => {});
    // Clear any open toasts that may intercept the Submit click.
    for (let dismissRound = 0; dismissRound < 2; dismissRound++) {
      await dismissVisibleToasts(this.page);
    }

    await submitLiveQuery(this.page, this.submitButton);

    // Results UI lands as either a tab (single query) or a heading (pack).
    // Do a best-effort wait so callers can chain on results visibility.
    const resultsTab = this.page.testSubj.locator('osquery-results-tab');
    const packResultsHeading = this.page.getByRole('heading', { name: 'Results' });
    await Promise.race([
      resultsTab.waitFor({ state: 'visible', timeout: 30_000 }),
      packResultsHeading.waitFor({ state: 'visible', timeout: 30_000 }),
    ]).catch(() => {});
  }

  async waitForResults(): Promise<void> {
    const start = Date.now();
    const maxWaitMs = OSQUERY_UI_RESULTS_TIMEOUT_MS;

    const resultsTab = this.page.testSubj.locator('osquery-results-tab');
    if (await resultsTab.isVisible().catch(() => false)) {
      await resultsTab.click();
    }

    while (Date.now() - start < maxWaitMs) {
      const resultsTable = this.page.testSubj.locator('osqueryResultsTable');
      // eslint-disable-next-line playwright/no-nth-methods -- any populated cell indicates results loaded
      const dataCell = this.page.testSubj.locator('dataGridRowCell').first();

      try {
        await Promise.race([
          resultsTable.waitFor({ state: 'visible', timeout: 20_000 }),
          dataCell.waitFor({ state: 'visible', timeout: 20_000 }),
        ]);

        return;
      } catch {
        try {
          const statusTab = this.page.testSubj.locator('osquery-status-tab');
          if (await statusTab.isVisible().catch(() => false)) {
            await statusTab.click();
            await resultsTab.waitFor({ state: 'visible', timeout: 10_000 }).catch(() => {});
            if (await resultsTab.isVisible().catch(() => false)) {
              await resultsTab.click();
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
    await this.page.getByRole('button', { name: 'Advanced' }).click();
  }

  async fillInQueryTimeout(timeout: string): Promise<void> {
    const timeoutInput = this.page.testSubj
      .locator('advanced-accordion-content')
      .getByTestId('timeout-input');
    await timeoutInput.clear();
    await timeoutInput.fill(timeout);
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
}
