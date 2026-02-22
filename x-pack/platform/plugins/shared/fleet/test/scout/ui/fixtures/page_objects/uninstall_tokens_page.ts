/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';
import { UNINSTALL_TOKENS } from '../../common/selectors';

export class UninstallTokensPage {
  constructor(private readonly page: ScoutPage) {}

  async navigateTo() {
    await this.page.gotoApp('fleet');
    await this.page.testSubj.locator('fleet-uninstall-tokens-tab').click();
    await this.getPolicyIdSearchInput().waitFor({ state: 'visible', timeout: 20_000 });
  }

  getPolicyIdSearchInput() {
    return this.page.testSubj.locator(UNINSTALL_TOKENS.POLICY_ID_SEARCH_FIELD);
  }

  getPolicyIdTableField() {
    return this.page.testSubj.locator(UNINSTALL_TOKENS.POLICY_ID_TABLE_FIELD);
  }

  getViewUninstallCommandButtons() {
    return this.page.testSubj.locator(UNINSTALL_TOKENS.VIEW_UNINSTALL_COMMAND_BUTTON);
  }

  getUninstallCommandFlyout() {
    return this.page.testSubj.locator(UNINSTALL_TOKENS.UNINSTALL_COMMAND_FLYOUT);
  }

  getTokenField() {
    return this.page.testSubj.locator(UNINSTALL_TOKENS.TOKEN_FIELD);
  }

  getShowHideTokenButton() {
    return this.page.testSubj.locator(UNINSTALL_TOKENS.SHOW_HIDE_TOKEN_BUTTON);
  }

  async openUninstallCommandFlyout(policyId: string) {
    const row = this.page.testSubj
      .locator(UNINSTALL_TOKENS.POLICY_ID_TABLE_FIELD)
      .filter({ hasText: policyId })
      .locator('..');
    await row
      .locator(this.page.testSubj.locator(UNINSTALL_TOKENS.VIEW_UNINSTALL_COMMAND_BUTTON))
      .click();
  }
}
