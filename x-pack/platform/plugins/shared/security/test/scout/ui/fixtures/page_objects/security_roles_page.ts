/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';
import { KibanaCodeEditorWrapper } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

export interface RoleIndexPrivilege {
  names: string[];
  privileges: string[];
  query?: string;
  field_security?: {
    grant?: string[];
    except?: string[];
  };
}

export interface RoleRemoteClusterPrivilege {
  clusters: string[];
  privileges: string[];
}

export interface RoleConfig {
  elasticsearch?: {
    indices?: RoleIndexPrivilege[];
    remote_cluster?: RoleRemoteClusterPrivilege[];
  };
}

export interface RoleRowData {
  rolename: string;
  reserved: boolean;
  deprecated: boolean;
}

export class SecurityRolesPage {
  public readonly createRoleButton: Locator;
  public readonly searchRolesInput: Locator;
  public readonly showReservedRolesSwitch: Locator;
  public readonly deleteRoleButton: Locator;
  public readonly roleFormSaveButton: Locator;
  public readonly roleFormCancelButton: Locator;
  public readonly roleFormNameInput: Locator;

  private readonly codeEditor: KibanaCodeEditorWrapper;

  constructor(private readonly page: ScoutPage) {
    this.createRoleButton = page.testSubj.locator('createRoleButton');
    this.searchRolesInput = page.testSubj.locator('searchRoles');
    this.showReservedRolesSwitch = page.testSubj.locator('showReservedRolesSwitch');
    this.deleteRoleButton = page.testSubj.locator('deleteRoleButton');
    this.roleFormSaveButton = page.testSubj.locator('roleFormSaveButton');
    this.roleFormCancelButton = page.testSubj.locator('roleFormCancelButton');
    this.roleFormNameInput = page.testSubj.locator('roleFormNameInput');
    this.codeEditor = new KibanaCodeEditorWrapper(page);
  }

  async goto() {
    await this.page.gotoApp('management/security/roles');
    await this.createRoleButton.waitFor({ state: 'visible' });
  }

  async clickCreateNewRole() {
    await this.createRoleButton.click();
    await this.roleFormNameInput.waitFor({ state: 'visible' });
  }

  async clickCloneRole(roleName: string) {
    const row = await this.findRoleRow(roleName);
    await row.locator(`[data-test-subj="clone-role-action-${roleName}"]`).click();
    await this.roleFormNameInput.waitFor({ state: 'visible' });
  }

  async clickEditRole(roleName: string) {
    const row = await this.findRoleRow(roleName);
    await row.getByRole('link', { name: roleName, exact: true }).click();
    await this.roleFormNameInput.waitFor({ state: 'visible' });
  }

  async saveRole() {
    await this.roleFormSaveButton.click();
    await this.createRoleButton.waitFor({ state: 'visible' });
  }

  async cancelRole() {
    await this.roleFormCancelButton.click();
    await this.createRoleButton.waitFor({ state: 'visible' });
  }

  async addIndexPrivilege(indexName: string, privilege: string, indexNum = 0) {
    await this.page.components
      .comboBox(`indicesInput${indexNum}`)
      .setCustomSelectedOptions([indexName]);
    await this.page.components
      .comboBox(`privilegesInput${indexNum}`)
      .setSelectedOptions([privilege]);
  }

  async enableDocumentLevelSecurity(query: string, indexNum = 0) {
    await this.page.testSubj.locator(`restrictDocumentsQuery${indexNum}`).click();
    await this.codeEditor.waitCodeEditorReady(`queryInput${indexNum}`);
    await this.codeEditor.setCodeEditorValueByTestSubj(`queryInput${indexNum}`, query);
  }

  async enableFieldLevelSecurity(indexNum = 0) {
    await this.page.testSubj.locator(`restrictFieldsQuery${indexNum}`).click();
    const grantedFields = this.page.components.comboBox(`fieldInput${indexNum}`);
    await expect.poll(() => grantedFields.getSelectedOptions()).not.toHaveLength(0);
    await grantedFields.clear();
    await expect.poll(() => grantedFields.getSelectedOptions()).toHaveLength(0);
  }

  async addGrantedFields(fields: string[], indexNum = 0) {
    await this.page.components.comboBox(`fieldInput${indexNum}`).setCustomSelectedOptions(fields);
  }

  async addDeniedFields(fields: string[], indexNum = 0) {
    await this.page.components
      .comboBox(`deniedFieldInput${indexNum}`)
      .setCustomSelectedOptions(fields);
  }

  async addRemoteClusterPrivilege(privilege: RoleRemoteClusterPrivilege, index = 0) {
    await this.page.testSubj.locator('addRemoteClusterPrivilegesButton').click();
    await this.page.components
      .comboBox(`remoteClusterClustersInput${index}`)
      .setCustomSelectedOptions(privilege.clusters);
    await this.page.components
      .comboBox(`remoteClusterPrivilegesInput${index}`)
      .setSelectedOptions(privilege.privileges);
  }

  async deleteRemoteClusterPrivilege(index: number) {
    await this.page.testSubj.locator(`deleteRemoteClusterPrivilegesButton${index}`).click();
  }

  async getRemoteClusterPrivilege(index: number) {
    const clusters = await this.page.components
      .comboBox(`remoteClusterClustersInput${index}`)
      .getSelectedOptions();
    const privileges = await this.page.components
      .comboBox(`remoteClusterPrivilegesInput${index}`)
      .getSelectedOptions();
    return { clusters, privileges };
  }

  async addKibanaSpacePrivilege(base: string = 'all') {
    await this.page.testSubj.locator('addSpacePrivilegeButton').click();

    const spaceSelectorSearchInput = this.page.testSubj
      .locator('spaceSelectorComboBox')
      .getByTestId('comboBoxSearchInput');
    await spaceSelectorSearchInput.click();
    await this.page
      .locator('[data-test-subj~="spaceSelectorComboBox-optionsList"]')
      .locator('#spaceOption_\\*')
      .click();
    await spaceSelectorSearchInput.blur();

    await this.page.testSubj.locator(`basePrivilege_${base}`).click();
    await this.page.testSubj.locator('createSpacePrivilegeButton').click();
  }

  async createRole(roleName: string, config: RoleConfig) {
    await this.clickCreateNewRole();
    await this.roleFormNameInput.fill(roleName);

    const indices = config.elasticsearch?.indices ?? [];
    for (let i = 0; i < indices.length; i++) {
      const idx = indices[i];
      await this.page.components.comboBox(`indicesInput${i}`).setCustomSelectedOptions(idx.names);
      if (idx.query) {
        await this.enableDocumentLevelSecurity(idx.query, i);
      }
      if (idx.field_security) {
        await this.enableFieldLevelSecurity(i);
        if (idx.field_security.grant) {
          await this.addGrantedFields(idx.field_security.grant, i);
        }
        if (idx.field_security.except) {
          await this.addDeniedFields(idx.field_security.except, i);
        }
      }
      await this.page.components.comboBox(`privilegesInput${i}`).setSelectedOptions(idx.privileges);
    }

    await this.addKibanaSpacePrivilege();

    const remoteClusters = config.elasticsearch?.remote_cluster ?? [];
    for (let i = 0; i < remoteClusters.length; i++) {
      await this.addRemoteClusterPrivilege(remoteClusters[i], i);
    }

    await this.saveRole();
  }

  private async updateResults(action: () => Promise<void>) {
    const responsePromise = this.page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname.endsWith('/api/security/role/_query') &&
        response.request().method() === 'POST'
    );
    await action();
    const response = await responsePromise;
    expect(response.ok()).toBe(true);
    const { roles }: { roles: Array<{ name: string }> } = await response.json();
    await expect(this.page.testSubj.locator('rolesTable')).toBeVisible();
    await expect(this.page.testSubj.locator('roleRowName')).toHaveText(
      roles.map(({ name }) => name)
    );
  }

  async findRoleRow(roleName: string): Promise<Locator> {
    await this.goto();
    await this.searchRolesInput.fill(roleName);
    await this.updateResults(() => this.searchRolesInput.press('Enter'));
    const row = this.page.testSubj.locator('roleRow').filter({
      has: this.page.getByRole('link', { name: roleName, exact: true }),
    });
    const nextPage = this.page.testSubj.locator('pagination-button-next');
    while (
      !(await row.isVisible()) &&
      (await nextPage.isVisible()) &&
      (await nextPage.isEnabled())
    ) {
      await this.updateResults(() => nextPage.click());
    }
    await expect(this.page.testSubj.locator('rolesTableTooManyResultsLabel')).toBeHidden();
    return row;
  }

  async getRole(roleName: string): Promise<RoleRowData> {
    const row = await this.findRoleRow(roleName);
    await expect(row).toBeVisible();
    return {
      rolename: await row.locator('[data-test-subj="roleRowName"]').innerText(),
      reserved: (await row.locator('[data-test-subj="roleReserved"]').count()) > 0,
      deprecated: (await row.locator('[data-test-subj="roleDeprecated"]').count()) > 0,
    };
  }

  async expectRoleAbsent(roleName: string) {
    await expect(await this.findRoleRow(roleName)).toHaveCount(0);
  }

  async deleteRole(roleName: string) {
    const row = await this.findRoleRow(roleName);
    await row.locator(`[data-test-subj="checkboxSelectRow-${roleName}"]`).click();
    await this.deleteRoleButton.click();
    await this.page.testSubj.locator('confirmModalConfirmButton').click();
    await this.page.testSubj.locator('confirmModalConfirmButton').waitFor({ state: 'hidden' });
  }
}
