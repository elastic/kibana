/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';
import { waitForKibanaChromeLoadingFinished } from '../../common/wait_for_kibana_loading_finished';

export class OsqueryCasesPage {
  constructor(private readonly page: ScoutPage) {}

  async openLiveQueryRowDetails(actionId: string): Promise<void> {
    const row = this.page.testSubj.locator(`row-${actionId}`);
    await row.getByLabel('Details').click();
  }

  async addToCaseFromRowKebab(caseId: string): Promise<void> {
    const kebab = this.page.locator('[data-test-subj^="packQueriesTableKebab-"]').first();
    if (await kebab.isVisible().catch(() => false)) {
      await kebab.click();
      await this.page.locator('.euiContextMenuPanel').getByText('Add to Case').click();
    } else {
      await this.page.getByLabel('Add to Case').first().click();
    }

    await this.page.getByText('Select case').waitFor({ state: 'visible', timeout: 30_000 });
    await this.page.testSubj.locator(`cases-table-row-select-${caseId}`).click();
  }

  async addToCaseFromHeader(caseId: string): Promise<void> {
    await this.page.getByLabel('Add to Case').first().click();
    await this.page.getByText('Select case').waitFor({ state: 'visible', timeout: 30_000 });
    await this.page.testSubj.locator(`cases-table-row-select-${caseId}`).click();
  }

  async openCreateCaseFlyoutFromFilterBar(): Promise<void> {
    await this.page.testSubj.locator('cases-table-add-case-filter-bar').click();
    await this.page.testSubj.locator('create-case-flyout').waitFor({ state: 'visible', timeout: 30_000 });
  }

  async fillNewCaseTitle(title: string): Promise<void> {
    await this.page.locator('input[aria-describedby="caseTitle"]').fill(title);
  }

  async fillNewCaseDescription(description: string): Promise<void> {
    await this.page.getByLabel('caseDescription').fill(description);
  }

  async submitCreateCase(): Promise<void> {
    await this.page.testSubj.locator('create-case-submit').click();
  }

  async clickViewCaseFromToast(): Promise<void> {
    await this.page.getByText('View case').click();
  }

  async expectOsqueryAttachmentVisible(): Promise<void> {
    await this.page
      .getByText(/attached Osquery results/)
      .first()
      .waitFor({ state: 'visible', timeout: 60_000 });
  }

  async expectTextInCaseBody(text: string): Promise<void> {
    await this.page.getByText(text).first().waitFor({ state: 'visible', timeout: 60_000 });
  }

  async navigateToOsqueryApp(): Promise<void> {
    await this.page.gotoApp('osquery');
    await waitForKibanaChromeLoadingFinished(this.page).catch(() => {});
  }

  async navigateToHistory(): Promise<void> {
    await this.page.gotoApp('osquery/history');
    await waitForKibanaChromeLoadingFinished(this.page).catch(() => {});
  }

  getAddToCaseLocator(): Locator {
    return this.page.getByLabel('Add to Case');
  }
}
