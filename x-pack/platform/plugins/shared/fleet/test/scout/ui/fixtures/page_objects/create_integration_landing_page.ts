/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type ScoutPage } from '@kbn/scout';

export class CreateIntegrationLandingPage {
  constructor(private readonly page: ScoutPage) {}

  async navigateTo() {
    await this.page.gotoApp('integrations/create');
  }

  async navigateToAssistant() {
    await this.page.gotoApp('integrations/create/assistant');
  }

  async navigateToUpload() {
    await this.page.gotoApp('integrations/create/upload');
  }

  async waitForPageToLoad() {
    await this.page.waitForLoadingIndicatorHidden();
  }

  getLicensePaywallCard() {
    return this.page.testSubj.locator('LicensePaywallCard');
  }

  getMissingPrivilegesCallOut() {
    return this.page.testSubj.locator('missingPrivilegesCallOut');
  }

  getAssistantButton() {
    return this.page.testSubj.locator('assistantButton');
  }

  getUploadPackageLink() {
    return this.page.testSubj.locator('uploadPackageLink');
  }

  getConnectorBedrock() {
    return this.page.testSubj.locator('actionType-.bedrock');
  }

  getConnectorOpenAI() {
    return this.page.testSubj.locator('actionType-.gen-ai');
  }

  getConnectorGemini() {
    return this.page.testSubj.locator('actionType-.gemini');
  }
}
