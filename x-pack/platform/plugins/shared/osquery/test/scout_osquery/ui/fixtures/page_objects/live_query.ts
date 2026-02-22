/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
    this.submitButton = this.page.testSubj.locator('liveQuerySubmitButton');
    this.resultsTable = this.page.testSubj.locator('osqueryResultsTable');
    this.agentSelection = this.page.testSubj.locator('agentSelection');
    this.resultsPanel = this.page.testSubj.locator('osqueryResultsPanel');
  }

  async navigate() {
    await this.page.gotoApp('osquery');
    await waitForPageReady(this.page);
    await this.page.testSubj
      .locator('newLiveQueryButton')
      .waitFor({ state: 'visible', timeout: 30_000 });
  }

  async clickNewLiveQuery() {
    await this.navigate();
    await this.page.testSubj.locator('newLiveQueryButton').click();
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
    const allAgentsOption = this.page.getByRole('option', { name: /All agents/ });
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
    await this.queryEditor.waitFor({ state: 'visible' });
    await this.queryEditor.click();

    // Select all content and delete it (repeat to ensure clean state)
    await this.page.keyboard.press('ControlOrMeta+a');
    await this.page.keyboard.press('Backspace');
    await this.page.keyboard.press('ControlOrMeta+a');
    await this.page.keyboard.press('Backspace');

    await this.page.keyboard.type(query);
  }

  /**
   * Click the Submit button without waiting for API response.
   * Use for validation tests where the form may not submit successfully.
   */
  async clickSubmit() {
    const submitButton = this.page.testSubj.locator('liveQuerySubmitButton');
    await submitButton.waitFor({ state: 'visible' });
    await submitButton.click();
  }

  async submitQuery() {
    await this.page.testSubj
      .locator('globalLoadingIndicator')
      .waitFor({ state: 'hidden', timeout: 10_000 })
      .catch(() => {});

    const submitButton = this.page.testSubj.locator('liveQuerySubmitButton');
    await submitButton.waitFor({ state: 'visible' });
    await submitButton.scrollIntoViewIfNeeded();

    // Dismiss overlaying toasts twice — new toasts can appear between iterations
    for (let dismissRound = 0; dismissRound < 2; dismissRound++) {
      const closeButtons = await this.page.testSubj
        .locator('globalToastList')
        .locator('[data-test-subj="toastCloseButton"]')
        .all();
      for (const btn of closeButtons) {
        await btn.click().catch(() => {});
      }

      if (closeButtons.length > 0) {
        // eslint-disable-next-line playwright/no-wait-for-timeout -- brief pause for toast dismiss animation
        await this.page.waitForTimeout(500);
      }
    }

    // Retry up to 3 times: the button click may be intercepted by a late-appearing
    // toast or the submit may silently fail to produce a network request.
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const [response] = await Promise.all([
          this.page.waitForResponse(
            (resp) =>
              resp.url().includes('/api/osquery/live_queries') &&
              resp.request().method() === 'POST',
            { timeout: 30_000 }
          ),
          // eslint-disable-next-line playwright/no-force-option -- toasts may overlay the button
          submitButton.click({ force: true }),
        ]);

        const status = response.status();
        if (status !== 200) {
          const body = await response.text().catch(() => 'Unable to read body');
          throw new Error(`Live query submission failed with status ${status}: ${body}`);
        }

        // Wait for either the single-query results tab or pack-query results to appear
        const resultsTab = this.page.testSubj.locator('osquery-results-tab');
        const packResultsHeading = this.page.getByRole('heading', { name: 'Results' });
        await Promise.race([
          resultsTab.waitFor({ state: 'visible', timeout: 30_000 }),
          packResultsHeading.waitFor({ state: 'visible', timeout: 30_000 }),
        ]).catch(() => {});

        return;
      } catch (e) {
        if (attempt === 2) throw e;

        // Dismiss any new toasts before retrying
        const retryCloseButtons = await this.page.testSubj
          .locator('globalToastList')
          .locator('[data-test-subj="toastCloseButton"]')
          .all();
        for (const btn of retryCloseButtons) {
          await btn.click().catch(() => {});
        }

        await submitButton.scrollIntoViewIfNeeded();
      }
    }
  }

  /**
   * Wait for query results to appear. Checks for the results table or the
   * results tab to become visible. Periodically reloads to trigger refresh.
   * Throws if results never appear within the configured RESULTS_TIMEOUT.
   */
  async waitForResults() {
    const start = Date.now();
    const maxWaitMs = RESULTS_TIMEOUT;
    let attempt = 0;

    const resultsTab = this.page.testSubj.locator('osquery-results-tab');
    if (await resultsTab.isVisible().catch(() => false)) {
      await resultsTab.click();
      await waitForPageReady(this.page);
    }

    while (Date.now() - start < maxWaitMs) {
      const resultsTable = this.page.testSubj.locator('osqueryResultsTable');
      // eslint-disable-next-line playwright/no-nth-methods -- selecting the first data cell to confirm results loaded
      const dataCell = this.page.testSubj.locator('dataGridRowCell').first();

      try {
        await Promise.race([
          resultsTable.waitFor({ state: 'visible', timeout: 20_000 }),
          dataCell.waitFor({ state: 'visible', timeout: 20_000 }),
        ]);

        return;
      } catch {
        attempt++;
        try {
          if (attempt % 2 === 0) {
            await this.page.reload();
            await waitForPageReady(this.page);
            if (await resultsTab.isVisible().catch(() => false)) {
              await resultsTab.click();
              await waitForPageReady(this.page);
            }
          } else {
            const statusTab = this.page.testSubj.locator('osquery-status-tab');
            if (await statusTab.isVisible().catch(() => false)) {
              await statusTab.click();
              await waitForPageReady(this.page);
              if (await resultsTab.isVisible().catch(() => false)) {
                await resultsTab.click();
                await waitForPageReady(this.page);
              }
            } else {
              await this.page.testSubj
                .locator('globalLoadingIndicator')
                .waitFor({ state: 'hidden', timeout: 15_000 })
                .catch(() => {});
            }
          }
        } catch {
          await this.page.testSubj
            .locator('globalLoadingIndicator')
            .waitFor({ state: 'hidden', timeout: 15_000 })
            .catch(() => {});
        }
      }
    }

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
    // eslint-disable-next-line playwright/no-nth-methods -- selecting ECS field by index parameter
    const fieldSelect = this.page.testSubj.locator('osqueryColumnValueSelect').nth(index);
    const searchInput = fieldSelect.locator('[data-test-subj="comboBoxSearchInput"]');
    // eslint-disable-next-line playwright/no-nth-methods -- selecting first matching option from combo
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
        await this.page.testSubj
          .locator('globalLoadingIndicator')
          .waitFor({ state: 'hidden', timeout: 15_000 })
          .catch(() => {});
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
    // eslint-disable-next-line playwright/no-nth-methods -- selecting ECS field by index parameter
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
        // eslint-disable-next-line playwright/no-nth-methods -- selecting ECS field by index parameter
        .first();

      try {
        await matchingOption.waitFor({ state: 'visible', timeout: 10_000 });
        await matchingOption.click();

        return;
      } catch {
        await searchInput.press('Escape');
        await this.page.testSubj
          .locator('globalLoadingIndicator')
          .waitFor({ state: 'hidden', timeout: 5_000 })
          .catch(() => {});
      }
    }

    // Final attempt — fail with a clear error
    await searchInput.click();
    await searchInput.fill('');
    await searchInput.pressSequentially(cleanText);
    const matchingOption = this.page
      .locator('[role="option"]')
      .filter({ hasText: new RegExp(`^.*${cleanText}.*$`, 'i') })
      // eslint-disable-next-line playwright/no-nth-methods -- selecting ECS field by index parameter
      .first();
    await matchingOption.waitFor({ state: 'visible', timeout: 15_000 });
    await matchingOption.click();
  }

  async getQueryEditorHeight(): Promise<number> {
    const box = await this.queryEditor.boundingBox();

    return box?.height ?? 0;
  }
}
