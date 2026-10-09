/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaUrl, Locator, ScoutPage } from '@kbn/scout';
import type { PolicyExecutionOutcomeFilter } from '@kbn/alerting-v2-schemas';

/**
 * Drives the alert episode details page, focused on the "Policy history" tab
 * (action policy execution history scoped to a single episode).
 */
export class EpisodeDetailsPage {
  public readonly pageContainer: Locator;
  public readonly actionPolicyHistoryTab: Locator;
  public readonly actionPolicyHistoryTabContent: Locator;
  public readonly searchBar: Locator;
  public readonly outcomeFilter: Locator;
  public readonly ruleFilter: Locator;
  public readonly emptyPrompt: Locator;
  public readonly filteredEmptyPrompt: Locator;

  constructor(private readonly page: ScoutPage, private readonly kbnUrl: KibanaUrl) {
    this.pageContainer = this.page.testSubj.locator('alertingV2EpisodeDetailsPage');
    this.actionPolicyHistoryTab = this.page.testSubj.locator(
      'alertingV2EpisodeDetailsMainTabActionPolicyHistory'
    );
    this.actionPolicyHistoryTabContent = this.page.testSubj.locator(
      'episodeActionPolicyHistoryTab'
    );
    this.searchBar = this.page.testSubj.locator('executionHistorySearchBar');
    this.outcomeFilter = this.page.testSubj.locator('executionHistoryOutcomeFilter');
    this.ruleFilter = this.page.testSubj.locator('executionHistoryRuleFilter');
    this.emptyPrompt = this.page.testSubj.locator('executionHistoryEmptyPrompt');
    this.filteredEmptyPrompt = this.page.testSubj.locator('executionHistoryFilteredEmptyPrompt');
  }

  async goto(episodeId: string, spaceId?: string) {
    const appPath = `management/alertingV2/episodes/${encodeURIComponent(episodeId)}`;
    await this.page.goto(
      spaceId ? this.kbnUrl.app(appPath, { space: spaceId }) : this.kbnUrl.app(appPath)
    );
  }

  async openActionPolicyHistoryTab() {
    await this.actionPolicyHistoryTab.click();
    await this.actionPolicyHistoryTabContent.waitFor({ state: 'visible' });
  }

  async selectOutcome(outcome: PolicyExecutionOutcomeFilter) {
    await this.outcomeFilter.selectOption(outcome);
  }

  policyCell(policyName: string): Locator {
    return this.actionPolicyHistoryTabContent.getByRole('button', { name: policyName });
  }
}
