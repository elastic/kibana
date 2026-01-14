/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APP_MAIN_SCROLL_CONTAINER_ID } from '@kbn/core-chrome-layout-constants';
import { type ScoutPage } from '@kbn/scout';

export class IntegrationHomePage {
  constructor(private readonly page: ScoutPage) {}

  async navigateTo() {
    await this.page.gotoApp('integrations');
  }

  async waitForPageToLoad() {
    await this.page.waitForLoadingIndicatorHidden();
    await this.page.testSubj.waitForSelector('epmList.integrationCards', { state: 'visible' });
  }

  getIntegrationCard(integration: string) {
    return this.page.testSubj.locator(`integration-card:epr:${integration}`);
  }

  async clickIntegrationCard(integration: string) {
    await this.getIntegrationCard(integration).click();
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
            scrollContainer?.scrollIntoView({
              behavior: 'instant',
            });
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

  getAddIntegrationPolicyButton() {
    return this.page.testSubj.locator('addIntegrationPolicyButton');
  }
}
