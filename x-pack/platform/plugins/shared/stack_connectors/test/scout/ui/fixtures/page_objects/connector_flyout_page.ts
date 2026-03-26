/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage, Locator } from '@kbn/scout';

export class ConnectorFlyoutPage {
  constructor(public readonly page: ScoutPage) {}

  async gotoConnectorsList() {
    await this.page.gotoApp('management/insightsAndAlerting/triggersActionsConnectors');
  }

  get queryParamsToggle(): Locator {
    return this.page.testSubj.locator('httpQueryParamsSwitch');
  }

  get queryParamKeyInputs(): Locator {
    return this.page.testSubj.locator('httpQueryParamKeyInput');
  }

  get queryParamValueInputs(): Locator {
    return this.page.testSubj.locator('httpQueryParamValueInput');
  }

  get queryParamDeleteButtons(): Locator {
    return this.page.testSubj.locator('httpRemoveQueryParamButton');
  }

  get addQueryParamButton(): Locator {
    return this.page.testSubj.locator('httpAddQueryParamButton');
  }

  get saveFlyoutButton(): Locator {
    return this.page.testSubj.locator('create-connector-flyout-save-btn');
  }

  get editFlyoutSaveButton(): Locator {
    return this.page.testSubj.locator('edit-connector-flyout-save-btn');
  }

  async openEditConnectorFlyout(connectorName: string) {
    const row = this.page.locator(`tr:has-text("${connectorName}")`);
    await row.locator('button[data-test-subj="edit"]').click();
    await this.page.testSubj.waitForSelector('edit-connector-flyout', { state: 'visible' });
  }

  async waitForQueryParamsLoaded() {
    await this.queryParamsToggle.waitFor({ state: 'visible', timeout: 10000 });
  }
}
