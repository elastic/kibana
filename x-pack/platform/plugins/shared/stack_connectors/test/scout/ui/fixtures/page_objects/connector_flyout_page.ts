/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage, Locator } from '@kbn/scout';
import { CONNECTORS_APP_PATH, CONNECTORS_LIST_SELECTORS } from '../constants';

export class ConnectorFlyoutPage {
  constructor(public readonly page: ScoutPage) {}

  public async gotoConnectorsList() {
    await this.page.gotoApp(CONNECTORS_APP_PATH);
    await this.page.locator(CONNECTORS_LIST_SELECTORS.TABLE_LOADED).waitFor();
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

  public async openEditConnectorFlyout({ id, name }: { id: string; name: string }) {
    // Filter the list to the target connector first; the connectors table
    // paginates at 10 rows by default, so on shared envs (e.g. cloud) the row
    // we want may be on a later page and would never appear by id alone.
    const searchBox = this.page.locator(CONNECTORS_LIST_SELECTORS.SEARCH_INPUT);
    await searchBox.fill(name);
    await searchBox.press('Enter');

    await this.page.testSubj.click(`edit${id}`);
    await this.page.testSubj.waitForSelector('edit-connector-flyout', { state: 'visible' });
  }

  public async waitForQueryParamsLoaded() {
    await this.queryParamsToggle.waitFor({ state: 'visible', timeout: 10000 });
  }
}
