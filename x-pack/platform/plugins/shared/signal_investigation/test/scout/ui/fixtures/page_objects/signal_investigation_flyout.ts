/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';

export class SignalInvestigationFlyoutPage {
  public readonly flyout: Locator;
  public readonly progress: Locator;
  public readonly leadsAccordion: Locator;
  public readonly leadsAccordionButton: Locator;
  public readonly coverageAccordion: Locator;
  public readonly coverageAccordionButton: Locator;
  public readonly leadList: Locator;
  public readonly leadCards: Locator;
  public readonly leadPreviewFlyout: Locator;
  public readonly leadDrilldownLink: Locator;
  public readonly alertDetailsButton: Locator;
  public readonly discoverAppMenuAction: Locator;

  constructor(private readonly page: ScoutPage) {
    this.flyout = this.page.testSubj.locator('signalInvestigationFlyout');
    this.progress = this.page.testSubj.locator('signalInvestigationProgress');
    this.leadsAccordion = this.page.testSubj.locator('signalInvestigationLeadsAccordion');
    this.leadsAccordionButton = this.leadsAccordion.getByRole('button', {
      name: /Investigation lead/i,
    });
    this.coverageAccordion = this.page.testSubj.locator('signalInvestigationCoverageAccordion');
    this.coverageAccordionButton = this.coverageAccordion.getByRole('button', {
      name: /Analysis coverage/i,
    });
    this.leadList = this.page.testSubj.locator('signalInvestigationLeadList');
    this.leadCards = this.page.testSubj.locator('signalInvestigationLead');
    this.leadPreviewFlyout = this.page.testSubj.locator('signalInvestigationLeadPreviewFlyout');
    this.leadDrilldownLink = this.page.testSubj.locator('signalInvestigationLeadDrilldownLink');
    this.alertDetailsButton = this.page.testSubj.locator('alertDetailsFindRelatedChanges');
    this.discoverAppMenuAction = this.page.testSubj.locator('discoverAppMenuFindRelatedChanges');
  }

  public async gotoAlertDetails(alertId: string): Promise<void> {
    await this.page.gotoApp(`observability/alerts/${encodeURIComponent(alertId)}`, {
      readyWhen: this.alertDetailsButton,
    });
  }

  public async openFromAlertDetails(): Promise<void> {
    await this.alertDetailsButton.click();
    await this.flyout.waitFor({ state: 'visible' });
  }

  public async waitForAnalysesComplete(): Promise<void> {
    await this.flyout.waitFor({ state: 'visible' });
    await this.leadList.waitFor({ state: 'visible' });
    await this.progress.waitFor({ state: 'hidden' });
  }

  public async openCoverageAccordion(): Promise<void> {
    await this.coverageAccordionButton.click();
    await this.coverageAccordionButton
      .and(this.page.locator('[aria-expanded="true"]'))
      .waitFor({ state: 'visible' });
  }

  public coverageItem(analyzerId: string): Locator {
    return this.page.testSubj.locator(`signalInvestigationCoverageItem-${analyzerId}`);
  }

  public coverageLink(analyzerId: string): Locator {
    return this.page.testSubj.locator(`signalInvestigationCoverageLink-${analyzerId}`);
  }

  public leadLinkWithText(text: string): Locator {
    return this.page.testSubj.locator('signalInvestigationLeadLink').filter({ hasText: text });
  }
}
