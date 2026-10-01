/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euiSelectors } from '@kbn/scout';
import type { EuiBasicTableObject, Locator, ScoutPage } from '@kbn/scout';

/**
 * Drives the Action Policies list page. Exposes the write affordances gated by
 * the `actionPolicies` write capability (create button, row edit/actions,
 * details-flyout Take action button) so specs can assert they are visible for
 * editors and hidden for read-only users.
 */
export class ActionPoliciesListPage {
  /** Header "Create policy" button; hidden for read-only users. */
  public readonly createButton: Locator;
  /** Details flyout container; a privilege-independent anchor that it opened. */
  public readonly detailsFlyout: Locator;
  /** "Take action" button inside the details flyout footer; hidden for read-only users. */
  public readonly detailsFlyoutTakeActionButton: Locator;
  /** "See all affected rules" link in the details flyout; hidden without the rules read capability. */
  public readonly detailsFlyoutSeeAffectedRulesLink: Locator;
  /** "Affected rules" flyout opened from the details flyout. */
  public readonly affectedRulesFlyout: Locator;
  /** Paginated table of the rules matching the policy scope tags. */
  public readonly affectedRulesTable: EuiBasicTableObject;
  /** EUI flyout-history Back button, which returns to the details flyout. */
  public readonly affectedRulesBackButton: Locator;
  /** Close button of the "Affected rules" flyout, which closes the whole flyout history. */
  public readonly affectedRulesCloseButton: Locator;

  constructor(private readonly page: ScoutPage) {
    this.createButton = this.page.testSubj.locator('createActionPolicyButton');
    this.detailsFlyout = this.page.testSubj.locator('actionPolicyDetailsFlyout');
    this.detailsFlyoutTakeActionButton = this.page.testSubj.locator(
      'detailsFlyoutTakeActionButton'
    );
    this.detailsFlyoutSeeAffectedRulesLink = this.page.testSubj.locator(
      'actionPolicyDetailsFlyoutSeeAffectedRulesLink'
    );
    this.affectedRulesFlyout = this.page.testSubj.locator('actionPolicyAffectedRulesFlyout');
    this.affectedRulesTable = this.page.components.basicTable('actionPolicyAffectedRulesTable');
    this.affectedRulesBackButton = this.affectedRulesFlyout.getByTestId('euiFlyoutMenuBackButton');
    this.affectedRulesCloseButton = this.affectedRulesFlyout.getByTestId(
      euiSelectors.flyout.CLOSE_BUTTON_TEST_SUBJ
    );
  }

  async goto() {
    await this.page.gotoApp('management/alertingV2/action_policies');
  }

  async gotoEdit(policyId: string) {
    await this.page.gotoApp(`management/alertingV2/action_policies/edit/${policyId}`);
  }

  detailsLink(policyName: string) {
    return this.page.testSubj.locator(`content-list-table-item-link`, { hasText: policyName });
  }

  async openDetailsFlyout(policyName: string) {
    await this.detailsLink(policyName).click();
  }

  affectedRuleRow(ruleName: string) {
    return this.affectedRulesTable.rows.filter({ hasText: ruleName });
  }

  affectedRuleOpenLink(ruleName: string) {
    return this.affectedRuleRow(ruleName).getByRole('link', { name: ruleName });
  }
}
