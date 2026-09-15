/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';

const FOOTER_PANEL_IDS = ['admin_and_settings', 'stack_management'] as const;

/** Project chrome footer + Stack Management / Admin and Settings side panel. */
export class ProjectManagementNav {
  public readonly footerNav: Locator;
  public readonly primaryNav: Locator;

  constructor(private readonly page: ScoutPage) {
    this.footerNav = this.page.testSubj.locator('kbnChromeNav-footer');
    this.primaryNav = this.page.testSubj.locator('kbnChromeNav-primaryNavigation');
  }

  async waitForLoad() {
    await this.primaryNav.waitFor({ state: 'visible' });
  }

  footerItemById(id: string): Locator {
    return this.footerNav.locator(`[data-test-subj~="nav-item-id-${id}"]`);
  }

  sidePanel(id: string): Locator {
    return this.page.testSubj.locator(`~kbnChromeNav-sidePanel_${id}`);
  }

  managementLink(panel: Locator, managementAppId: string): Locator {
    return panel.locator(`[data-test-subj~="nav-item-id-management:${managementAppId}"]`);
  }

  /**
   * Opens serverless Admin and Settings or stateful Stack Management, whichever
   * the current project chrome renders.
   */
  async openManagementPanel(): Promise<Locator> {
    await this.footerNav.waitFor({ state: 'visible' });

    for (const panelId of FOOTER_PANEL_IDS) {
      const opener = this.footerItemById(panelId);
      if (await opener.isVisible()) {
        await opener.click();
        const panel = this.sidePanel(panelId);
        await panel.waitFor({ state: 'visible' });
        return panel;
      }
    }

    throw new Error(`Project chrome footer has no ${FOOTER_PANEL_IDS.join(' or ')} panel opener`);
  }
}
