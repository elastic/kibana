/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';
import { triggersActionsRoute } from '@kbn/rule-data-utils';
import type { KibanaUrl, Locator, ScoutPage } from '@kbn/scout';

export const CLASSIC_RULES_LIST_URL_RE = new RegExp(`${triggersActionsRoute}/?(?:\\?|#|$)`);
export const CLASSIC_RULES_LOGS_URL_RE = new RegExp(`${triggersActionsRoute}/logs(/|$|\\?|#)`);
export const CLASSIC_RULES_CREATE_URL_RE = new RegExp(`${triggersActionsRoute}/create/`);
export const CLASSIC_RULES_EDIT_URL_RE = new RegExp(`${triggersActionsRoute}/edit/`);
export const CLASSIC_RULES_DETAILS_URL_RE = new RegExp(`${triggersActionsRoute}/rule/[^/?#]+`);
/** Standalone `/app/rules` tree — host-aware v1 navigation must not land here. */
export const STANDALONE_RULES_APP_URL_RE = /\/app\/rules(\/|$|\?|#)/;
export const MANAGEMENT_ALERTING_V2_URL_RE = /\/app\/management\/alertingV2(\/|$|\?|#)/;

/**
 * Drives the classic (v1) Rules page on its Stack Management mount.
 * `goto` uses `domcontentloaded` so SPA bootstrap does not wait on `load`.
 */
export class ClassicRulesPage {
  public readonly pageTitle: Locator;
  public readonly backLink: Locator;
  public readonly rulesList: Locator;
  public readonly createButton: Locator;
  public readonly ruleTypeModal: Locator;
  public readonly esQueryRuleTypeOption: Locator;
  public readonly ruleForm: Locator;
  public readonly cancelButton: Locator;
  public readonly rulesTab: Locator;
  public readonly logsTab: Locator;
  public readonly searchField: Locator;

  constructor(private readonly page: ScoutPage) {
    this.pageTitle = this.page.testSubj.locator(APP_HEADER_TEST_SUBJECTS.title);
    this.backLink = this.page.testSubj.locator(APP_HEADER_TEST_SUBJECTS.back);
    this.rulesList = this.page.testSubj.locator('rulesList');
    this.createButton = this.page.testSubj.locator('createRuleButton');
    this.ruleTypeModal = this.page.testSubj.locator('ruleTypeModal');
    this.esQueryRuleTypeOption = this.page.testSubj.locator('.es-query-SelectOption');
    this.ruleForm = this.page.testSubj.locator('ruleForm');
    this.cancelButton = this.page.testSubj.locator('rulePageFooterCancelButton');
    this.rulesTab = this.page.testSubj.locator('rulesTab');
    this.logsTab = this.page.testSubj.locator('logsTab');
    this.searchField = this.page.testSubj.locator('ruleSearchField');
  }

  urlFor(kbnUrl: KibanaUrl, subPath = ''): string {
    return kbnUrl.get(`${triggersActionsRoute}${subPath}`);
  }

  async goto(kbnUrl: KibanaUrl, subPath = ''): Promise<string> {
    await this.page.goto(this.urlFor(kbnUrl, subPath), {
      waitUntil: 'domcontentloaded',
      timeout: 60_000,
    });
    return this.page.url();
  }

  ruleNameLink(ruleName: string): Locator {
    return this.page.testSubj.locator(`rulesListTableRowName-${ruleName}`);
  }

  async searchByName(ruleName: string): Promise<void> {
    await this.searchField.fill(ruleName);
    await this.searchField.press('Enter');
  }

  async openListAndSearch(kbnUrl: KibanaUrl, ruleName: string): Promise<void> {
    await this.goto(kbnUrl);
    await this.rulesTab.click();
    await this.rulesList.waitFor({ state: 'visible' });
    const clearFilters = this.page.testSubj.locator('rules-list-clear-filter');
    if (await clearFilters.isVisible()) {
      await clearFilters.click();
      await clearFilters.waitFor({ state: 'hidden' });
    }
    await this.searchByName(ruleName);
  }

  async clickRuleName(ruleName: string): Promise<void> {
    await this.ruleNameLink(ruleName).click();
    await this.page.waitForURL(CLASSIC_RULES_DETAILS_URL_RE);
  }

  async clickBack(): Promise<void> {
    await this.backLink.click();
    await this.page.waitForURL(CLASSIC_RULES_LIST_URL_RE);
  }

  async openCreateRuleTypeModal(): Promise<void> {
    await this.createButton.click();
    await this.ruleTypeModal.waitFor({ state: 'visible' });
  }

  async selectEsQueryRuleType(): Promise<void> {
    await this.esQueryRuleTypeOption.click();
    await this.page.waitForURL(CLASSIC_RULES_CREATE_URL_RE);
    await this.ruleForm.waitFor({ state: 'visible' });
  }

  async clickCancel(): Promise<void> {
    await this.cancelButton.click();
  }

  async clickLogsTab(): Promise<void> {
    await this.logsTab.click();
    await this.page.waitForURL(CLASSIC_RULES_LOGS_URL_RE);
  }

  async clickRulesTab(): Promise<void> {
    await this.rulesTab.click();
    await this.page.waitForURL(CLASSIC_RULES_LIST_URL_RE);
    await this.rulesList.waitFor({ state: 'visible' });
  }

  async openEditFromList(ruleId: string): Promise<void> {
    await this.page.testSubj.locator(`checkboxSelectRow-${ruleId}`).hover();
    await this.page.testSubj.click('editActionHoverButton');
    await this.page.waitForURL(CLASSIC_RULES_EDIT_URL_RE);
    await this.ruleForm.waitFor({ state: 'visible' });
  }
}
