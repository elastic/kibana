/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';
import { ENROLLMENT_TOKENS, CONFIRM_MODAL } from '../../common/selectors';

export class EnrollmentTokensPage {
  constructor(private readonly page: ScoutPage) {}

  async navigateTo() {
    await this.page.goto('/app/fleet/enrollment-tokens');
    await this.getListTable().waitFor({ state: 'visible', timeout: 20_000 });
  }

  getCreateTokenButton() {
    return this.page.testSubj.locator(ENROLLMENT_TOKENS.CREATE_TOKEN_BUTTON);
  }

  getNameField() {
    return this.page.testSubj.locator(ENROLLMENT_TOKENS.CREATE_TOKEN_MODAL_NAME_FIELD);
  }

  getPolicySelectField() {
    return this.page.testSubj.locator(ENROLLMENT_TOKENS.CREATE_TOKEN_MODAL_SELECT_FIELD);
  }

  getConfirmButton() {
    return this.page.testSubj.locator(CONFIRM_MODAL.CONFIRM_BUTTON);
  }

  getListTable() {
    return this.page.testSubj.locator(ENROLLMENT_TOKENS.LIST_TABLE);
  }

  getRevokeButtons() {
    return this.page.testSubj.locator(ENROLLMENT_TOKENS.TABLE_REVOKE_BTN);
  }

  async createToken(name: string, policyName?: string) {
    await this.getCreateTokenButton().click();
    await this.getNameField().waitFor({ state: 'visible', timeout: 15_000 });
    await this.getNameField().clear();
    await this.getNameField().fill(name);
    if (policyName) {
      await this.getPolicySelectField().getByRole('textbox').fill(`${policyName}`);
      await this.page.getByRole('option', { name: policyName }).click();
    } else {
      await this.getPolicySelectField().getByRole('textbox').press('ArrowDown');
      await this.getPolicySelectField().getByRole('textbox').press('Enter');
    }
    await this.getConfirmButton().click();
  }

  async revokeToken(policyName: string) {
    const row = this.getListTable().getByRole('row', { name: policyName });
    await row.locator(this.page.testSubj.locator(ENROLLMENT_TOKENS.TABLE_REVOKE_BTN)).click();
  }
}
