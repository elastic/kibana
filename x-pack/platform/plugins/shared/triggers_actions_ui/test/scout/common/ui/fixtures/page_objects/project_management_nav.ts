/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';

/** Serverless / cloud: primary chrome nav can lag behind Playwright defaults (gh-267186). */
const PRIMARY_NAV_LOAD_TIMEOUT_MS = 45_000;

export const PROJECT_MANAGEMENT_PANEL_IDS = ['admin_and_settings', 'stack_management'] as const;
export type ProjectManagementPanelId = (typeof PROJECT_MANAGEMENT_PANEL_IDS)[number];

/** Project chrome footer + Stack Management / Admin and Settings side panel. */
export class ProjectManagementNav {
  public readonly footerNav: Locator;
  public readonly primaryNav: Locator;

  constructor(private readonly page: ScoutPage) {
    this.footerNav = this.page.testSubj.locator('kbnChromeNav-footer');
    this.primaryNav = this.page.testSubj.locator('kbnChromeNav-primaryNavigation');
  }

  async waitForLoad() {
    await this.primaryNav.waitFor({ state: 'visible', timeout: PRIMARY_NAV_LOAD_TIMEOUT_MS });
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
   * Opens the given project-chrome management panel. Caller picks the id from
   * `config.serverless` (`admin_and_settings`) vs stateful solution nav (`stack_management`).
   */
  async openManagementPanel(panelId: ProjectManagementPanelId): Promise<Locator> {
    const opener = this.footerItemById(panelId);
    await opener.click();
    const panel = this.sidePanel(panelId);
    await panel.waitFor({ state: 'visible' });
    return panel;
  }
}
