/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';
import type { AlertingMountConfig } from './alerting_mount_config';

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
  /** Content list toolbar search box. */
  private readonly searchBox: Locator;

  constructor(private readonly page: ScoutPage, private readonly mountConfig: AlertingMountConfig) {
    this.createButton = this.page.testSubj.locator('createActionPolicyButton');
    this.detailsFlyout = this.page.testSubj.locator('actionPolicyDetailsFlyout');
    this.detailsFlyoutTakeActionButton = this.page.testSubj.locator(
      'detailsFlyoutTakeActionButton'
    );
    this.searchBox = this.page.testSubj.locator('contentListToolbar-searchBox');
  }

  async goto() {
    await this.page.gotoApp(`${this.mountConfig.appRoute}${this.mountConfig.paths.actionPolicies}`);
  }

  async gotoEdit(policyId: string) {
    await this.page.gotoApp(
      `${this.mountConfig.appRoute}${this.mountConfig.subPaths.actionPoliciesEdit(policyId)}`
    );
  }

  detailsLink(policyName: string) {
    return this.page.testSubj.locator(`content-list-table-item-link`, { hasText: policyName });
  }

  async search(value: string) {
    await this.searchBox.fill(value);
    await this.searchBox.press('Enter');
  }

  async openDetailsFlyout(policyName: string) {
    await this.detailsLink(policyName).click();
  }
}
