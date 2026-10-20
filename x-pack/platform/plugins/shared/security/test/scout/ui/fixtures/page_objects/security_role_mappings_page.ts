/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';
import { KibanaCodeEditorWrapper } from '@kbn/scout';

export interface RoleMappingRowData {
  name: string;
  enabled: boolean;
}

export class SecurityRoleMappingsPage {
  public readonly createRoleMappingButton: Locator;
  public readonly saveRoleMappingButton: Locator;
  public readonly emptyPrompt: Locator;
  public readonly codeEditor: KibanaCodeEditorWrapper;

  constructor(private readonly page: ScoutPage) {
    this.createRoleMappingButton = page.testSubj.locator('createRoleMappingButton');
    this.saveRoleMappingButton = page.testSubj.locator('saveRoleMappingButton');
    this.emptyPrompt = page.testSubj.locator('roleMappingsEmptyPrompt');
    this.codeEditor = new KibanaCodeEditorWrapper(page);
  }

  async goto() {
    await this.page.gotoApp('management/security/role_mappings');
    await this.createRoleMappingButton.waitFor({ state: 'visible' });
  }

  async fillRoleMappingName(name: string) {
    await this.page.testSubj.locator('roleMappingFormNameInput').fill(name);
  }

  async selectRole(role: string) {
    await this.page.components.comboBox('rolesDropdown').setSelectedOptions([role]);
  }

  async addRule() {
    await this.page.testSubj.locator('roleMappingsAddRuleButton').click();
  }

  async switchToJsonRuleEditor() {
    await this.page.testSubj.locator('roleMappingsJSONRuleEditorButton').click();
  }

  async switchToVisualRuleEditor() {
    await this.page.testSubj.locator('roleMappingsVisualRuleEditorButton').click();
  }

  async setJsonRuleEditorValue(value: object | string) {
    const json = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
    await this.codeEditor.waitCodeEditorReady('roleMappingsJSONEditor');
    await this.codeEditor.setCodeEditorValueByTestSubj('roleMappingsJSONEditor', json);
  }

  async saveRoleMapping() {
    await this.saveRoleMappingButton.click();
    await this.page.testSubj.locator('savedRoleMappingSuccessToast').waitFor({ state: 'visible' });
  }

  async deleteRoleMapping(name: string) {
    const row = await this.findRoleMappingRow(name);
    await row.locator('[data-test-subj="euiCollapsedItemActionsButton"]').click();
    await this.page.testSubj.locator(`deleteRoleMappingButton-${name}`).click();
    await this.page.testSubj.locator('confirmModalConfirmButton').click();
    await this.page.testSubj
      .locator('deletedRoleMappingSuccessToast')
      .waitFor({ state: 'visible' });
    await row.waitFor({ state: 'detached' });
  }

  async cloneRoleMapping(name: string) {
    const row = await this.findRoleMappingRow(name);
    await row.locator(`[data-test-subj="cloneRoleMappingButton-${name}"]`).click();
  }

  async editRoleMapping(name: string) {
    const row = await this.findRoleMappingRow(name);
    await row.locator('[data-test-subj="roleMappingName"]').click();
  }

  async findRoleMappingRow(name: string): Promise<Locator> {
    const search = this.page.getByPlaceholder('Search...');
    await search.fill(`name=${JSON.stringify(name)}`);
    await search.press('Enter');
    const row = this.getRoleMappingRow(name);
    await row.waitFor({ state: 'visible' });
    return row;
  }

  getRoleMappingRow(name: string): Locator {
    return this.page
      .locator('[data-test-subj="roleMappingRow"]')
      .filter({ has: this.page.locator(`[data-test-subj="roleMappingName"]:text-is("${name}")`) });
  }

  async getRoleMappingRowData(row: Locator): Promise<RoleMappingRowData> {
    const name = await row.locator('[data-test-subj="roleMappingName"]').innerText();
    const enabledText = await row.locator('[data-test-subj="roleMappingEnabled"]').innerText();
    return { name, enabled: enabledText === 'Enabled' };
  }

  async getRoleMapping(name: string): Promise<RoleMappingRowData> {
    return this.getRoleMappingRowData(await this.findRoleMappingRow(name));
  }
}
