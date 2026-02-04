/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type ScoutPage } from '@kbn/scout';

export class CopyIntegrationPage {
  constructor(private readonly page: ScoutPage) {}

  async navigateTo(agentPolicyId: string, packagePolicyId: string) {
    await this.page.gotoApp(`fleet/policies/${agentPolicyId}/copy-integration/${packagePolicyId}`);
  }

  async waitForPageToLoad() {
    await this.page.testSubj.waitForSelector('fleetSetupLoading', {
      state: 'hidden',
      timeout: 30_000,
    });
    await this.page.testSubj.waitForSelector('createPackagePolicy_page', {
      state: 'visible',
      timeout: 20_000,
    });
  }

  getPackagePolicyNameInput() {
    return this.page.testSubj.locator('packagePolicyNameInput');
  }

  getSaveButton() {
    return this.page.testSubj.locator('createPackagePolicySaveButton');
  }

  getAgentPolicySelect() {
    return this.page.testSubj.locator('agentPolicyMultiSelect');
  }

  getAgentPolicySelectIsLoading() {
    return this.getAgentPolicySelect().getByRole('progressbar');
  }

  async fillPackagePolicyName(name: string) {
    const input = this.getPackagePolicyNameInput();
    await input.clear();
    await input.fill(name);
  }

  /**
   * Get the multi-text input for a variable by its field name.
   * The selector is based on the field label lowercased with spaces replaced by dashes.
   */
  getMultiTextInput(fieldName: string) {
    return this.page.testSubj.locator(`multiTextInput-${fieldName}`);
  }

  /**
   * Get the first row of a multi-text input (the actual input element)
   */
  getMultiTextInputRow(dataset: string, fieldName: string, index: number = 0) {
    return this.page.testSubj
      .locator(`streamOptions.inputStreams.${dataset}`)
      .getByTestId(`multiTextInput-${fieldName}`)
      .getByTestId(`multiTextInputRow-${index}`);
  }

  getSuccessPostInstallAddAgentModal() {
    return this.page.testSubj.locator('postInstallAddAgentModal');
  }

  async clickSaveButton() {
    await this.getSaveButton().click();
  }
}
