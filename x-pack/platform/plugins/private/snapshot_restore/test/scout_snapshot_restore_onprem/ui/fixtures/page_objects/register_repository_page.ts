/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';

/**
 * Drives the "Register repository" wizard. Scoped to just that wizard: only it needs a server
 * without `xpack.cloud.id`, so the rest of the journeys stay in `test/scout/ui`.
 */
export class RegisterRepositoryPage {
  constructor(private readonly page: ScoutPage) {}

  async navToRepositories() {
    await this.page.testSubj.click('repositories_tab');
    await this.page.testSubj.waitForSelector('registerRepositoryButton', { state: 'visible' });
  }

  /** `fsRepositoryType` is generated from the type id, so its presence proves on-prem types were served. */
  async createSourceOnlyRepositoryStepOne(repositoryName: string) {
    await this.page.testSubj.click('registerRepositoryButton');
    await this.page.testSubj.fill('nameInput', repositoryName);
    await this.page.testSubj.click('fsRepositoryType');
    await this.page.testSubj.click('sourceOnlyToggle');
    await this.page.testSubj.click('nextButton');
    await this.page.testSubj.waitForSelector('stepTwo', { state: 'visible' });
  }

  async createSourceOnlyRepositoryStepTwo(location: string) {
    await this.page.testSubj.fill('locationInput', location);
    await this.page.testSubj.click('submitButton');
    await this.page.testSubj.waitForSelector('repositoryList', { state: 'visible' });
  }

  repositoryRow(name: string) {
    return this.page.testSubj
      .locator('repositoryTable')
      .locator('[data-test-subj="row"]')
      .filter({
        has: this.page.testSubj
          .locator('repositoryLink')
          .filter({ hasText: new RegExp(`^${name}$`) }),
      });
  }
}
