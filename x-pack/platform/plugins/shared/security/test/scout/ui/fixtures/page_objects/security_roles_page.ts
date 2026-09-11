/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';

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

  constructor(private readonly page: ScoutPage) {
    this.createRoleButton = page.testSubj.locator('createRoleButton');
    this.searchRolesInput = page.testSubj.locator('searchRoles');
    this.showReservedRolesSwitch = page.testSubj.locator('showReservedRolesSwitch');
    this.deleteRoleButton = page.testSubj.locator('deleteRoleButton');
    this.roleFormSaveButton = page.testSubj.locator('roleFormSaveButton');
    this.roleFormCancelButton = page.testSubj.locator('roleFormCancelButton');
    this.roleFormNameInput = page.testSubj.locator('roleFormNameInput');
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
    await this.page.testSubj.locator(`clone-role-action-${roleName}`).click();
    await this.roleFormNameInput.waitFor({ state: 'visible' });
  }

  async clickEditRole(roleName: string) {
    await this.searchRolesInput.fill(roleName);
    await this.page.getByRole('link', { name: roleName }).click();
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
    await this.page.components.comboBox(`indicesInput${indexNum}`).setSelectedOptions([indexName]);
    await this.page.components
      .comboBox(`privilegesInput${indexNum}`)
      .setSelectedOptions([privilege]);
  }

  async enableDocumentLevelSecurity(query: string, indexNum = 0) {
    await this.page.testSubj.locator(`restrictDocumentsQuery${indexNum}`).click();
    await this.page.getByRole('textbox').fill(query);
  }

  async enableFieldLevelSecurity(indexNum = 0) {
    await this.page.testSubj.locator(`restrictFieldsQuery${indexNum}`).click();
    const removeStarButton = this.page.locator(
      `[data-test-subj="fieldInput${indexNum}"] [title="Remove * from selection in this group"] svg`
    );
    await removeStarButton.click();
  }

  async addGrantedFields(fields: string[], indexNum = 0) {
    for (const field of fields) {
      await this.page.components.comboBox(`fieldInput${indexNum}`).setSelectedOptions([field]);
    }
  }

  async addDeniedFields(fields: string[], indexNum = 0) {
    for (const field of fields) {
      await this.page.components
        .comboBox(`deniedFieldInput${indexNum}`)
        .setSelectedOptions([field]);
    }
  }

  async addRemoteClusterPrivilege(privilege: RoleRemoteClusterPrivilege, index = 0) {
    await this.page.testSubj.locator('addRemoteClusterPrivilegesButton').click();
    await this.page.components
      .comboBox(`remoteClusterClustersInput${index}`)
      .setSelectedOptions(privilege.clusters);
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
    const spaceSelectorComboBox = this.page.testSubj.locator('spaceSelectorComboBox');
    await spaceSelectorComboBox.click();
    await this.page.locator('#spaceOption_\\*').click();
    await spaceSelectorComboBox.locator('input').press('Escape');
    await this.page.testSubj.locator(`basePrivilege_${base}`).click();
    await this.page.testSubj.locator('createSpacePrivilegeButton').click();
  }

  async createRole(roleName: string, config: RoleConfig) {
    await this.clickCreateNewRole();
    await this.roleFormNameInput.fill(roleName);

    const indices = config.elasticsearch?.indices ?? [];
    for (let i = 0; i < indices.length; i++) {
      const idx = indices[i];
      for (const name of idx.names) {
        await this.page.components.comboBox(`indicesInput${i}`).setSelectedOptions([name]);
      }
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
      for (const privilege of idx.privileges) {
        await this.page.components.comboBox(`privilegesInput${i}`).setSelectedOptions([privilege]);
      }
    }

    await this.addKibanaSpacePrivilege();

    const remoteClusters = config.elasticsearch?.remote_cluster ?? [];
    for (let i = 0; i < remoteClusters.length; i++) {
      await this.addRemoteClusterPrivilege(remoteClusters[i], i);
    }

    await this.saveRole();
  }

  async getAllRoles(): Promise<RoleRowData[]> {
    const paginationButton = this.page.testSubj.locator('tablePaginationPopoverButton');
    await paginationButton.click();
    await this.page.testSubj.locator('tablePagination-100-rows').click();
    await this.page.testSubj.locator('rolesTableLoading').waitFor({ state: 'hidden' });
    const rows = await this.page.testSubj.locator('roleRow').all();
    return Promise.all(
      rows.map(async (row) => {
        const rolename = await row.locator('[data-test-subj="roleRowName"]').innerText();
        const reserved = (await row.locator('[data-test-subj="roleReserved"]').count()) > 0;
        const deprecated = (await row.locator('[data-test-subj="roleDeprecated"]').count()) > 0;
        return { rolename, reserved, deprecated };
      })
    );
  }

  roleRow(roleName: string): Locator {
    return this.page.testSubj.locator(`roleRow`).filter({ hasText: roleName });
  }

  async deleteRole(roleName: string) {
    await this.page.testSubj.locator(`checkboxSelectRow-${roleName}`).click();
    await this.deleteRoleButton.click();
    await this.page.testSubj.locator('confirmModalConfirmButton').click();
    await this.page.testSubj.locator('confirmModalConfirmButton').waitFor({ state: 'hidden' });
  }
}
