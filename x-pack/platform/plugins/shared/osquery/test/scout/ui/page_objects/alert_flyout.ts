/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';

const FLYOUT_OSQUERY_EDITOR = 'flyout-body-osquery';

export class AlertFlyoutPage {
  public readonly expandEventButton: Locator;
  public readonly flyoutFooterDropdown: Locator;
  public readonly osqueryActionItem: Locator;
  public readonly investigationGuideButton: Locator;
  public readonly submitButton: Locator;
  public readonly sendAlertToTimelineButton: Locator;

  constructor(private readonly page: ScoutPage) {
    this.expandEventButton = this.page.testSubj.locator('expand-event');
    this.flyoutFooterDropdown = this.page.testSubj.locator(
      'securitySolutionFlyoutFooterDropdownButton'
    );
    this.osqueryActionItem = this.page.testSubj.locator('osquery-action-item');
    this.investigationGuideButton = this.page.testSubj.locator(
      'securitySolutionFlyoutInvestigationGuideButton'
    );
    this.submitButton = this.page.locator('#submit-button');
    this.sendAlertToTimelineButton = this.page.testSubj.locator('send-alert-to-timeline-button');
  }

  async expandFirstAlert(): Promise<void> {
    // eslint-disable-next-line playwright/no-nth-methods -- the helper's purpose is to expand the first alert row; scoping is handled by the `openRuleAlertsView` navigation that precedes this call
    await this.expandEventButton.first().click();
  }

  async openTakeActionMenu(): Promise<void> {
    await this.flyoutFooterDropdown.click({ force: true });
  }

  async chooseOsqueryAction(): Promise<void> {
    await this.osqueryActionItem.click();
  }

  async openInvestigationGuide(): Promise<void> {
    await this.investigationGuideButton.click();
  }

  async doubleClickInvestigationGuideQuery(label: string): Promise<void> {
    await this.page
      .getByText(label, { exact: false })
      .waitFor({ state: 'visible', timeout: 30_000 });
    await this.page.getByText(label, { exact: false }).dblclick({ force: true });
  }

  async clickFlyoutMonacoEditor(): Promise<void> {
    await this.page.testSubj.locator(FLYOUT_OSQUERY_EDITOR).locator('.kibanaCodeEditor').click();
  }

  async inputFlyoutQuery(query: string): Promise<void> {
    const editor = this.page.testSubj.locator(FLYOUT_OSQUERY_EDITOR).locator('.kibanaCodeEditor');
    await editor.click();
    await editor.pressSequentially(query, { delay: 5 });
  }

  async clearAgentsAndSelectAllAgents(): Promise<void> {
    const agentSelection = this.page.testSubj.locator('agentSelection');
    await agentSelection.getByTestId('comboBoxClearButton').click();
    const input = agentSelection.getByTestId('comboBoxInput');
    await input.fill('All');
    await this.page.keyboard.press('ArrowDown');
    await this.page.keyboard.press('Enter');
    await this.page.keyboard.press('Escape').catch(() => {});
    await this.page
      .getByText('All agents')
      .waitFor({ state: 'visible', timeout: 15_000 })
      .catch(() => {});
  }

  async clickSubmitInFlyout(): Promise<void> {
    await this.submitButton.waitFor({ state: 'visible', timeout: 30_000 });
    await this.submitButton.click({ force: true });
  }

  async clickAddToTimeline(): Promise<void> {
    await this.page
      .getByText('Add to Timeline investigation')
      .waitFor({ state: 'visible', timeout: 180_000 });
    // eslint-disable-next-line playwright/no-nth-methods -- the live-query results table renders several add-to-timeline buttons (one per row); clicking the first attaches the aggregate action used by the flyout flow
    await this.page.testSubj.locator('add-to-timeline').first().click();
  }

  async clickCancelInFlyout(): Promise<void> {
    await this.page.getByRole('button', { name: 'Cancel' }).click();
  }
}
