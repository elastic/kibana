/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';

export class ConnectionDetailsPageObject {
  constructor(private readonly page: ScoutPage) {}

  async openFromHelpMenu() {
    await this.page.testSubj.click('helpMenuButton');
    await this.page.testSubj.waitForSelector('connectionDetailsHelpLink', { state: 'visible' });
    await this.page.testSubj.click('connectionDetailsHelpLink');
    await this.page.testSubj.waitForSelector('connectionDetailsModalTitle', { state: 'visible' });
  }

  async getEsUrlText(): Promise<string> {
    const esUrlRow = this.page.testSubj.locator('connectionDetailsEsUrl');
    const copyText = esUrlRow.locator('[data-test-subj="copyText"]');
    return (await copyText.innerText()).trim();
  }

  async toggleCloudId() {
    await this.page.testSubj.click('connectionDetailsCloudIdSwitch');
    await this.page.testSubj.waitForSelector('connectionDetailsCloudId', { state: 'visible' });
  }

  async getCloudIdText(): Promise<string> {
    const cloudIdRow = this.page.testSubj.locator('connectionDetailsCloudId');
    const copyText = cloudIdRow.locator('[data-test-subj="copyText"]');
    return (await copyText.innerText()).trim();
  }

  async switchToApiKeyTab() {
    await this.page.testSubj.click('connectionDetailsTabBtn-apiKeys');
    await this.page.testSubj.waitForSelector('connectionDetailsApiKeyConfigForm', {
      state: 'visible',
    });
  }

  async submitApiKeyForm(name: string) {
    const form = this.page.testSubj.locator('connectionDetailsApiKeyConfigForm');
    const nameInput = form.locator('[name="api-key-name"]');
    await nameInput.fill(name);
    const submitButton = form.locator('button[type="submit"]');
    await submitButton.click();
    await this.page.testSubj.waitForSelector('connectionDetailsApiKeySuccessForm', {
      state: 'visible',
    });
  }

  async getCreatedApiKeyText(): Promise<string> {
    const successForm = this.page.testSubj.locator('connectionDetailsApiKeySuccessForm');
    const apiKeyRow = successForm.locator('[data-test-subj="connectionDetailsApiKeyValueRow"]');
    const copyText = apiKeyRow.locator('[data-test-subj="copyText"]');
    return (await copyText.innerText()).trim();
  }
}
