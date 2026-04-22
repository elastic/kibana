/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { waitForKibanaChromeLoadingFinished } from '../../common/wait_for_kibana_loading_finished';

const OSQUERY_RESPONSE_ACTION_ADD_BUTTON = 'Osquery-response-action-type-selection-option';

export class RuleEditorPage {
  constructor(private readonly page: ScoutPage) {}

  async navigateToRuleEdit(ruleId: string): Promise<void> {
    await this.page.gotoApp(`security/rules/id/${ruleId}/edit`);
    await waitForKibanaChromeLoadingFinished(this.page).catch(() => {});
  }

  async navigateToRulesList(): Promise<void> {
    await this.page.gotoApp('security/rules');
    await waitForKibanaChromeLoadingFinished(this.page).catch(() => {});
  }

  async openRuleByName(ruleName: string): Promise<void> {
    await this.page
      .locator(`a[data-test-subj="ruleName"]`)
      .filter({ hasText: ruleName })
      .click({ force: true });
  }

  async openRuleAlertsView(ruleName: string): Promise<void> {
    await this.navigateToRulesList();
    await this.openRuleByName(ruleName);
    await this.goToAlertsTab();

    const expandEvent = this.page.testSubj.locator('expand-event');
    // eslint-disable-next-line playwright/no-nth-methods -- waits for the first alert row to render; any row appearing is sufficient readiness for the caller which will then expand it
    const firstAlert = expandEvent.first();
    await firstAlert.waitFor({ state: 'visible', timeout: 120_000 });
  }

  async goToAlertsTab(): Promise<void> {
    await this.page.testSubj.locator('navigation-alerts').click();
  }

  async openRuleSettingsFromAlerts(): Promise<void> {
    await this.page.testSubj.locator('editRuleSettingsLink').click();
  }

  // The detections-engine rule view renders `editRuleSettingsLink` to enter edit mode;
  // the rule-actions tab is only mounted under the edit view. Tests that land on the
  // rule from the list (rule details) must click this link before `goToActionsTab`.
  async enterRuleEditMode(): Promise<void> {
    const editLink = this.page.testSubj.locator('editRuleSettingsLink');
    await editLink.waitFor({ state: 'visible', timeout: 60_000 });
    await editLink.click();
    await waitForKibanaChromeLoadingFinished(this.page).catch(() => {});
  }

  async closeDatePickerTabIfVisible(): Promise<void> {
    const absoluteTab = this.page.testSubj.locator('superDatePickerAbsoluteTab');
    if (await absoluteTab.isVisible().catch(() => false)) {
      await this.page.keyboard.press('Escape').catch(() => {});
    }
  }

  async goToActionsTab(): Promise<void> {
    await this.closeDatePickerTabIfVisible();
    await this.page.testSubj.locator('edit-rule-actions-tab').click();
    await this.page
      .getByText('Loading connectors...')
      .waitFor({ state: 'hidden' })
      .catch(() => {});
  }

  async clickAddOsqueryResponseAction(): Promise<void> {
    await this.page.testSubj.locator(OSQUERY_RESPONSE_ACTION_ADD_BUTTON).click();
  }

  responseActionItem(index: number): Locator {
    return this.page.testSubj.locator(`response-actions-list-item-${index}`);
  }

  async chooseRunPackInResponseAction(itemIndex: number): Promise<void> {
    await this.responseActionItem(itemIndex).getByText('Run a set of queries in a pack').click();
  }

  async selectPackInComboBox(itemIndex: number, packName: string): Promise<void> {
    const row = this.responseActionItem(itemIndex);
    const search = row.getByTestId('comboBoxSearchInput');
    await row.getByTestId('comboBoxInput').click();
    await search.click();
    await search.press('Control+a');
    await search.fill(packName);
    await this.page.keyboard.press('ArrowDown');
    await this.page.keyboard.press('Enter');

    // EuiComboBox commits the selection asynchronously. Without waiting for the
    // input value to actually carry the new pack name, callers can race a
    // subsequent save click before the form's `pack` field updates — the
    // request body then carries the previous pack's queries (observed in
    // `alert_response_action_form` second-save assertion).
    // Combobox single-select with `singleSelection={asPlainText}` writes the
    // chosen option label into the input's `value` attribute.
    await expect(search).toHaveValue(packName, { timeout: 30_000 });
  }

  async typePackNameInComboBox(itemIndex: number, packName: string): Promise<void> {
    const row = this.responseActionItem(itemIndex);
    await row.getByTestId('comboBoxInput').click();
    await row.getByTestId('comboBoxSearchInput').fill(packName);
    await this.page.keyboard.press('ArrowDown');
    await this.page.keyboard.press('Enter');
  }

  async clickOsqueryAddInvestigationGuideQueries(): Promise<void> {
    await this.page.testSubj.locator('osqueryAddInvestigationGuideQueries').click();
  }

  async waitForInvestigationGuideBlockVisible(): Promise<void> {
    await this.page.testSubj
      .locator('osquery-investigation-guide-text')
      .waitFor({ state: 'visible', timeout: 60_000 });
  }

  async waitForInvestigationGuideBlockHidden(): Promise<void> {
    await this.page.testSubj
      .locator('osquery-investigation-guide-text')
      .waitFor({ state: 'hidden', timeout: 60_000 });
  }

  async clickSaveRule(): Promise<void> {
    await this.page.testSubj.locator('ruleEditSubmitButton').click();
  }

  async clickSaveChanges(): Promise<void> {
    await this.page.getByRole('button', { name: 'Save changes' }).click();
  }

  async dismissToastIfVisible(): Promise<void> {
    const closeButtons = await this.page.testSubj
      .locator('globalToastList')
      .locator('[data-test-subj="toastCloseButton"]')
      .all();
    for (const btn of closeButtons) {
      await btn.click().catch(() => {});
    }
  }
}
