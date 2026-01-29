/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';

/**
 * Page object for the GenAI Settings management page
 */
export class GenAiSettingsPage {
  constructor(private readonly page: ScoutPage) {}

  /**
   * Navigate to the GenAI Settings page in Stack Management
   */
  async navigateTo() {
    await this.page.gotoApp('management');
    await this.page.testSubj.click('app-card-genAiSettings');
    await this.waitForPageToLoad();
  }

  /**
   * Wait for the page to finish loading
   */
  async waitForPageToLoad() {
    await this.page.testSubj.waitForSelector('genAiSettingsPage', { state: 'visible' });
  }

  /**
   * Get the chat experience field row element
   */
  getChatExperienceField() {
    return this.page.testSubj.locator('field-aiAssistant:preferredChatExperience');
  }

  /**
   * Get the chat experience dropdown/select element
   */
  getChatExperienceSelect() {
    return this.getChatExperienceField().locator('select');
  }

  /**
   * Select a chat experience option
   * @param value - 'classic' or 'agent'
   */
  async selectChatExperience(value: 'classic' | 'agent') {
    const select = this.getChatExperienceSelect();
    await select.selectOption({ value });
  }

  /**
   * Get the confirmation modal element (appears when selecting Agent mode)
   */
  getConfirmationModal() {
    return this.page.testSubj.locator('confirmModal');
  }

  /**
   * Click the confirm button in the Agent confirmation modal
   */
  async confirmAgentSelection() {
    await this.page.testSubj.click('confirmModalConfirm');
  }

  /**
   * Click the cancel button in the Agent confirmation modal
   */
  async cancelAgentSelection() {
    await this.page.testSubj.click('confirmModalCancel');
  }

  /**
   * Get the save button in the bottom bar
   */
  getSaveButton() {
    return this.page.testSubj.locator('genAiSettingsSaveBar-saveButton');
  }

  /**
   * Click the save button
   */
  async clickSave() {
    await this.getSaveButton().click();
  }

  /**
   * Get the discard changes button
   */
  getDiscardButton() {
    return this.page.testSubj.locator('genAiSettingsSaveBar-discardButton');
  }

  /**
   * Check if the documentation section is visible (only in Agent mode)
   */
  async isDocumentationSectionVisible() {
    return this.page.testSubj.isVisible('documentationSection');
  }

  /**
   * Get the documentation table element
   */
  getDocumentationTable() {
    return this.page.testSubj.locator('documentationTable');
  }

  /**
   * Get the AI Assistant Visibility field
   */
  getAiAssistantVisibilityField() {
    return this.page.testSubj.locator('field-aiAssistant:preferredAIAssistantType');
  }

  /**
   * Check if AI Assistant Visibility setting is visible
   */
  async isAiAssistantVisibilityVisible() {
    try {
      return await this.getAiAssistantVisibilityField().isVisible();
    } catch {
      return false;
    }
  }

  /**
   * Get the default AI connector field
   */
  getDefaultConnectorField() {
    return this.page.testSubj.locator('connectorsSection');
  }
}
