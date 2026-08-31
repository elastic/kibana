/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';

/**
 * Drives the Action Policies list page. Exposes the write affordances gated by
 * the `actionPolicies` write capability (create button, row edit/actions,
 * details-flyout edit + actions menu) so specs can assert they are visible for
 * editors and hidden for read-only users.
 */
export class ActionPoliciesListPage {
  /** Header "Create policy" button; hidden for read-only users. */
  public readonly createButton: Locator;
  /** Row "view details" icon; visible to every role with read access. */
  public readonly viewDetailsButton: Locator;
  /** Details flyout container; a privilege-independent anchor that it opened. */
  public readonly detailsFlyout: Locator;
  /** Edit button inside the details flyout footer; hidden for read-only users. */
  public readonly detailsFlyoutEditButton: Locator;
  /** Overflow actions menu inside the details flyout; hidden for read-only users. */
  public readonly detailsFlyoutActionsMenuButton: Locator;

  constructor(private readonly page: ScoutPage) {
    this.createButton = this.page.testSubj.locator('createActionPolicyButton');
    this.viewDetailsButton = this.page.testSubj.locator('actionPolicyViewDetailsButton');
    this.detailsFlyout = this.page.testSubj.locator('actionPolicyDetailsFlyout');
    this.detailsFlyoutEditButton = this.page.testSubj.locator('detailsFlyoutEditButton');
    this.detailsFlyoutActionsMenuButton = this.page.testSubj.locator(
      'detailsFlyoutActionsMenuButton'
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

  async openDetailsFlyout() {
    await this.viewDetailsButton.click();
  }
}
