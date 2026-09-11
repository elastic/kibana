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
  }

  async fillRoleMappingName(name: string) {
    await this.page.testSubj.locator('roleMappingFormNameInput').fill(name);
  }

  async selectRole(role: string) {
    await this.page.components.comboBox('roleMappingFormRolesCombo').setSelectedOptions([role]);
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
    await this.page.testSubj
      .locator('savedRoleMappingSuccessToast')
      .waitFor({ state: 'visible' });
  }

  async deleteRoleMapping(name: string) {
    await this.page.testSubj.locator('euiCollapsedItemActionsButton').click();
    await this.page.testSubj.locator(`deleteRoleMappingButton-${name}`).click();
    await this.page.testSubj.locator('confirmModalConfirmButton').click();
    await this.page.testSubj
      .locator('deletedRoleMappingSuccessToast')
      .waitFor({ state: 'visible' });
  }

  async cloneRoleMapping(name: string) {
    await this.page.testSubj.locator(`cloneRoleMappingButton-${name}`).click();
  }

  async getRoleMappingRows(): Promise<Locator[]> {
    return this.page.testSubj.locator('roleMappingRow').all();
  }

  async getRoleMappingRowData(row: Locator): Promise<RoleMappingRowData> {
    const name = await row.locator('[data-test-subj="roleMappingName"]').innerText();
    const enabledText = await row.locator('[data-test-subj="roleMappingEnabled"]').innerText();
    return { name, enabled: enabledText === 'Enabled' };
  }

  async getAllRoleMappings(): Promise<RoleMappingRowData[]> {
    const rows = await this.getRoleMappingRows();
    return Promise.all(rows.map((row) => this.getRoleMappingRowData(row)));
  }
}
