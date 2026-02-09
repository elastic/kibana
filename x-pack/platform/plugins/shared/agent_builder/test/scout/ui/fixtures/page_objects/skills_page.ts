/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

export class SkillsPage {
  constructor(private readonly page: ScoutPage) {}

  async navigateTo() {
    await this.page.gotoApp('agent_builder/skills');
  }

  async waitForPageToLoad() {
    await this.page.testSubj.waitForSelector('agentBuilderSkillsPage', {
      state: 'visible',
      timeout: 30_000,
    });
  }

  getSkillsPageContainer() {
    return this.page.testSubj.locator('agentBuilderSkillsPage');
  }

  getSkillsTable() {
    return this.page.testSubj.locator('agentBuilderSkillsTable');
  }

  getSearchInput() {
    return this.page.testSubj.locator('agentBuilderSkillsTableSearchInput');
  }

  getNewSkillButton() {
    return this.page.testSubj.locator('agentBuilderNewSkillButton');
  }

  getSkillRow(skillId: string) {
    return this.page.testSubj.locator(`agentBuilderSkillsTableRow-${skillId}`);
  }

  getSkillLink(skillId: string) {
    return this.page.testSubj.locator(`agentBuilderSkillLink-${skillId}`);
  }

  getSkillContextMenuButton(skillId: string) {
    return this.page.testSubj.locator(`agentBuilderSkillContextMenuButton-${skillId}`);
  }

  getSkillDeleteButton(skillId: string) {
    return this.page.testSubj.locator(`agentBuilderSkillDeleteButton-${skillId}`);
  }

  getSkillEditButton(skillId: string) {
    return this.page.testSubj.locator(`agentBuilderSkillEditButton-${skillId}`);
  }

  getSkillViewButton(skillId: string) {
    return this.page.testSubj.locator(`agentBuilderSkillViewButton-${skillId}`);
  }

  async clickNewSkillButton() {
    await this.getNewSkillButton().click();
  }

  async searchForSkill(query: string) {
    const input = this.getSearchInput();
    await input.fill(query);
  }

  async clearSearch() {
    const input = this.getSearchInput();
    await input.clear();
  }

  async openContextMenu(skillId: string) {
    const menuButton = this.getSkillContextMenuButton(skillId);
    await expect(menuButton).toBeVisible();
    await menuButton.click();
  }

  async deleteSkillViaContextMenu(skillId: string) {
    const deleteButton = this.getSkillDeleteButton(skillId);

    // Open context menu and wait for the delete button to appear in the popover
    await this.openContextMenu(skillId);
    await expect(deleteButton).toBeVisible({ timeout: 10_000 });
    await deleteButton.click();
  }

  async expectSkillRowVisible(skillId: string) {
    await expect(this.getSkillRow(skillId)).toBeVisible();
  }

  async expectSkillRowNotVisible(skillId: string) {
    await expect(this.getSkillRow(skillId)).not.toBeVisible();
  }
}
