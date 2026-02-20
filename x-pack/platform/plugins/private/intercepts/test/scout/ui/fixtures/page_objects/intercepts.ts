/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';

export class InterceptsPageObject {
  constructor(private readonly page: ScoutPage) {}

  async setInterceptTimer(triggerId: string, intervalMs: number) {
    const timerStart = new Date(Date.now() - intervalMs - 1000);
    await this.page.evaluate(
      ({ key, value }) => {
        localStorage.setItem(key, value);
      },
      {
        key: 'intercepts.prompter.clientCache',
        value: JSON.stringify({
          [triggerId]: {
            timerStart,
          },
        }),
      }
    );
  }

  async waitForInterceptDisplayed(triggerId: string) {
    await this.page.testSubj.waitForSelector(`intercept-${triggerId}`, {
      state: 'visible',
    });
  }

  getInterceptLocator(triggerId: string) {
    return this.page.testSubj.locator(`intercept-${triggerId}`);
  }

  async clickProgressionButton() {
    await this.page.testSubj.click('productInterceptProgressionButton');
  }

  async clickRandomNpsButton() {
    const rating = Math.floor(Math.random() * 4) + 1;
    await this.page.testSubj.click(`nps-${rating}`);
  }

  async isProgressionButtonVisible(): Promise<boolean> {
    try {
      const locator = this.page.testSubj.locator('productInterceptProgressionButton');
      await locator.waitFor({ state: 'visible' });
      return true;
    } catch {
      return false;
    }
  }

  async getProgressionButtonText(): Promise<string> {
    const locator = this.page.testSubj.locator('productInterceptProgressionButton');
    return (await locator.textContent()) || '';
  }

  async getInterceptText(triggerId: string): Promise<string> {
    const locator = this.page.testSubj.locator(`intercept-${triggerId}`);
    return (await locator.textContent()) || '';
  }

  async clickDismissButton() {
    await this.page.testSubj.click('productInterceptDismissButton');
  }
}
