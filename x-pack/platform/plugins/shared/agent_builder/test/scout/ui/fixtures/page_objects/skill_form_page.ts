/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

export class SkillFormPage {
  constructor(private readonly page: ScoutPage) {}

  async navigateToCreate() {
    await this.page.gotoApp('agent_builder/skills/new');
  }

  async navigateToDetails(skillId: string) {
    await this.page.gotoApp(`agent_builder/skills/${skillId}`);
  }

  async waitForPageToLoad() {
    await this.page.testSubj.waitForSelector('agentBuilderSkillFormPage', {
      state: 'visible',
      timeout: 30_000,
    });
  }

  async waitForFormToLoad() {
    await this.page.testSubj.waitForSelector('agentBuilderSkillForm', {
      state: 'visible',
      timeout: 30_000,
    });
  }

  getFormPage() {
    return this.page.testSubj.locator('agentBuilderSkillFormPage');
  }

  getForm() {
    return this.page.testSubj.locator('agentBuilderSkillForm');
  }

  getIdInput() {
    return this.page.testSubj.locator('agentBuilderSkillFormIdInput');
  }

  getNameInput() {
    return this.page.testSubj.locator('agentBuilderSkillFormNameInput');
  }

  getDescriptionInput() {
    return this.page.testSubj.locator('agentBuilderSkillFormDescriptionInput');
  }

  getContentInput() {
    return this.page.testSubj.locator('agentBuilderSkillFormContentInput');
  }

  getToolIdsInput() {
    return this.page.testSubj.locator('agentBuilderSkillFormToolIdsInput');
  }

  getSaveButton() {
    return this.page.testSubj.locator('agentBuilderSkillFormSaveButton');
  }

  getSubmitButton() {
    return this.page.testSubj.locator('agentBuilderSkillFormSubmitButton');
  }

  getCancelButton() {
    return this.page.testSubj.locator('agentBuilderSkillFormCancelButton');
  }

  getReadOnlyBadge() {
    return this.page.testSubj.locator('agentBuilderSkillReadOnlyBadge');
  }

  async fillId(value: string) {
    await this.getIdInput().fill(value);
  }

  async fillName(value: string) {
    await this.getNameInput().fill(value);
  }

  async fillDescription(value: string) {
    await this.getDescriptionInput().fill(value);
  }

  async fillContent(value: string) {
    await this.getContentInput().fill(value);
  }

  async submitForm() {
    await this.getSubmitButton().click();
  }

  async clickSaveButton() {
    await this.getSaveButton().click();
  }

  async clickCancelButton() {
    await this.getCancelButton().click();
  }

  async expectFormVisible() {
    await expect(this.getForm()).toBeVisible();
  }

  async expectReadOnlyBadgeVisible() {
    await expect(this.getReadOnlyBadge()).toBeVisible();
  }

  async expectReadOnlyBadgeNotVisible() {
    await expect(this.getReadOnlyBadge()).not.toBeVisible();
  }
}
