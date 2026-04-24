/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';
import { selectSingleAsPlainTextOption } from '../../common/combo_box_helpers';
import { waitForMonacoContains, waitForMonacoNonEmpty } from '../../common/monaco_helpers';

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
    await this.addPackButton.waitFor({ state: 'visible', timeout: 60_000 });
  }

  async openCreatePackFlyout(): Promise<void> {
    await this.addPackButton.click();
  }

  async fillPackName(name: string): Promise<void> {
    await this.packNameInput.waitFor({ state: 'visible', timeout: 15_000 });
    await this.packNameInput.fill(name);
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

    // Blur + wait for Monaco model (500ms debounce) before Save.
    await this.osqueryEditor.evaluate((el: HTMLElement) => {
      el.querySelector<HTMLTextAreaElement>('textarea')?.blur();
    });
    await waitForMonacoContains(this.page, query, { timeoutMs: 10_000 });
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
    // Flyout title hidden = flyout closed (save button alone is ambiguous on validation failure).
    await this.flyoutTitle.waitFor({ state: 'hidden', timeout: 15_000 });
  }

  /** Attach saved query via plain-text combobox helper (avoids keyboard race with async options). */
  async attachSavedQuery(savedQueryLabel: string): Promise<void> {
    await selectSingleAsPlainTextOption(this.page, {
      wrapper: { locator: this.savedQuerySelect },
      optionName: savedQueryLabel,
    });
    await this.osqueryEditor.waitFor({ state: 'visible', timeout: 30_000 });
    await waitForMonacoNonEmpty(this.page, { timeoutMs: 30_000 });
  }

  /** Save new pack; confirm deploy modal if Fleet shows agents on policies. */
  async saveNewPack(): Promise<void> {
    await this.savePackButton.click();
    await this.confirmPolicyChangeModalIfPresent();
  }

  async updatePack(): Promise<void> {
    await this.updatePackButton.click();
    await this.confirmPolicyChangeModalIfPresent();
  }

  /** Confirm deploy modal when present; no-op when zero agents (no modal). */
  async confirmPolicyChangeModalIfPresent(): Promise<void> {
    try {
      await this.confirmModalButton.waitFor({ state: 'visible', timeout: 15_000 });
      await this.confirmModalButton.click();
    } catch {
      // No modal when no agents affected.
    }
  }

  /** @deprecated Use {@link confirmPolicyChangeModalIfPresent} (same behavior). */
  async confirmPolicyChangeModal(): Promise<void> {
    await this.confirmPolicyChangeModalIfPresent();
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
