/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';
import type { ScoutPage } from '@kbn/scout';

export class AnonymizationSettingsPage {
  constructor(private readonly page: ScoutPage) {}

  async navigateTo() {
    await this.page.gotoApp('management/ai/aiAnonymizationSettings');
    await this.page.testSubj.waitForSelector('aiAnonymizationSettingsPage', { state: 'visible' });
  }

  getPageTitle() {
    return this.page.testSubj.locator(APP_HEADER_TEST_SUBJECTS.title);
  }
}
