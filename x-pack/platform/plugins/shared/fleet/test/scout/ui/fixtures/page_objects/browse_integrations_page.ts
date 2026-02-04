/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { APP_MAIN_SCROLL_CONTAINER_ID } from '@kbn/core-chrome-layout-constants';

export class BrowseIntegrationPage {
  constructor(private readonly page: ScoutPage) {}

  async navigateTo() {
    await this.page.gotoApp('integrations');
  }

  async searchForIntegration(integrationName: string) {
    const searchInput = this.page.getByTestId('browseIntegrations.searchBar.input');
    await searchInput.fill(integrationName);
  }

  async sortIntegrations(sort: 'z-a' | 'a-z') {
    await this.page.getByTestId('browseIntegrations.searchBar.sortBtn').click();
    if (sort === 'z-a') {
      await this.page.getByTestId('browseIntegrations.searchBar.sortByZAOption').click();
    } else {
      await this.page.getByTestId('browseIntegrations.searchBar.sortByAZOption').click();
    }
  }

  async scrollToIntegration(integrationName: string) {
    await this.page.evaluate(
      async ({ vars }) => {
        const scrollContainer = window.document.getElementById(vars.mainScrollContainerId);
        const integrationSelector = `[data-test-subj="integration-card:epr:${vars.integrationName}"]`;
        let found = false;
        let i = 0;
        while (!found && i < 100) {
          if (scrollContainer) {
            scrollContainer.scrollTop = i++ * 250;
          } else {
            window.scroll(0, i++ * 250);
          }
          await new Promise((resolve) => setTimeout(resolve, 100));
          if (
            (scrollContainer && scrollContainer.querySelector(integrationSelector)) ||
            (!scrollContainer && window.document.querySelector(integrationSelector))
          ) {
            found = true;
          }
        }
      },
      {
        vars: {
          integrationName,
          mainScrollContainerId: APP_MAIN_SCROLL_CONTAINER_ID,
        },
      }
    );
  }

  getMainColumn() {
    return this.page.getByTestId('epmList.mainColumn');
  }

  async expectIntegrationCardToBeVisible(integrationName: string) {
    return expect(this.page.getByTestId(`integration-card:epr:${integrationName}`)).toBeVisible();
  }
}
