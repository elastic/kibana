/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';

export class DashboardChatPage {
  readonly metricsPrompt: Locator;
  readonly addPanelChatAction: Locator;
  readonly conversationInputForm: Locator;
  readonly conversationInputEditor: Locator;
  readonly roundResponses: Locator;

  constructor(page: ScoutPage) {
    this.metricsPrompt = page.testSubj.locator('dashboardCreateWithChatMetricsPrompt');
    this.addPanelChatAction = page.testSubj.locator('create-action-Create with chat');
    this.conversationInputForm = page.testSubj.locator('agentBuilderConversationInputForm');
    this.conversationInputEditor = page.testSubj.locator('agentBuilderConversationInputEditor');
    this.roundResponses = page.testSubj.locator('agentBuilderRoundResponse');
  }

  async openFromMetricsPrompt() {
    await this.metricsPrompt.click();
  }

  async openFromAddPanelFlyout() {
    await this.addPanelChatAction.click();
  }
}
