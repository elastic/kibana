/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';

export class ApplicationConnectionsApp {
  constructor(private readonly page: ScoutPage) {}

  async navigate() {
    await this.page.gotoApp('management/security/application_connections');
    await this.page.testSubj
      .locator('applicationConnectionsTable')
      .waitFor({ state: 'visible', timeout: 60_000 });
  }

  async switchToGroupedView() {
    await this.page.testSubj.click('applicationConnectionsViewModeGrouped');
    await this.page.testSubj
      .locator('applicationConnectionsInMemoryTable')
      .waitFor({ state: 'visible', timeout: 60_000 });
  }

  async switchToListView() {
    await this.page.testSubj.click('applicationConnectionsViewModeList');
    await this.page.testSubj
      .locator('applicationConnectionsListView')
      .waitFor({ state: 'visible', timeout: 60_000 });
  }

  async waitForGroupedClientRow(clientId: string) {
    await this.page.testSubj
      .locator(`applicationConnectionsListRow-${clientId}`)
      .waitFor({ state: 'visible', timeout: 60_000 });
  }

  async expandClientRow(clientId: string) {
    await this.page.testSubj.click(`expandRow-${clientId}`);
    await this.page.testSubj
      .locator(`applicationConnectionsChildTable-${clientId}`)
      .waitFor({ state: 'visible', timeout: 60_000 });
  }

  async waitForListConnectionRow(connectionId: string) {
    await this.page.testSubj
      .locator(`applicationConnectionsListViewRow-${connectionId}`)
      .waitFor({ state: 'visible', timeout: 60_000 });
  }

  async editConnectionName(connectionId: string, newName: string) {
    await this.page.testSubj.click(`inlineEditConnectionName-${connectionId}`);
    const input = this.page.testSubj.locator(`inlineEditConnectionNameInput-${connectionId}`);
    await input.waitFor({ state: 'visible' });
    await input.fill(newName);
    await this.page.testSubj.click(`inlineEditConnectionNameSave-${connectionId}`);
    await input.waitFor({ state: 'detached', timeout: 60_000 });
  }

  async getListConnectionRowText(connectionId: string): Promise<string> {
    return this.page.testSubj
      .locator(`applicationConnectionsListViewRow-${connectionId}`)
      .innerText();
  }

  async revokeConnection(connectionId: string) {
    await this.page.testSubj.click(`revokeConnection-${connectionId}`);
    await this.page.testSubj
      .locator('applicationConnectionsRevokeModal')
      .waitFor({ state: 'visible', timeout: 60_000 });
    await this.page.testSubj.click('applicationConnectionsRevokeConfirmButton');
    await this.page.testSubj
      .locator('applicationConnectionsRevokeModal')
      .waitFor({ state: 'detached', timeout: 60_000 });
  }

  async selectListConnectionRow(connectionId: string) {
    await this.page.testSubj.click(`checkboxSelectRow-${connectionId}`);
  }

  async bulkRevokeSelected() {
    await this.page.testSubj.click('applicationConnectionsBulkRevokeButton');
    await this.page.testSubj
      .locator('applicationConnectionsRevokeModal')
      .waitFor({ state: 'visible', timeout: 60_000 });
    await this.page.testSubj.click('applicationConnectionsRevokeConfirmButton');
    await this.page.testSubj
      .locator('applicationConnectionsRevokeModal')
      .waitFor({ state: 'detached', timeout: 60_000 });
  }
}
