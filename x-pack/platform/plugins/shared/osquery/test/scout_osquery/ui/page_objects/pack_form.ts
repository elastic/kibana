/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';
import { waitForKibanaChromeLoadingFinished } from '../../common/wait_for_kibana_loading_finished';

export class PackFormPage {
  public readonly addPackButton: Locator;
  public readonly savePackButton: Locator;
  public readonly updatePackButton: Locator;
  public readonly addQueryButton: Locator;
  public readonly queryFlyoutSaveButton: Locator;
  public readonly policyComboBox: Locator;
  public readonly savedQuerySelect: Locator;

  constructor(private readonly page: ScoutPage) {
    this.addPackButton = this.page.testSubj.locator('add-pack-button');
    this.savePackButton = this.page.testSubj.locator('save-pack-button');
    this.updatePackButton = this.page.testSubj.locator('update-pack-button');
    this.addQueryButton = this.page.testSubj.locator('add-query-button');
    this.queryFlyoutSaveButton = this.page.testSubj.locator('query-flyout-save-button');
    this.policyComboBox = this.page.testSubj.locator('policyIdsComboBox');
    this.savedQuerySelect = this.page.testSubj.locator('savedQuerySelect');
  }

  async navigateToPacksList(): Promise<void> {
    await this.page.gotoApp('osquery/packs');
    await waitForKibanaChromeLoadingFinished(this.page).catch(() => {});
    await this.addPackButton.waitFor({ state: 'visible', timeout: 60_000 });
  }

  async openCreatePackFlyout(): Promise<void> {
    await waitForKibanaChromeLoadingFinished(this.page).catch(() => {});
    await this.addPackButton.click();
  }

  async fillPackName(name: string): Promise<void> {
    const nameInput = this.page.locator('input[name="name"]');
    await nameInput.waitFor({ state: 'visible', timeout: 15_000 });
    await nameInput.fill(name);
  }

  async fillPackDescription(text: string): Promise<void> {
    const desc = this.page.locator('input[name="description"]');
    if (await desc.isVisible().catch(() => false)) {
      await desc.fill(text);
    }
  }

  async selectPolicy(policyLabel: string): Promise<void> {
    const input = this.policyComboBox.getByTestId('comboBoxSearchInput');
    await input.click();
    await input.fill(policyLabel);
    await this.page.keyboard.press('ArrowDown');
    await this.page.keyboard.press('Enter');
    await this.page.keyboard.press('Escape').catch(() => {});
  }

  async openAddQueryFlyout(): Promise<void> {
    await this.addQueryButton.click();
    await this.page.getByText('Attach next query').waitFor({ state: 'visible', timeout: 30_000 });
  }

  async fillQueryId(id: string): Promise<void> {
    const idInput = this.page.locator('input[name="id"]');
    await idInput.waitFor({ state: 'visible', timeout: 15_000 });
    await idInput.fill(id);
  }

  async fillQueryInFlyoutFromMonaco(query: string): Promise<void> {
    const editor = this.page.testSubj.locator('osqueryEditor');
    await editor.waitFor({ state: 'visible', timeout: 30_000 });
    await editor.click();
    await editor.pressSequentially(query, { delay: 5 });

    // Monaco's React wrapper syncs typed text into RHF via a 500ms debounce on
    // the onChange callback. If the next action (e.g. Save) lands before the
    // debounce fires, RHF still sees an empty `query` field and rejects the
    // save silently — the flyout never closes. Blur the hidden textarea AND
    // wait for the Monaco model to carry the text before returning, mirroring
    // the same guard used by `alert_flyout.ts::inputFlyoutQuery`.
    await editor.evaluate((el: HTMLElement) => {
      el.querySelector<HTMLTextAreaElement>('textarea')?.blur();
    });
    await this.page.waitForFunction(
      (expected: string) => {
        const w = window as unknown as {
          MonacoEnvironment?: {
            monaco?: { editor: { getModels: () => Array<{ getValue: () => string }> } };
          };
        };
        const models = w.MonacoEnvironment?.monaco?.editor.getModels() ?? [];

        return models.some((m) => m.getValue().includes(expected));
      },
      query,
      { timeout: 10_000 }
    );
  }

  async setQueryIntervalSeconds(seconds: string): Promise<void> {
    const interval = this.page.testSubj.locator('osquery-interval-field');
    await interval.click();
    await interval.clear();
    await interval.fill(seconds);
  }

  async setQueryTimeout(timeout: string): Promise<void> {
    const timeoutInput = this.page.testSubj.locator('timeout-input');
    await timeoutInput.clear();
    await timeoutInput.fill(timeout);
  }

  async saveQueryFlyout(): Promise<void> {
    await this.queryFlyoutSaveButton.click();
    // Wait for the flyout's title heading to disappear — a more reliable signal
    // than the save button (which can stay visible if validation fails). The
    // flyout uses `aria-labelledby="flyoutTitle"` with either "Edit query" or
    // "Attach next query" as the title (source: `public/packs/queries/query_flyout.tsx:103-122`).
    // Detached flyout means the portal's pointer-event capture is gone, so the
    // outer pack form's Update button is clickable again.
    const flyoutTitle = this.page.locator('h2#flyoutTitle');
    await flyoutTitle.waitFor({ state: 'hidden', timeout: 15_000 });
  }

  async attachSavedQuery(savedQueryLabel: string): Promise<void> {
    const input = this.savedQuerySelect.getByTestId('comboBoxSearchInput');
    await input.click();
    await input.fill(savedQueryLabel);
    await this.page.keyboard.press('ArrowDown');
    await this.page.keyboard.press('Enter');
  }

  async saveNewPack(): Promise<void> {
    await this.savePackButton.click();
    await this.confirmPolicyChangeModalIfVisible();
  }

  async updatePack(): Promise<void> {
    await this.updatePackButton.click();
    await this.confirmPolicyChangeModalIfVisible();
  }

  // Pack create/update attaches queries to agent policies. Fleet shows a confirmation
  // modal ("Update X policies?") when the pack is bound to live policies; the Cypress
  // suite relied on `closeModalIfVisible()` after every save. Without dismissing it,
  // the subsequent assertions (success toast, navigation) never land because the
  // overlay intercepts pointer events on the next action.
  async confirmPolicyChangeModalIfVisible(): Promise<void> {
    const confirm = this.page.testSubj.locator('confirmModalConfirmButton');
    if (await confirm.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await confirm.click();
    }
  }

  async openPackFromList(packName: string): Promise<void> {
    await this.page.getByRole('link', { name: packName }).click();
  }

  async openEditPack(): Promise<void> {
    await this.page.testSubj.locator('edit-pack-button').click();
  }

  async setPagination50Rows(): Promise<void> {
    await this.page.testSubj.locator('tablePaginationPopoverButton').click();
    await this.page.testSubj.locator('tablePagination-50-rows').click();
  }

  getEditSavedQueryButton(savedQueryName: string): Locator {
    return this.page.getByRole('button', { name: `Edit ${savedQueryName}` });
  }

  async clickPackRowKebab(packName: string): Promise<void> {
    await this.page.getByRole('button', { name: `Actions for ${packName}` }).click();
  }

  async chooseContextMenuItem(label: string | RegExp): Promise<void> {
    await this.page.locator('.euiContextMenuPanel').getByText(label).click();
  }

  async togglePackActiveFromList(packName: string): Promise<void> {
    await this.page.locator(`[aria-label="${packName}"]`).click();
  }

  async waitForPackDetailsHeading(packName: string): Promise<void> {
    await this.page.getByText(new RegExp(`${packName} details`)).waitFor({
      state: 'visible',
      timeout: 60_000,
    });
  }

  async waitForDocsLoadingGone(): Promise<void> {
    const loading = this.page.testSubj.locator('docsLoading');
    await loading.waitFor({ state: 'visible', timeout: 10_000 }).catch(() => {});
    await loading.waitFor({ state: 'hidden', timeout: 120_000 });
  }
}
