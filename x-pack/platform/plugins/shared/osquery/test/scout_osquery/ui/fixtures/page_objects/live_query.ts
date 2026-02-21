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
    await this.page.testSubj
      .locator('globalLoadingIndicator')
      .waitFor({ state: 'hidden', timeout: 30_000 })
      .catch(() => {});

    const agentInput = this.agentSelection.locator('[data-test-subj="comboBoxSearchInput"]');
    await agentInput.waitFor({ state: 'visible', timeout: 15_000 });
    await agentInput.click();

    // Wait for the "All agents" option to appear in the dropdown
    const allAgentsOption = this.page
      .locator('[role="option"]')
      .filter({ hasText: 'All agents' })
      .first();
    await allAgentsOption.waitFor({ state: 'visible', timeout: 15_000 });
    await allAgentsOption.click();

    // Confirm agents were selected by waiting for the selection indicator
    // Serverless agents can take longer to appear in the Fleet UI
    await this.page
      .getByText(/\d+ agents? selected\./)
      .waitFor({ state: 'visible', timeout: 60_000 });
  }

  async inputQuery(query: string) {
    await this.queryEditor.click();
    await this.queryEditor.pressSequentially(query);
  }

  async clearAndInputQuery(query: string) {
    // Click the editor to focus it
    await this.queryEditor.click();
    // Small delay to let Monaco fully activate and register focus
    await new Promise((r) => setTimeout(r, 500));

    // Select all content and delete it (repeat to ensure clean state)
    await this.page.keyboard.press('ControlOrMeta+a');
    await new Promise((r) => setTimeout(r, 200));
    await this.page.keyboard.press('Backspace');
    await new Promise((r) => setTimeout(r, 200));
    await this.page.keyboard.press('ControlOrMeta+a');
    await new Promise((r) => setTimeout(r, 200));
    await this.page.keyboard.press('Backspace');
    await new Promise((r) => setTimeout(r, 300));

    // Type the new query character by character via keyboard (avoids element interception)
    await this.page.keyboard.type(query);
  }

  /**
   * Click the Submit button without waiting for API response.
   * Use for validation tests where the form may not submit successfully.
   */
  async clickSubmit() {
    const submitButton = this.page.getByText('Submit').first();
    await submitButton.waitFor({ state: 'visible' });
    await submitButton.click();
  }

  async submitQuery() {
    // Small delay to let React form state settle (ECS mapping sync, validation, etc.)
    await new Promise((r) => setTimeout(r, 1_000));

    const submitButton = this.page.getByText('Submit').first();
    await submitButton.waitFor({ state: 'visible' });

    // Click Submit and simultaneously wait for the live query API response
    const [response] = await Promise.all([
      this.page.waitForResponse(
        (resp) =>
          resp.url().includes('/api/osquery/live_queries') && resp.request().method() === 'POST',
        { timeout: 30_000 }
      ),
      submitButton.click(),
    ]);

    const status = response.status();
    if (status !== 200) {
      const body = await response.text().catch(() => 'Unable to read body');
      throw new Error(`Live query submission failed with status ${status}: ${body}`);
    }

    // Wait for either the single-query results tab or pack-query results to appear
    const resultsTab = this.page.testSubj.locator('osquery-results-tab');
    const packResultsHeading = this.page.getByText('Results').first();
    await Promise.race([
      resultsTab.waitFor({ state: 'visible', timeout: 30_000 }),
      packResultsHeading.waitFor({ state: 'visible', timeout: 30_000 }),
    ]).catch(() => {
      // Allow the caller to handle missing results
    });
  }

  /**
   * Wait for query results to appear. Checks for the results table or the
   * results tab to become visible. Periodically reloads to trigger refresh.
   * Throws if results never appear within the configured RESULTS_TIMEOUT.
   */
  async waitForResults() {
    const start = Date.now();
    const maxWaitMs = RESULTS_TIMEOUT;

    // Click the results tab to ensure we're viewing results
    const resultsTab = this.page.testSubj.locator('osquery-results-tab');
    if (await resultsTab.isVisible()) {
      await resultsTab.click();
      await waitForPageReady(this.page);
    }

    while (Date.now() - start < maxWaitMs) {
      // Check for the results data grid or row cells
      const resultsTable = this.page.testSubj.locator('osqueryResultsTable');
      const dataCell = this.page.testSubj.locator('dataGridRowCell').first();

      try {
        // Wait for either the data grid or a cell to appear
        await Promise.race([
          resultsTable.waitFor({ state: 'visible', timeout: 20_000 }),
          dataCell.waitFor({ state: 'visible', timeout: 20_000 }),
        ]);

        return; // Results found
      } catch {
        // Switch to status tab and back to force a refresh
        const statusTab = this.page.testSubj.locator('osquery-status-tab');
        if (await statusTab.isVisible()) {
          await statusTab.click();
          await waitForPageReady(this.page);
          await resultsTab.click();
          await waitForPageReady(this.page);
        } else {
          await new Promise((r) => setTimeout(r, 5_000));
        }
      }
    }

    // Final check — let it throw with a clear error if results never appeared
    await this.page.testSubj
      .locator('osqueryResultsTable')
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
    const searchInput = fieldSelect.locator('[data-test-subj="comboBoxSearchInput"]');
    const option = this.page.getByRole('option').first();
    const cleanText = text.replace('{downArrow}{enter}', '');

    // Retry: osquery schema may still be loading from agents
    for (let attempt = 0; attempt < 5; attempt++) {
      await searchInput.click();
      await this.page.testSubj
        .locator('globalLoadingIndicator')
        .waitFor({ state: 'hidden', timeout: 15_000 })
        .catch(() => {});
      await searchInput.fill('');
      await searchInput.pressSequentially(cleanText);

      try {
        await option.waitFor({ state: 'visible', timeout: 10_000 });
        await option.click();

        return;
      } catch {
        // Dropdown didn't show options — schema may not be loaded yet
        await searchInput.press('Escape');
        await new Promise((r) => setTimeout(r, 5_000));
      }
    }

    // Final attempt — fail with a clear error
    await searchInput.click();
    await searchInput.fill('');
    await searchInput.pressSequentially(cleanText);
    await option.waitFor({ state: 'visible', timeout: 15_000 });
    await option.click();
  }

  async typeInECSFieldInput(text: string, index = 0) {
    const ecsWrapper = this.page.testSubj.locator('ECS-field-input').nth(index);
    const searchInput = ecsWrapper.locator('[data-test-subj="comboBoxSearchInput"]');
    const cleanText = text.replace('{downArrow}{enter}', '');

    // Retry: ECS fields may still be loading
    for (let attempt = 0; attempt < 5; attempt++) {
      await searchInput.click();
      await this.page.testSubj
        .locator('globalLoadingIndicator')
        .waitFor({ state: 'hidden', timeout: 15_000 })
        .catch(() => {});
      await searchInput.fill('');
      await searchInput.pressSequentially(cleanText);

      // EUI option accessible name uses the description text, so match by inner text content
      const matchingOption = this.page
        .locator('[role="option"]')
        .filter({ hasText: new RegExp(`^.*${cleanText}.*$`, 'i') })
        .first();

      try {
        await matchingOption.waitFor({ state: 'visible', timeout: 10_000 });
        await matchingOption.click();

        return;
      } catch {
        await searchInput.press('Escape');
        // eslint-disable-next-line playwright/no-wait-for-timeout
        await this.page.waitForTimeout(3_000);
      }
    }

    // Final attempt — fail with a clear error
    await searchInput.click();
    await searchInput.fill('');
    await searchInput.pressSequentially(cleanText);
    const matchingOption = this.page
      .locator('[role="option"]')
      .filter({ hasText: new RegExp(`^.*${cleanText}.*$`, 'i') })
      .first();
    await matchingOption.waitFor({ state: 'visible', timeout: 15_000 });
    await matchingOption.click();
  }

  async getQueryEditorHeight(): Promise<number> {
    const box = await this.queryEditor.boundingBox();

    return box?.height ?? 0;
  }
}
