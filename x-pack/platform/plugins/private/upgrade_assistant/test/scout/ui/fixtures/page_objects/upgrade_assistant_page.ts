/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';
import { UPGRADE_ASSISTANT_PATHS } from '../constants';

export class UpgradeAssistantPage {
  public readonly overview: Locator;
  public readonly backupStepIncomplete: Locator;
  public readonly migrateSystemIndicesText: Locator;
  public readonly fixIssuesStepIncomplete: Locator;
  public readonly logsStepIncomplete: Locator;
  public readonly upgradeStep: Locator;
  public readonly esStatsPanel: Locator;
  public readonly kibanaStatsPanel: Locator;
  public readonly esDeprecationsTable: Locator;
  public readonly kibanaDeprecations: Locator;
  public readonly viewDetailsLink: Locator;
  public readonly hasWarningsCallout: Locator;
  public readonly noWarningsCallout: Locator;
  public readonly resetLastStoredDateButton: Locator;
  public readonly stackManagementNavLink: Locator;
  public readonly dataSectionHeading: Locator;
  public readonly insightsAndAlertingSectionHeading: Locator;
  public readonly kibanaSectionHeading: Locator;
  public readonly stackSectionHeading: Locator;
  public readonly dataQualityLink: Locator;
  public readonly contentConnectorsLink: Locator;
  public readonly licenseManagementLink: Locator;
  public readonly upgradeAssistantLink: Locator;

  constructor(private readonly page: ScoutPage) {
    this.overview = this.page.testSubj.locator('overview');
    this.backupStepIncomplete = this.page.testSubj.locator('backupStep-incomplete');
    this.migrateSystemIndicesText = this.page.testSubj.locator('migrateSystemIndicesText');
    this.fixIssuesStepIncomplete = this.page.testSubj.locator('fixIssuesStep-incomplete');
    this.logsStepIncomplete = this.page.testSubj.locator('logsStep-incomplete');
    this.upgradeStep = this.page.testSubj.locator('upgradeStep');
    this.esStatsPanel = this.page.testSubj.locator('esStatsPanel');
    this.kibanaStatsPanel = this.page.testSubj.locator('kibanaStatsPanel');
    this.esDeprecationsTable = this.page.testSubj.locator('esDeprecationsTable');
    this.kibanaDeprecations = this.page.testSubj.locator('kibanaDeprecations');
    this.viewDetailsLink = this.page.testSubj.locator('viewDetailsLink');
    this.hasWarningsCallout = this.page.testSubj.locator('hasWarningsCallout');
    this.noWarningsCallout = this.page.testSubj.locator('noWarningsCallout');
    this.resetLastStoredDateButton = this.page.testSubj.locator('resetLastStoredDate');
    this.stackManagementNavLink = this.page.getByRole('link', { name: 'Stack Management' });
    this.dataSectionHeading = this.page.getByRole('heading', { name: 'Data' });
    this.insightsAndAlertingSectionHeading = this.page.getByRole('heading', {
      name: 'Insights and Alerting',
    });
    this.kibanaSectionHeading = this.page.getByRole('heading', { name: 'Kibana' });
    this.stackSectionHeading = this.page.getByRole('heading', { name: 'Stack' });
    this.dataQualityLink = this.page.getByRole('link', { name: 'Data Quality' });
    this.contentConnectorsLink = this.page.getByRole('link', { name: 'Content connectors' });
    this.licenseManagementLink = this.page.getByRole('link', { name: 'License Management' });
    this.upgradeAssistantLink = this.page.getByRole('link', { name: 'Upgrade Assistant' });
  }

  async gotoOverview() {
    await this.page.gotoApp(UPGRADE_ASSISTANT_PATHS.overview);
    await this.overview.waitFor();
  }

  async gotoManagement() {
    await this.page.gotoApp('management');
  }

  async gotoHome() {
    await this.page.gotoApp('home');
  }

  async clickEsDeprecationsPanel() {
    await this.esStatsPanel.click();
  }

  async clickKibanaDeprecationsPanel() {
    await this.kibanaStatsPanel.click();
  }

  async clickVerifyLoggingButton() {
    await this.viewDetailsLink.click();
  }

  async clickResetLastCheckpointButton() {
    await this.resetLastStoredDateButton.click();
  }

  async getEsDeprecationMessages(): Promise<string[]> {
    return await this.page.testSubj.locator('defaultTableCell-message').allTextContents();
  }
}
