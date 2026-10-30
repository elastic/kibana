/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type ScoutPage } from '@kbn/scout';

export class AgentListPage {
  constructor(private readonly page: ScoutPage) {}

  getAgentRow(hostname: string) {
    return this.page.testSubj.locator('fleetAgentListTable').locator('tr', { hasText: hostname });
  }

  async openRowActions(hostname: string) {
    await this.getAgentRow(hostname).locator('[data-test-subj="agentActionsBtn"]').click();
  }

  async openSecurityAndRemovalMenu() {
    await this.page.getByRole('button', { name: 'Security and removal' }).click();
  }

  getUninstallActionItem() {
    return this.page.testSubj.locator('agentUninstallActionBtn');
  }

  getUninstallModal() {
    return this.page.testSubj.locator('agentUninstallModal');
  }

  getUninstallDelayInput() {
    return this.page.testSubj.locator('agentUninstallDelayInput');
  }

  getModalConfirmButton() {
    return this.page.testSubj.locator('confirmModalConfirmButton');
  }

  async openAgentActivity() {
    await this.page.testSubj.locator('agentActivityButton').click();
  }

  getUninstallPendingTitle() {
    return this.page.testSubj.locator('uninstallPendingTitle');
  }

  getAbortUninstallButton() {
    return this.page.testSubj.locator('abortUninstallBtn');
  }
}
