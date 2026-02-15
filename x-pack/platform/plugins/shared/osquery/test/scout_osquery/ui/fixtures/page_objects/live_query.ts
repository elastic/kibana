/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/* eslint-disable playwright/no-nth-methods */

import type { ScoutPage, Locator } from '@kbn/scout';
import { RESULTS_TIMEOUT, waitForPageReady } from '../../common/constants';

export class LiveQueryPage {
  public readonly queryEditor: Locator;
  public readonly submitButton: Locator;
  public readonly resultsTable: Locator;
  public readonly agentSelection: Locator;
  public readonly resultsPanel: Locator;

  constructor(private readonly page: ScoutPage) {
    this.queryEditor = this.page.testSubj.locator('kibanaCodeEditor');
    this.submitButton = this.page.locator('#submit-button');
    this.resultsTable = this.page.testSubj.locator('osqueryResultsTable');
    this.agentSelection = this.page.testSubj.locator('agentSelection');
    this.resultsPanel = this.page.testSubj.locator('osqueryResultsPanel');
  }

  async navigate() {
    await this.page.gotoApp('osquery');
    await waitForPageReady(this.page);
    await this.page
      .getByText('New live query')
      .first()
      .waitFor({ state: 'visible', timeout: 30_000 });
  }

  async clickNewLiveQuery() {
    await this.navigate();
    await this.page.getByText('New live query').first().click();
    await waitForPageReady(this.page);
  }

  async selectAllAgents() {
    await this.page.testSubj.locator('globalLoadingIndicator').waitFor({ state: 'hidden' });

    const agentInput = this.agentSelection.locator('[data-test-subj="comboBoxInput"]');
    await agentInput.waitFor({ state: 'visible', timeout: 15_000 });
    await agentInput.click();

    // Wait for the "All agents" option to appear in the dropdown
    const allAgentsOption = this.page.getByRole('option', { name: /All agents/ });
    await allAgentsOption.waitFor({ state: 'visible', timeout: 15_000 });
    await allAgentsOption.click();

    // Confirm agents were selected by waiting for the selection indicator
    await this.page
      .getByText(/\d+ agents? selected\./)
      .waitFor({ state: 'visible', timeout: 30_000 });
  }

  async inputQuery(query: string) {
    await this.queryEditor.click();
    await this.queryEditor.pressSequentially(query);
  }

  async clearAndInputQuery(query: string) {
    // Click the editor to focus it
    await this.queryEditor.click();
    // Select all content and delete it (repeat to ensure empty)
    await this.page.keyboard.press('ControlOrMeta+a');
    await this.page.keyboard.press('Backspace');
    await this.page.keyboard.press('ControlOrMeta+a');
    await this.page.keyboard.press('Backspace');
    await this.queryEditor.pressSequentially(query);
  }

  async submitQuery() {
    const submitButton = this.page.getByText('Submit').first();
    await submitButton.waitFor({ state: 'visible' });
    await submitButton.click();
  }

  /**
   * Wait for query results to appear. Periodically switches tabs and reloads
   * the page to trigger a refresh. Throws if results never appear within
   * the configured RESULTS_TIMEOUT.
   */
  async waitForResults() {
    const start = Date.now();
    const maxWaitMs = RESULTS_TIMEOUT;
    let reloadCount = 0;

    while (Date.now() - start < maxWaitMs) {
      // Try switching tabs to force a results refresh
      const statusTab = this.page.testSubj.locator('osquery-status-tab');
      const resultsTab = this.page.testSubj.locator('osquery-results-tab');

      if (await statusTab.isVisible()) {
        await statusTab.click();
        await waitForPageReady(this.page);
        await resultsTab.click();
        await waitForPageReady(this.page);
      }

      // Check if the results table has data rows
      const dataCell = this.page.testSubj.locator('dataGridRowCell').first();
      try {
        await dataCell.waitFor({ state: 'visible', timeout: 15_000 });

        return; // Results found
      } catch {
        // Every 3rd retry, reload the page to force a full refresh
        reloadCount++;
        if (reloadCount % 3 === 0) {
          await this.page.reload();
          await waitForPageReady(this.page);
        } else {
          await new Promise((r) => setTimeout(r, 5_000));
        }
      }
    }

    // Final check — let it throw with a clear error if results never appeared
    await this.page.testSubj
      .locator('dataGridRowCell')
      .first()
      .waitFor({ state: 'visible', timeout: 60_000 });
  }

  /** @deprecated Use waitForResults() instead */
  async checkResults() {
    return this.waitForResults();
  }

  async clickAdvanced() {
    await this.page.testSubj.locator('advanced-accordion-content').click();
  }

  async fillInQueryTimeout(timeout: string) {
    const timeoutInput = this.page.testSubj
      .locator('advanced-accordion-content')
      .locator('[data-test-subj="timeout-input"]');
    await timeoutInput.clear();
    await timeoutInput.fill(timeout);
  }

  async typeInOsqueryFieldInput(text: string, index = 0) {
    const fieldSelect = this.page.testSubj.locator('osqueryColumnValueSelect').nth(index);
    const comboBox = fieldSelect.locator('[data-test-subj="comboBoxInput"]');
    const option = this.page.getByRole('option').first();

    // Retry: osquery schema may still be loading from agents
    for (let attempt = 0; attempt < 5; attempt++) {
      await comboBox.click();
      await this.page.testSubj.locator('globalLoadingIndicator').waitFor({ state: 'hidden' });
      // Clear any previous text using keyboard (combobox is a div, not input)
      await this.page.keyboard.press('ControlOrMeta+a');
      await this.page.keyboard.press('Backspace');
      await comboBox.pressSequentially(text.replace('{downArrow}{enter}', ''));

      try {
        await option.waitFor({ state: 'visible', timeout: 10_000 });
        await option.click();

        return;
      } catch {
        // Dropdown didn't show options — schema may not be loaded yet
        await comboBox.press('Escape');
        await new Promise((r) => setTimeout(r, 5_000));
      }
    }

    // Final attempt — fail with a clear error
    await comboBox.click();
    await this.page.keyboard.press('ControlOrMeta+a');
    await this.page.keyboard.press('Backspace');
    await comboBox.pressSequentially(text);
    await option.waitFor({ state: 'visible', timeout: 15_000 });
    await option.click();
  }

  async typeInECSFieldInput(text: string, index = 0) {
    const ecsWrapper = this.page.testSubj.locator('ECS-field-input').nth(index);
    const comboBox = ecsWrapper.locator('[data-test-subj="comboBoxInput"]');
    const cleanText = text.replace('{downArrow}{enter}', '');

    // Click the combobox input to focus it, then type
    await comboBox.click();
    await comboBox.pressSequentially(cleanText);

    // Wait for an option matching the typed text to appear in the dropdown
    const matchingOption = this.page
      .getByRole('option', { name: new RegExp(cleanText, 'i') })
      .first();
    await matchingOption.waitFor({ state: 'visible', timeout: 15_000 });
    await matchingOption.click();
  }

  async getQueryEditorHeight(): Promise<number> {
    const box = await this.queryEditor.boundingBox();

    return box?.height ?? 0;
  }
}
