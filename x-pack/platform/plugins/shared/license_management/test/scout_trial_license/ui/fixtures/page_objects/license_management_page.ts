/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';

const LICENSE_MANAGEMENT_APP_PATH = 'management/stack/license_management';

export class LicenseManagementPage {
  public readonly licenseText: Locator;
  public readonly licenseSubText: Locator;
  public readonly revertToBasicButton: Locator;
  public readonly confirmModalTitleText: Locator;
  public readonly confirmModalConfirmButton: Locator;

  constructor(private readonly page: ScoutPage) {
    this.licenseText = this.page.testSubj.locator('licenseText');
    this.licenseSubText = this.page.testSubj.locator('licenseSubText');
    this.revertToBasicButton = this.page.testSubj.locator('revertToBasicButton');
    this.confirmModalTitleText = this.page.testSubj.locator('confirmModalTitleText');
    this.confirmModalConfirmButton = this.page.testSubj.locator('confirmModalConfirmButton');
  }

  async goto(): Promise<void> {
    await this.page.gotoApp(LICENSE_MANAGEMENT_APP_PATH);
    await this.licenseText.waitFor({ state: 'visible' });
  }

  // Kept separate from the confirm step so specs can assert on the modal before the
  // irreversible downgrade.
  async openRevertToBasicModal(): Promise<void> {
    await this.revertToBasicButton.click();
    await this.confirmModalTitleText.waitFor({ state: 'visible' });
  }

  async confirmRevertToBasic(): Promise<void> {
    await this.confirmModalConfirmButton.click();
    await this.confirmModalConfirmButton.waitFor({ state: 'hidden' });
  }
}
