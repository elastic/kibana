/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

export class OsqueryCasesPage {
  public readonly packQueriesKebabs: Locator;
  public readonly addToCaseLabel: Locator;
  public readonly selectCaseText: Locator;
  public readonly casesFilterBarAddButton: Locator;
  public readonly createCaseFlyout: Locator;
  public readonly caseTitleInput: Locator;
  public readonly caseDescriptionInput: Locator;
  public readonly createCaseSubmit: Locator;
  public readonly viewCaseText: Locator;
  public readonly osqueryAttachmentText: Locator;

  constructor(private readonly page: ScoutPage) {
    this.packQueriesKebabs = this.page.locator('[data-test-subj^="packQueriesTableKebab-"]');
    this.addToCaseLabel = this.page.getByLabel('Add to Case');
    this.selectCaseText = this.page.getByText('Select case');
    this.casesFilterBarAddButton = this.page.testSubj.locator('cases-table-add-case-filter-bar');
    this.createCaseFlyout = this.page.testSubj.locator('create-case-flyout');
    this.caseTitleInput = this.page.locator('input[aria-describedby="caseTitle"]');
    this.caseDescriptionInput = this.page.getByLabel('caseDescription');
    this.createCaseSubmit = this.page.testSubj.locator('create-case-submit');
    this.viewCaseText = this.page.getByText('View case');
    this.osqueryAttachmentText = this.page.getByText(/attached Osquery results/);
  }

  async openLiveQueryRowDetails(actionId: string): Promise<void> {
    const row = this.page.testSubj.locator(`row-${actionId}`);
    await row.getByLabel('Details').click();
  }

  /**
   * Pack-results layout: click the per-query row kebab and pick "Add to Case"
   * from its context menu. Callers MUST be in a pack-results view — this
   * method does not fall back to the header variant if the kebab is missing.
   * Use `addToCaseFromHeader` for single-query results.
   */
  async addToCaseFromRowKebab(caseId: string): Promise<void> {
    // eslint-disable-next-line playwright/no-nth-methods -- pack results render one kebab per query row; the first exercises the generic add-to-case flow without coupling to a specific query row
    await this.packQueriesKebabs.first().click();
    await this.page.locator('.euiContextMenuPanel').getByText('Add to Case').click();

    await this.selectCaseText.waitFor({ state: 'visible', timeout: 30_000 });
    await this.page.testSubj.locator(`cases-table-row-select-${caseId}`).click();
  }

  /**
   * Single-query results layout: click the aggregate "Add to Case" button in
   * the results header. Use `addToCaseFromRowKebab` for pack-results rows.
   */
  async addToCaseFromHeader(caseId: string): Promise<void> {
    // eslint-disable-next-line playwright/no-nth-methods -- the results header renders a single Add-to-Case button but Playwright treats `getByLabel` as strict-multi; first() matches the header variant specifically
    await this.addToCaseLabel.first().click();
    await this.selectCaseText.waitFor({ state: 'visible', timeout: 30_000 });
    await this.page.testSubj.locator(`cases-table-row-select-${caseId}`).click();
  }

  async openCreateCaseFlyoutFromFilterBar(): Promise<void> {
    await this.casesFilterBarAddButton.click();
    await this.createCaseFlyout.waitFor({ state: 'visible', timeout: 30_000 });
  }

  async fillNewCaseTitle(title: string): Promise<void> {
    await this.caseTitleInput.fill(title);
  }

  async fillNewCaseDescription(description: string): Promise<void> {
    await this.caseDescriptionInput.fill(description);
  }

  async submitCreateCase(): Promise<void> {
    await this.createCaseSubmit.click();
  }

  async clickViewCaseFromToast(): Promise<void> {
    await this.viewCaseText.click();
  }

  async expectOsqueryAttachmentVisible(): Promise<void> {
    // eslint-disable-next-line playwright/no-nth-methods -- a case body may render multiple "attached Osquery results" entries when several queries are attached; first-match readiness is sufficient for the assertion
    const firstAttachment = this.osqueryAttachmentText.first();
    await expect(firstAttachment).toBeVisible({ timeout: 60_000 });
  }

  async expectTextInCaseBody(text: string): Promise<void> {
    // eslint-disable-next-line playwright/no-nth-methods -- multiple case-body elements may contain the same text (e.g. comment + activity log); first-match is sufficient for the visibility assertion
    await expect(this.page.getByText(text).first()).toBeVisible({ timeout: 60_000 });
  }

  async navigateToOsqueryApp(): Promise<void> {
    await this.page.gotoApp('osquery');
  }

  async navigateToHistory(): Promise<void> {
    await this.page.gotoApp('osquery/history');
  }

  getAddToCaseLocator(): Locator {
    return this.addToCaseLabel;
  }
}
