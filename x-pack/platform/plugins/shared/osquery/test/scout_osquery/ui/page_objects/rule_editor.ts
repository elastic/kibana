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

    // Callers seed an alert deterministically via `helpers/seed_alert.ts`
    // before invoking this method, so this wait only covers UI render, not
    // task-manager latency. 30 s is comfortable for the first row to mount
    // off an already-indexed document.
    // eslint-disable-next-line playwright/no-nth-methods -- waits for the first alert row to render; any row appearing is sufficient readiness for the caller which will then expand it
    const firstAlert = this.expandEvent.first();
    await firstAlert.waitFor({ state: 'visible', timeout: 30_000 });
  }

  /**
   * Opens the document-details flyout for a seeded alert via
   * `security/alerts/redirect/:id` — avoids Security Rules management (prebuilt
   * rules bootstrap / registry) entirely.
   */
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

  /**
   * After `openSeededAlertFlyout`, the alerts table row actions (e.g. send to
   * timeline) may be obscured. Close the flyout so `expand-event` / timeline
   * controls are reachable.
   */
  async dismissDocumentFlyoutToExposeAlertsTable(): Promise<void> {
    // Close the document-details dialog that contains the flyout footer (avoids
    // ambiguous `euiFlyoutCloseButton` when multiple flyouts are mounted).
    const documentFlyoutClose = this.page
      .getByRole('dialog')
      .filter({ has: this.page.testSubj.locator('securitySolutionFlyoutFooterDropdownButton') })
      .getByTestId('euiFlyoutCloseButton');
    await documentFlyoutClose.click({ timeout: 5_000 }).catch(async () => {
      await this.page.keyboard.press('Escape');
    });
    // eslint-disable-next-line playwright/no-nth-methods -- same readiness signal as `openRuleAlertsView`: first alert row on the filtered alerts page
    await this.expandEvent.first().waitFor({ state: 'visible', timeout: 30_000 });
  }

  async goToAlertsTab(): Promise<void> {
    await this.alertsTab.click();
  }

  async openRuleSettingsFromAlerts(): Promise<void> {
    await this.editRuleSettingsLink.click();
  }

  // The detections-engine rule view renders `editRuleSettingsLink` to enter edit mode;
  // the rule-actions tab is only mounted under the edit view. Tests that land on the
  // rule from the list (rule details) must click this link before `goToActionsTab`.
  async enterRuleEditMode(): Promise<void> {
    await this.editRuleSettingsLink.waitFor({ state: 'visible', timeout: 60_000 });
    await this.editRuleSettingsLink.click();
  }

  async goToActionsTab(): Promise<void> {
    // Escape is idempotent — if the rule-edit page's absolute-date-picker
    // popover is open from a prior click it will close; otherwise nothing
    // happens. No conditional state check needed.
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
    // Same `asPlainText` + `title=` selection path as live-query / alert flyout
    // pack pickers — ArrowDown/Enter races async `usePacks` hydration and
    // `waitForFunction` on `comboBoxSearchInput.value` breaks once EUI swaps
    // the input for plain-text rendering after commit.
    await selectSingleAsPlainTextOption(this.page, {
      wrapper: { locator: row.locator('[data-test-subj="select-live-pack"]') },
      optionName: packName,
    });

    // The combobox commit only marks `packId` in the form; the form's
    // `queries` field is populated by a subsequent `useEffect` that waits on
    // the `usePack` React Query fetch. Callers that click Save immediately
    // after this method can capture a PUT body with `queries: []` because
    // that fetch is still in flight. Wait for the pack's queries table to
    // mount inside the response-action row — `PackFieldWrapper` only renders
    // `PackQueriesStatusTable` after `selectedPackData.queries?.length > 0`,
    // which is the same precondition the `replace(queriesArray)` effect
    // runs under, so the table mounting is a reliable "queries have been
    // hydrated" signal.
    //
    // NOTE on test-subj choice: `PackQueriesStatusTable` renders
    // `toggleIcon-<id>` only when `item.action_id` is set (i.e. the query
    // has been executed). In the *form* view we have no `action_id` — the
    // row only has the ID column text, the query text, and EuiBasicTable
    // `<tr>` nodes. We anchor on the EuiBasicTable itself plus a row count
    // check, which works regardless of whether `action_id` is populated.
    // eslint-disable-next-line playwright/no-nth-methods -- prefer the first *visible* table in the row (pack queries); stray hidden shells can precede it in DOM order
    const packQueriesTable = row.locator('table.euiTable').filter({ visible: true }).first();
    await packQueriesTable.waitFor({ state: 'visible', timeout: 60_000 });

    const expectedRowCount = expectedQueryIds?.length ?? 1;
    // Wait for the Nth row to mount — equivalent to "row count >= N" but
    // expressed as a single `waitFor` so we stay out of the `expect.poll`
    // page-object anti-pattern. Targeting the (N-1)-th row is safe because
    // EuiBasicTable mounts rows in order.

    await packQueriesTable
      .locator('tbody tr.euiTableRow')
      // eslint-disable-next-line playwright/no-nth-methods -- wait for the last expected data row by index; row count is the hydration signal, not an arbitrary pick
      .nth(expectedRowCount - 1)
      .waitFor({ state: 'attached', timeout: 60_000 });

    // Optional per-id belt-and-braces: if the caller knows the exact ids we
    // expect, confirm each one's ID-column text is rendered. Missing IDs
    // indicate the form rendered stale data (e.g. previous pack's queries),
    // not just an underpopulated fetch. `renderIDColumn` wraps the id in
    // `<span tabindex="0">` inside an EuiToolTip, so match by exact text
    // within that scope.
    if (expectedQueryIds && expectedQueryIds.length > 0) {
      await Promise.all(
        expectedQueryIds.map((queryId) =>
          packQueriesTable
            .getByText(queryId, { exact: true })
            // eslint-disable-next-line playwright/no-nth-methods -- `renderIDColumn` wraps the id in `<span tabindex="0">` inside an EuiToolTip, yielding two text matches per id; either match proves the id rendered
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

  /**
   * Dismiss every currently-visible toast in the global toast list. `.all()`
   * returns an empty array when the list is empty, so this method is a no-op
   * in that case (not a conditional branch). Individual clicks are wrapped in
   * `.catch()` because toasts can auto-dismiss between the `all()` snapshot
   * and the `click()` — that race is unavoidable in the DOM.
   */
  async dismissAllToasts(): Promise<void> {
    const closeButtons = await this.toastList.locator('[data-test-subj="toastCloseButton"]').all();
    for (const btn of closeButtons) {
      await btn.click().catch(() => {});
    }
  }
}
