/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage, Locator } from '@kbn/scout';

export class ConnectorFlyoutPage {
  constructor(public readonly page: ScoutPage) {}

  public async gotoConnectorsList() {
    await this.page.gotoApp('management/insightsAndAlerting/triggersActionsConnectors');
  }

  public get queryParamsToggle(): Locator {
    return this.page.testSubj.locator('httpQueryParamsSwitch');
  }

  public get queryParamKeyInputs(): Locator {
    return this.page.testSubj.locator('httpQueryParamKeyInput');
  }

  public get queryParamValueInputs(): Locator {
    return this.page.testSubj.locator('httpQueryParamValueInput');
  }

  public get queryParamDeleteButtons(): Locator {
    return this.page.testSubj.locator('httpRemoveQueryParamButton');
  }

  public get addQueryParamButton(): Locator {
    return this.page.testSubj.locator('httpAddQueryParamButton');
  }

  public get saveFlyoutButton(): Locator {
    return this.page.testSubj.locator('create-connector-flyout-save-btn');
  }

  public get editFlyoutSaveButton(): Locator {
    return this.page.testSubj.locator('edit-connector-flyout-save-btn');
  }

  public async openEditConnectorFlyout(connectorName: string) {
    await this.page.locator(`button:has-text("${connectorName}")`).click();
    await this.page.testSubj.waitForSelector('edit-connector-flyout', { state: 'visible' });
  }

  public async waitForQueryParamsLoaded() {
    await this.queryParamsToggle.waitFor({ state: 'visible', timeout: 10000 });
  }
}
