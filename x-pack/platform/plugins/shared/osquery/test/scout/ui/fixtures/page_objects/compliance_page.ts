/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable max-classes-per-file */

import type { ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

export class AbstractPageObject {
  constructor(public readonly page: ScoutPage) {}
}

/**
 * Page object for Osquery Compliance monitoring features
 */
export class CompliancePage extends AbstractPageObject {
  /**
   * Navigate to compliance dashboard
   */
  async gotoDashboard() {
    await this.page.gotoApp('osquery/compliance/dashboard');
  }

  /**
   * Navigate to findings explorer
   */
  async gotoFindingsExplorer() {
    await this.page.gotoApp('osquery/compliance/findings');
  }

  /**
   * Navigate to rules management
   */
  async gotoRulesManagement() {
    await this.page.gotoApp('osquery/compliance/rules');
  }

  /**
   * Navigate to rule authoring page
   */
  async gotoRuleAuthoring() {
    await this.page.gotoApp('osquery/compliance/rules/create');
  }

  /**
   * Navigate to exception management
   */
  async gotoExceptionManagement() {
    await this.page.gotoApp('osquery/compliance/exceptions');
  }

  /**
   * Get the page title text
   */
  async getPageTitle() {
    const title = await this.page.testSubj.locator('compliancePageTitle');
    return await title.textContent();
  }

  /**
   * Dashboard - Get compliance score value
   */
  async getDashboardComplianceScore() {
    const scoreElement = await this.page.testSubj.locator('complianceScoreValue');
    const scoreText = await scoreElement.textContent();
    return parseFloat(scoreText?.replace('%', '') || '0');
  }

  /**
   * Dashboard - Check if score gauge is visible
   */
  async isComplianceScoreGaugeVisible() {
    const gauge = this.page.testSubj.locator('complianceScoreGauge');
    await expect(gauge).toBeVisible();
  }

  /**
   * Dashboard - Get worst hosts count
   */
  async getWorstHostsCount() {
    const rows = await this.page.testSubj.locator('worstHostsTableRow').count();
    return rows;
  }

  /**
   * Findings - Apply filter
   */
  async applyFindingsFilter(filterType: 'failed' | 'passed' | 'all') {
    await this.page.testSubj.click(`findingsFilter-${filterType}`);
  }

  /**
   * Findings - Get findings count
   */
  async getFindingsCount() {
    const countElement = await this.page.testSubj.locator('findingsTotalCount');
    const countText = await countElement.textContent();
    return parseInt(countText || '0', 10);
  }

  /**
   * Findings - Click on a finding row
   */
  async clickFindingRow(index: number) {
    const rows = this.page.testSubj.locator('findingsTableRow');
    // eslint-disable-next-line playwright/no-nth-methods
    await rows.nth(index).click();
  }

  /**
   * Rules - Get rules count
   */
  async getRulesCount() {
    const rows = await this.page.testSubj.locator('complianceRuleRow').count();
    return rows;
  }

  /**
   * Rules - Click create rule button
   */
  async clickCreateRuleButton() {
    await this.page.testSubj.click('createComplianceRuleButton');
  }

  /**
   * Rules - Toggle rule enabled/disabled
   */
  async toggleRule(ruleId: string) {
    await this.page.testSubj.click(`complianceRuleToggle-${ruleId}`);
  }

  /**
   * Rule Authoring - Fill rule name
   */
  async fillRuleName(name: string) {
    await this.page.testSubj.fill('ruleNameInput', name);
  }

  /**
   * Rule Authoring - Fill osquery query
   */
  async fillOsqueryQuery(query: string) {
    await this.page.testSubj.fill('osqueryQueryInput', query);
  }

  /**
   * Rule Authoring - Fill remediation
   */
  async fillRemediation(remediation: string) {
    await this.page.testSubj.fill('ruleRemediationInput', remediation);
  }

  /**
   * Rule Authoring - Select platform
   */
  async selectPlatform(platform: 'linux' | 'darwin' | 'windows') {
    await this.page.testSubj.click('rulePlatformSelect');
    await this.page.testSubj.click(`rulePlatform-${platform}`);
  }

  /**
   * Rule Authoring - Click save rule button
   */
  async clickSaveRuleButton() {
    const saveButton = this.page.testSubj.locator('saveRuleButton');
    await saveButton.click();
    // Wait for save to complete
    await expect(saveButton).toBeDisabled({ timeout: 30000 });
  }

  /**
   * Exceptions - Create exception
   */
  async createException(ruleId: string, scope: 'host' | 'rule' | 'global') {
    await this.page.testSubj.click('createExceptionButton');
    await this.page.testSubj.fill('exceptionRuleIdInput', ruleId);
    await this.page.testSubj.click(`exceptionScope-${scope}`);
    await this.page.testSubj.click('saveExceptionButton');
  }

  /**
   * Exceptions - Get exceptions count
   */
  async getExceptionsCount() {
    const rows = await this.page.testSubj.locator('exceptionRow').count();
    return rows;
  }

  /**
   * Wait for compliance data to load
   */
  async waitForDataLoad() {
    // Wait for loading spinner to disappear
    const spinner = this.page.testSubj.locator('complianceLoadingSpinner');
    await expect(spinner).toBeHidden({ timeout: 30000 });
  }

  /**
   * Check if feature flag warning is shown
   */
  async isFeatureFlagWarningVisible() {
    try {
      const warning = this.page.testSubj.locator('complianceFeatureDisabledWarning');
      return await warning.isVisible({ timeout: 2000 });
    } catch {
      return false;
    }
  }
}
