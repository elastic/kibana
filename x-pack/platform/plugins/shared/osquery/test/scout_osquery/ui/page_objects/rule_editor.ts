/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';

import { selectSingleAsPlainTextOption } from '../../common/combo_box_helpers';
import type { SeedAlertResult } from '../helpers/seed_alert';

const OSQUERY_RESPONSE_ACTION_ADD_BUTTON = 'Osquery-response-action-type-selection-option';

export class RuleEditorPage {
  public readonly ruleNameLinks: Locator;
  public readonly expandEvent: Locator;
  public readonly alertsTab: Locator;
  public readonly editRuleSettingsLink: Locator;
  public readonly actionsTab: Locator;
  public readonly osqueryResponseActionAddButton: Locator;
  public readonly absoluteDatePickerTab: Locator;
  public readonly loadingConnectorsText: Locator;
  public readonly investigationGuideBlock: Locator;
  public readonly osqueryAddInvestigationGuideQueries: Locator;
  public readonly ruleEditSubmitButton: Locator;
  public readonly saveChangesButton: Locator;
  public readonly toastList: Locator;

  constructor(private readonly page: ScoutPage) {
    this.ruleNameLinks = this.page.locator('a[data-test-subj="ruleName"]');
    this.expandEvent = this.page.testSubj.locator('expand-event');
    this.alertsTab = this.page.testSubj.locator('navigation-alerts');
    this.editRuleSettingsLink = this.page.testSubj.locator('editRuleSettingsLink');
    this.actionsTab = this.page.testSubj.locator('edit-rule-actions-tab');
    this.osqueryResponseActionAddButton = this.page.testSubj.locator(
      OSQUERY_RESPONSE_ACTION_ADD_BUTTON
    );
    this.absoluteDatePickerTab = this.page.testSubj.locator('superDatePickerAbsoluteTab');
    this.loadingConnectorsText = this.page.getByText('Loading connectors...');
    this.investigationGuideBlock = this.page.testSubj.locator('osquery-investigation-guide-text');
    this.osqueryAddInvestigationGuideQueries = this.page.testSubj.locator(
      'osqueryAddInvestigationGuideQueries'
    );
    this.ruleEditSubmitButton = this.page.testSubj.locator('ruleEditSubmitButton');
    this.saveChangesButton = this.page.getByRole('button', { name: 'Save changes' });
    this.toastList = this.page.testSubj.locator('globalToastList');
  }

  async navigateToRuleEdit(ruleId: string): Promise<void> {
    await this.page.gotoApp(`security/rules/id/${ruleId}/edit`);
    await this.page.testSubj.locator('edit-rule-define-tab').waitFor({
      state: 'visible',
      timeout: 120_000,
    });
  }

  async navigateToRulesList(): Promise<void> {
    await this.page.gotoApp('security/rules');
  }

  async openRuleByName(ruleName: string): Promise<void> {
    await this.ruleNameLinks.filter({ hasText: ruleName }).click({ force: true });
  }

  async openRuleAlertsView(ruleName: string): Promise<void> {
    await this.navigateToRulesList();
    await this.openRuleByName(ruleName);
    await this.goToAlertsTab();

    // Seeded alert is already indexed; wait for first alert row UI only.
    // eslint-disable-next-line playwright/no-nth-methods -- first row = table ready
    const firstAlert = this.expandEvent.first();
    await firstAlert.waitFor({ state: 'visible', timeout: 30_000 });
  }

  /** Opens seeded alert via `security/alerts/redirect/:id` (no rules registry). */
  async openSeededAlertFlyout(seed: SeedAlertResult): Promise<void> {
    const qs = new URLSearchParams({
      index: seed.indexName,
      timestamp: seed.timestampIso,
    }).toString();
    await this.page.gotoApp(`security/alerts/redirect/${seed.alertId}?${qs}`);
    await this.page.testSubj.locator('securitySolutionFlyoutFooterDropdownButton').waitFor({
      state: 'visible',
      timeout: 60_000,
    });
  }

  /** Close document flyout so alert row / timeline controls are reachable. */
  async dismissDocumentFlyoutToExposeAlertsTable(): Promise<void> {
    // Target close inside the document dialog (avoids ambiguous flyout close buttons).
    const documentFlyoutClose = this.page
      .getByRole('dialog')
      .filter({ has: this.page.testSubj.locator('securitySolutionFlyoutFooterDropdownButton') })
      .getByTestId('euiFlyoutCloseButton');
    await documentFlyoutClose.click({ timeout: 5_000 }).catch(async () => {
      await this.page.keyboard.press('Escape');
    });
    // eslint-disable-next-line playwright/no-nth-methods -- first alert row visible
    await this.expandEvent.first().waitFor({ state: 'visible', timeout: 30_000 });
  }

  async goToAlertsTab(): Promise<void> {
    await this.alertsTab.click();
  }

  async openRuleSettingsFromAlerts(): Promise<void> {
    await this.editRuleSettingsLink.click();
  }

  // Rule actions tab only exists in edit mode — click from list/details first.
  async enterRuleEditMode(): Promise<void> {
    await this.editRuleSettingsLink.waitFor({ state: 'visible', timeout: 60_000 });
    await this.editRuleSettingsLink.click();
  }

  async goToActionsTab(): Promise<void> {
    // Escape closes date-picker popover if open; harmless otherwise.
    await this.page.keyboard.press('Escape');
    await this.actionsTab.click();
    await this.loadingConnectorsText.waitFor({ state: 'hidden' }).catch(() => {});
  }

  async clickAddOsqueryResponseAction(): Promise<void> {
    await this.osqueryResponseActionAddButton.click();
  }

  responseActionItem(index: number): Locator {
    return this.page.testSubj.locator(`response-actions-list-item-${index}`);
  }

  async chooseRunPackInResponseAction(itemIndex: number): Promise<void> {
    await this.responseActionItem(itemIndex).getByText('Run a set of queries in a pack').click();
  }

  async selectPackInComboBox(
    itemIndex: number,
    packName: string,
    expectedQueryIds?: readonly string[]
  ): Promise<void> {
    const row = this.responseActionItem(itemIndex);
    // Plain-text combobox: use shared helper (avoids ArrowDown/Enter vs async hydration races).
    await selectSingleAsPlainTextOption(this.page, {
      wrapper: { locator: row.locator('[data-test-subj="select-live-pack"]') },
      optionName: packName,
    });

    // Wait for pack queries table: packId commits before `usePack` hydrates `queries` (avoid empty PUT).
    // eslint-disable-next-line playwright/no-nth-methods -- first visible pack table in row
    const packQueriesTable = row.locator('table.euiTable').filter({ visible: true }).first();
    await packQueriesTable.waitFor({ state: 'visible', timeout: 60_000 });

    const expectedRowCount = expectedQueryIds?.length ?? 1;
    await packQueriesTable
      .locator('tbody tr.euiTableRow')
      // eslint-disable-next-line playwright/no-nth-methods -- Nth row = N queries hydrated
      .nth(expectedRowCount - 1)
      .waitFor({ state: 'attached', timeout: 60_000 });

    // Optional: assert expected query ids rendered (catches stale pack data).
    if (expectedQueryIds && expectedQueryIds.length > 0) {
      await Promise.all(
        expectedQueryIds.map((queryId) =>
          packQueriesTable
            .getByText(queryId, { exact: true })
            // eslint-disable-next-line playwright/no-nth-methods -- tooltip duplicates text nodes
            .first()
            .waitFor({ state: 'visible', timeout: 15_000 })
        )
      );
    }
  }

  async typePackNameInComboBox(itemIndex: number, packName: string): Promise<void> {
    const row = this.responseActionItem(itemIndex);
    await row.getByTestId('comboBoxInput').click();
    await row.getByTestId('comboBoxSearchInput').fill(packName);
    await this.page.keyboard.press('ArrowDown');
    await this.page.keyboard.press('Enter');
  }

  async clickOsqueryAddInvestigationGuideQueries(): Promise<void> {
    await this.osqueryAddInvestigationGuideQueries.click();
  }

  async waitForInvestigationGuideBlockVisible(): Promise<void> {
    await this.investigationGuideBlock.waitFor({ state: 'visible', timeout: 60_000 });
  }

  async waitForInvestigationGuideBlockHidden(): Promise<void> {
    await this.investigationGuideBlock.waitFor({ state: 'hidden', timeout: 60_000 });
  }

  async clickSaveRule(): Promise<void> {
    await this.ruleEditSubmitButton.click();
  }

  async clickSaveChanges(): Promise<void> {
    await this.saveChangesButton.click();
  }

  /** Close visible toasts; ignores races where a toast auto-dismisses mid-click. */
  async dismissAllToasts(): Promise<void> {
    const closeButtons = await this.toastList.locator('[data-test-subj="toastCloseButton"]').all();
    for (const btn of closeButtons) {
      await btn.click().catch(() => {});
    }
  }
}
