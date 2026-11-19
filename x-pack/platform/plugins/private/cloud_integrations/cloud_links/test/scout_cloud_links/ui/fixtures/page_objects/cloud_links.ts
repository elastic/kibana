/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';

export class CloudLinksPageObject {
  constructor(private readonly page: ScoutPage) {}

  async openNav() {
    await this.page.testSubj.click('toggleNavButton');
    await this.page.testSubj.waitForSelector('collapsibleNavCustomNavLink', { state: 'visible' });
  }

  async isManageDeploymentLinkVisible(): Promise<boolean> {
    return this.page.testSubj.locator('collapsibleNavCustomNavLink').isVisible();
    // return this.page.locator('a:has-text("Manage this deployment")').isVisible();
  }

  async openUserMenu() {
    await this.page.testSubj.click('userMenuButton');
    await this.page.testSubj.waitForSelector('userMenu', { state: 'visible' });
  }

  public get profileLink() {
    return this.page.testSubj.locator('userMenuLink__profile');
  }

  public get billingLink() {
    return this.page.testSubj.locator('userMenuLink__billing');
  }

  public get organizationLink() {
    return this.page.testSubj.locator('userMenuLink__organization');
  }

  async isProfileLinkVisible(): Promise<boolean> {
    return this.profileLink.isVisible();
  }

  async isBillingLinkVisible(): Promise<boolean> {
    return this.billingLink.isVisible();
  }

  async isOrganizationLinkVisible(): Promise<boolean> {
    return this.organizationLink.isVisible();
  }

  async isAppearanceButtonVisible(): Promise<boolean> {
    return this.page.testSubj.locator('appearanceSelector').isVisible();
  }

  async isSpacesConfigurationButtonVisible(): Promise<boolean> {
    return this.page.testSubj.locator('spacePreferenceSelector').isVisible();
  }
}
