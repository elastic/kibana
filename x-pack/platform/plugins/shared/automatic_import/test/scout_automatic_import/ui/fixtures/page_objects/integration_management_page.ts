/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type ScoutPage } from '@kbn/scout';

export class IntegrationManagementPage {
  constructor(private readonly page: ScoutPage) {}

  async navigateToCreate() {
    await this.page.gotoApp('automaticImport');
  }

  getConnectorSelector() {
    return this.page.testSubj.locator('connector-selector');
  }

  getConnectorSelectorLoading() {
    return this.page.testSubj.locator('connectorSelectorLoading');
  }

  getAddNewConnectorButton() {
    return this.page.testSubj.locator('addNewConnectorButton');
  }

  getConnectorSetupFlyout() {
    return this.page.testSubj.locator('connectorSetupFlyout');
  }

  getIntegrationTitleInput() {
    return this.page.testSubj.locator('integrationTitleInput');
  }

  getIntegrationDescriptionInput() {
    return this.page.testSubj.locator('integrationDescriptionInput');
  }

  getDoneButton() {
    return this.page.testSubj.locator('buttonsFooter-actionButton');
  }

  getCancelButton() {
    return this.page.testSubj.locator('buttonsFooter-cancelButton');
  }

  getAddDataStreamButton() {
    return this.page.testSubj.locator('addDataStreamButton');
  }

  async openCreateDataStreamFlyout() {
    await this.getAddDataStreamButton().click();
  }

  getCreateDataStreamFlyout() {
    return this.page.testSubj.locator('createDataStreamFlyout');
  }

  getDataStreamTitleInput() {
    return this.page.testSubj.locator('dataStreamTitleInputV2');
  }

  getDataStreamDescriptionInput() {
    return this.page.testSubj.locator('dataStreamDescriptionInputV2');
  }

  getDataCollectionMethodSelect() {
    return this.page.testSubj.locator('dataCollectionMethodSelect');
  }

  getLogsSourceUploadCard() {
    return this.page.testSubj.locator('logsSourceUploadCard');
  }

  getLogsSourceIndexCard() {
    return this.page.testSubj.locator('logsSourceIndexCard');
  }

  getIndexSelect() {
    return this.page.testSubj.locator('indexSelect');
  }

  getCancelDataStreamButton() {
    return this.page.testSubj.locator('cancelDataStreamButton');
  }

  getAnalyzeLogsButton() {
    return this.page.testSubj.locator('analyzeLogsButton');
  }
}
