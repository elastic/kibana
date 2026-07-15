/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';

export class DashboardChatPage {
  constructor(private readonly page: ScoutPage) {}

  async openFromMetricsPrompt() {
    await this.page.testSubj.click('dashboardCreateWithChatMetricsPrompt');
  }

  async openFromAddPanelFlyout() {
    await this.page.testSubj.click('create-action-Create with Chat');
  }
}
