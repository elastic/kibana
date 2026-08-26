/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { faker } from '@faker-js/faker';
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

  async clickNpsButton(rating: number) {
    await this.page.testSubj.click(`nps-${rating}`);
  }

  async clickRandomNpsButton(maxRating: number = 5) {
    await this.clickNpsButton(faker.number.int({ min: 1, max: maxRating }));
  }

  async completeNpsQuestionsUntilCompletion(maxAttempts: number = 10) {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await this.clickRandomNpsButton();
      try {
        await this.waitForCompletionStep(1000);
        return;
      } catch {
        // Another NPS step is still showing; keep going.
      }
    }

    await this.waitForCompletionStep();
  }

  async getSurveyLinkHref(): Promise<string> {
    const locator = this.page.testSubj.locator('productInterceptSurveyLink');
    return (await locator.getAttribute('href')) || '';
  }

  async waitForCompletionStep(timeout?: number) {
    await this.page.testSubj.waitForSelector('interceptStep-completion', {
      state: 'visible',
      timeout,
    });
  }

  async getInterceptText(triggerId: string): Promise<string> {
    const locator = this.page.testSubj.locator(`intercept-${triggerId}`);
    return (await locator.textContent()) || '';
  }

  async clickDismissButton() {
    await this.page.testSubj.click('productInterceptDismissButton');
  }
}
