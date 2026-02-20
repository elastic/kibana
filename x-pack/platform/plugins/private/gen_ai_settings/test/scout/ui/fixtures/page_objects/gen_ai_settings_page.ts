/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

/**
 * Page object for the GenAI Settings management page
 */
export class GenAiSettingsPage {
  constructor(private readonly page: ScoutPage) {}

  private readonly cardTestSubj = {
    observability: 'aiAssistantObservabilityCard',
    security: 'aiAssistantSecurityCard',
    agent: 'aiAssistantAgentCard',
  } as const;

  /**
   * Navigate to the GenAI Settings page in Stack Management
   */
  async navigateTo() {
    await this.page.gotoApp('management/ai/genAiSettings');
    await this.waitForPageToLoad();
  }

  /**
   * Wait for the page to finish loading
   */
  async waitForPageToLoad() {
    await this.page.testSubj.waitForSelector('genAiSettingsPage', { state: 'visible' });
  }

  /**
   * Get the GenAI Settings page title element
   */
  getGenAiSettingsPageTitle() {
    return this.page.testSubj.locator('genAiSettingsTitle');
  }

  /**
   * Get the chat experience field row element
   */
  getChatExperienceField() {
    return this.page.testSubj.locator(
      'management-settings-editField-aiAssistant:preferredChatExperience'
    );
  }

  /**
   * Get the Agent confirmation modal container
   */
  getConfirmModal() {
    return this.page.testSubj.locator('confirmModalTitleText');
  }

  /**
   * Get the confirm button in the Agent confirmation modal
   */
  getConfirmModalConfirmButton() {
    return this.page.testSubj.locator('confirmModalConfirmButton');
  }

  /**
   * Get the cancel button in the Agent confirmation modal
   */
  getConfirmModalCancelButton() {
    return this.page.testSubj.locator('confirmModalCancelButton');
  }

  /**
   * Get the save button in the bottom bar
   */
  getSaveButton() {
    return this.page.testSubj.locator('genAiSettingsSaveBarBottomBarActionsButton');
  }

  /**
   * Get the bottom bar container element
   */
  getSaveButtonBottomBar() {
    return this.page.testSubj.locator('genAiSettingsSaveBarBottomBar');
  }

  /**
   * Get the documentation section element (only visible in Agent mode)
   */
  getDocumentationSection() {
    return this.page.testSubj.locator('documentationSection');
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
    return this.page.testSubj.locator(
      'management-settings-editField-aiAssistant:preferredAIAssistantType'
    );
  }

  /**
   * Get the AI Assistants side nav button
   */
  getAIAssistantsSideNavButton() {
    return this.page.testSubj.locator('aiAssistantManagementSelection');
  }

  /**
   * Get the AI Assistants side nav setting
   */
  getAIAssistantSideNavSetting() {
    return this.page.testSubj.locator('*nav-item-id-management:aiAssistantManagementSelection');
  }

  /**
   * Get the AI Assistant side nav button for Observability
   */
  getAIAssistantSideNavButton() {
    return this.page.testSubj.locator('*nav-item-id-aiAssistantContainer');
  }

  /**
   * Get the AI Assistant nav button
   */
  getAiAssistantNavButton() {
    return this.page.testSubj.locator('aiAssistantHeaderButton');
  }

  /**
   * Get the AI Assistant nav button for Security
   */
  getAiAssistantNavButtonSecurity() {
    return this.page.testSubj.locator('assistantNavLink');
  }

  /**
   * Get the AI Assistant nav button for Observability
   */
  getAIAssistantNavButtonObltSearch() {
    return this.page.testSubj.locator('observabilityAiAssistantAppNavControlButton');
  }

  /**
   * Get the AI Agent nav button
   */
  getAIAgentNavButton() {
    return this.page.testSubj.locator('AgentBuilderNavControlButton');
  }

  /**
   * Get the Agent side nav button
   */
  getAgentSideNavButton() {
    return this.page.testSubj.locator('*nav-item-id-agent_builder');
  }

  /**
   * Get the card selection modal element
   */
  getCardSelectionModal() {
    return this.page.testSubj.locator('aiAssistantModalTitle');
  }

  /**
   * Get the selection modal apply button
   */
  getSelectionModalApplyButton() {
    return this.page.testSubj.locator('aiAssistantApplyButton');
  }

  /**
   * Get the selection modal cancel button
   */
  getSelectionModalCancelButton() {
    return this.page.testSubj.locator('aiAssistantCancelButton');
  }

  /**
   * Get card switch button by logical key.
   * @param card - One of: observability, security, agent
   */
  getCardSwitch(card: keyof GenAiSettingsPage['cardTestSubj']) {
    return this.page.testSubj.locator(this.cardTestSubj[card]).locator('button[role="switch"]');
  }

  /**
   * Verify multiple card states in one call.
   * @param cards - Object with keys one of: observability, security, agent; boolean value
   */
  async expectCardsState(cards: Partial<Record<keyof GenAiSettingsPage['cardTestSubj'], boolean>>) {
    for (const [card, enabled] of Object.entries(cards)) {
      const typedCard = card as keyof GenAiSettingsPage['cardTestSubj'];
      const cardContainer = this.page.testSubj.locator(this.cardTestSubj[typedCard]);
      await expect(cardContainer).toBeVisible();

      const cardSwitch = this.getCardSwitch(typedCard);
      await expect(cardSwitch).toBeVisible();

      if (enabled) {
        await expect(cardSwitch).toBeEnabled();
      } else {
        await expect(cardSwitch).toBeDisabled();
      }
    }
  }

  /**
   * Get the AI Agent flyout element
   */
  getAIAgentFlyout() {
    return this.page.testSubj.locator('agent-builder-conversation-flyout-wrapper');
  }

  /**
   * Get the More menu button element
   */
  getMoreMenuButton() {
    return this.page.testSubj.locator('kbnChromeNav-moreMenuTrigger');
  }
}
