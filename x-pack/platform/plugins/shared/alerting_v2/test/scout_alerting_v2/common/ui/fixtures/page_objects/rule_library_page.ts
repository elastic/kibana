/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';
import type { AlertingMountConfig } from './alerting_mount_config';

/** Drives the Rule library page, where rules are created from templates. */
export class RuleLibraryPage {
  public readonly page: Locator;
  /** Success toast action that opens the rule that was just created. */
  public readonly viewRuleToastLink: Locator;
  /** Content list toolbar search box. */
  private readonly searchBox: Locator;

  constructor(
    private readonly scoutPage: ScoutPage,
    private readonly mountConfig: AlertingMountConfig
  ) {
    this.page = this.scoutPage.testSubj.locator('ruleLibraryPage');
    this.viewRuleToastLink = this.scoutPage.testSubj.locator('alertingV2ViewRuleToastLink');
    this.searchBox = this.scoutPage.testSubj.locator('contentListToolbar-searchBox');
  }

  async goto() {
    await this.scoutPage.gotoApp(
      `${this.mountConfig.appRoute}${this.mountConfig.paths.ruleLibrary}`
    );
  }

  async search(value: string) {
    await this.searchBox.fill(value);
    await this.searchBox.press('Enter');
  }

  /** The table does not tag rows with a test subject, so rows are matched by template name. */
  templateRow(templateName: string) {
    return this.page.getByRole('row').filter({ hasText: templateName });
  }

  createButton(templateName: string) {
    return this.templateRow(templateName).getByTestId('ruleLibraryCreateAction');
  }

  /** @deprecated Use {@link createButton} instead. */
  installButton(templateName: string) {
    return this.createButton(templateName);
  }

  createdToast(ruleName: string) {
    return this.scoutPage.getByText(`Rule "${ruleName}" created successfully`);
  }
}
