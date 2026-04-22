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
  public readonly packNameInput: Locator;
  public readonly packDescriptionInput: Locator;
  public readonly queryIdInput: Locator;
  public readonly osqueryEditor: Locator;
  public readonly intervalField: Locator;
  public readonly timeoutInput: Locator;
  public readonly editPackButton: Locator;
  public readonly confirmModalButton: Locator;
  public readonly flyoutTitle: Locator;
  public readonly attachNextQueryText: Locator;
  public readonly paginationPopover: Locator;
  public readonly pagination50Rows: Locator;
  public readonly contextMenuPanel: Locator;
  public readonly docsLoading: Locator;

  constructor(private readonly page: ScoutPage) {
    this.addPackButton = this.page.testSubj.locator('add-pack-button');
    this.savePackButton = this.page.testSubj.locator('save-pack-button');
    this.updatePackButton = this.page.testSubj.locator('update-pack-button');
    this.addQueryButton = this.page.testSubj.locator('add-query-button');
    this.queryFlyoutSaveButton = this.page.testSubj.locator('query-flyout-save-button');
    this.policyComboBox = this.page.testSubj.locator('policyIdsComboBox');
    this.savedQuerySelect = this.page.testSubj.locator('savedQuerySelect');
    this.packNameInput = this.page.locator('input[name="name"]');
    this.packDescriptionInput = this.page.locator('input[name="description"]');
    this.queryIdInput = this.page.locator('input[name="id"]');
    this.osqueryEditor = this.page.testSubj.locator('osqueryEditor');
    this.intervalField = this.page.testSubj.locator('osquery-interval-field');
    this.timeoutInput = this.page.testSubj.locator('timeout-input');
    this.editPackButton = this.page.testSubj.locator('edit-pack-button');
    this.confirmModalButton = this.page.testSubj.locator('confirmModalConfirmButton');
    this.flyoutTitle = this.page.locator('h2#flyoutTitle');
    this.attachNextQueryText = this.page.getByText('Attach next query');
    this.paginationPopover = this.page.testSubj.locator('tablePaginationPopoverButton');
    this.pagination50Rows = this.page.testSubj.locator('tablePagination-50-rows');
    this.contextMenuPanel = this.page.locator('.euiContextMenuPanel');
    this.docsLoading = this.page.testSubj.locator('docsLoading');
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
    await this.packNameInput.waitFor({ state: 'visible', timeout: 15_000 });
    await this.packNameInput.fill(name);
  }

  async fillPackDescription(text: string): Promise<void> {
    if (await this.packDescriptionInput.isVisible().catch(() => false)) {
      await this.packDescriptionInput.fill(text);
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
    await this.attachNextQueryText.waitFor({ state: 'visible', timeout: 30_000 });
  }

  async fillQueryId(id: string): Promise<void> {
    await this.queryIdInput.waitFor({ state: 'visible', timeout: 15_000 });
    await this.queryIdInput.fill(id);
  }

  async fillQueryInFlyoutFromMonaco(query: string): Promise<void> {
    await this.osqueryEditor.waitFor({ state: 'visible', timeout: 30_000 });
    await this.osqueryEditor.click();
    await this.osqueryEditor.pressSequentially(query, { delay: 5 });

    // Monaco's React wrapper syncs typed text into RHF via a 500ms debounce on
    // the onChange callback. If the next action (e.g. Save) lands before the
    // debounce fires, RHF still sees an empty `query` field and rejects the
    // save silently — the flyout never closes. Blur the hidden textarea AND
    // wait for the Monaco model to carry the text before returning, mirroring
    // the same guard used by `alert_flyout.ts::inputFlyoutQuery`.
    await this.osqueryEditor.evaluate((el: HTMLElement) => {
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
    await this.intervalField.click();
    await this.intervalField.clear();
    await this.intervalField.fill(seconds);
  }

  async setQueryTimeout(timeout: string): Promise<void> {
    await this.timeoutInput.clear();
    await this.timeoutInput.fill(timeout);
  }

  async saveQueryFlyout(): Promise<void> {
    await this.queryFlyoutSaveButton.click();
    // Wait for the flyout's title heading to disappear — a more reliable signal
    // than the save button (which can stay visible if validation fails). The
    // flyout uses `aria-labelledby="flyoutTitle"` with either "Edit query" or
    // "Attach next query" as the title (source: `public/packs/queries/query_flyout.tsx:103-122`).
    // Detached flyout means the portal's pointer-event capture is gone, so the
    // outer pack form's Update button is clickable again.
    await this.flyoutTitle.waitFor({ state: 'hidden', timeout: 15_000 });
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
    if (await this.confirmModalButton.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await this.confirmModalButton.click();
    }
  }

  async openPackFromList(packName: string): Promise<void> {
    await this.page.getByRole('link', { name: packName }).click();
  }

  async openEditPack(): Promise<void> {
    await this.editPackButton.click();
  }

  async setPagination50Rows(): Promise<void> {
    await this.paginationPopover.click();
    await this.pagination50Rows.click();
  }

  getEditSavedQueryButton(savedQueryName: string): Locator {
    return this.page.getByRole('button', { name: `Edit ${savedQueryName}` });
  }

  async clickPackRowKebab(packName: string): Promise<void> {
    await this.page.getByRole('button', { name: `Actions for ${packName}` }).click();
  }

  async chooseContextMenuItem(label: string | RegExp): Promise<void> {
    await this.contextMenuPanel.getByText(label).click();
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
    await this.docsLoading.waitFor({ state: 'visible', timeout: 10_000 }).catch(() => {});
    await this.docsLoading.waitFor({ state: 'hidden', timeout: 120_000 });
  }
}
