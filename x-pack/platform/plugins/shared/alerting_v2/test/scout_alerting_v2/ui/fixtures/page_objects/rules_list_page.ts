/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';

const RULES_LIST_PATH_SUFFIX = '/api/alerting/v2/rules';

/** Minimal shape for Playwright `waitForResponse` callbacks (avoid `@playwright/test` imports in platform tests). */
interface RulesListHttpResponse {
  ok(): boolean;
  request(): { method(): string };
  url(): string;
}

const isRulesListGetResponse = (
  response: RulesListHttpResponse,
  options: { requireOk?: boolean } = {}
): boolean => {
  const { requireOk = true } = options;
  if (response.request().method() !== 'GET') {
    return false;
  }
  if (requireOk && !response.ok()) {
    return false;
  }
  try {
    const { pathname } = new URL(response.url());
    return pathname.endsWith(RULES_LIST_PATH_SUFFIX);
  } catch {
    return false;
  }
};

const decodedFilterParam = (response: RulesListHttpResponse): string =>
  decodeURIComponent(new URL(response.url()).searchParams.get('filter') ?? '');

export class RulesListPage {
  constructor(private readonly page: ScoutPage) {}

  async goto() {
    await this.page.gotoApp('management/alertingV2/rules');
    await this.table().waitFor({ state: 'visible', timeout: 60_000 });
    await this.statusFilterButton().waitFor({ state: 'visible', timeout: 60_000 });
  }

  searchBar() {
    return this.page.testSubj.locator('rulesListSearchBar');
  }

  table() {
    return this.page.testSubj.locator('rulesListTable');
  }

  showingLabel() {
    return this.page.testSubj.locator('rulesListShowingLabel');
  }

  /** Status column badges (one per visible row). */
  enabledStatusBadges() {
    return this.page.testSubj.locator('ruleStatusEnabled');
  }

  disabledStatusBadges() {
    return this.page.testSubj.locator('ruleStatusDisabled');
  }

  ruleNameLink(ruleId: string) {
    return this.page.testSubj.locator(`ruleNameLink-${ruleId}`);
  }

  async search(text: string) {
    const trimmed = text.trim();
    const responsePromise = this.page.waitForResponse(
      (response) => {
        // Do not require 2xx: some search strings can yield 400 while the request still settles.
        if (!isRulesListGetResponse(response, { requireOk: false })) {
          return false;
        }
        const params = new URL(response.url()).searchParams;
        const searchParam = params.get('search');
        if (trimmed.length === 0) {
          return searchParam === null || searchParam === '';
        }
        return searchParam === trimmed;
      },
      { timeout: 30_000 }
    );
    await this.searchBar().fill(text);
    await responsePromise;
    await this.page.waitForLoadingIndicatorHidden();
  }

  async clearSearch() {
    const responsePromise = this.page.waitForResponse(
      (response) => {
        if (!isRulesListGetResponse(response, { requireOk: false })) {
          return false;
        }
        const searchParam = new URL(response.url()).searchParams.get('search');
        return searchParam === null || searchParam === '';
      },
      { timeout: 30_000 }
    );
    await this.searchBar().fill('');
    await responsePromise;
    await this.page.waitForLoadingIndicatorHidden();
  }

  statusFilterButton() {
    return this.page.testSubj.locator('rulesListStatusFilter');
  }

  statusFilterOption(value: 'true' | 'false') {
    return this.page.testSubj.locator(`rulesListStatusFilterOption-${value}`);
  }

  async selectStatusFilter(value: 'true' | 'false') {
    const enabledClause = value === 'true' ? 'enabled: true' : 'enabled: false';
    const responsePromise = this.page.waitForResponse(
      (response) =>
        isRulesListGetResponse(response) && decodedFilterParam(response).includes(enabledClause),
      { timeout: 30_000 }
    );
    await this.statusFilterButton().scrollIntoViewIfNeeded();
    await this.statusFilterButton().click();
    await this.statusFilterOption(value).click();
    await this.statusFilterButton().click();
    await responsePromise;
    await this.page.waitForLoadingIndicatorHidden();
  }

  async clearStatusFilter() {
    const responsePromise = this.page.waitForResponse(
      (response) =>
        isRulesListGetResponse(response) && !decodedFilterParam(response).includes('enabled:'),
      { timeout: 30_000 }
    );
    await this.statusFilterButton().scrollIntoViewIfNeeded();
    await this.statusFilterButton().click();
    const checkedOption = this.page.locator(
      '[data-test-subj^="rulesListStatusFilterOption-"][aria-checked="true"]'
    );
    if ((await checkedOption.count()) > 0) {
      await checkedOption.click();
    }
    await this.statusFilterButton().click();
    await responsePromise;
    await this.page.waitForLoadingIndicatorHidden();
  }

  modeFilterButton() {
    return this.page.testSubj.locator('rulesListModeFilter');
  }

  modeFilterOption(value: 'alert' | 'signal') {
    return this.page.testSubj.locator(`rulesListModeFilterOption-${value}`);
  }

  async selectModeFilter(value: 'alert' | 'signal') {
    const kindClause = value === 'alert' ? 'kind: alert' : 'kind: signal';
    const responsePromise = this.page.waitForResponse(
      (response) =>
        isRulesListGetResponse(response) && decodedFilterParam(response).includes(kindClause),
      { timeout: 30_000 }
    );
    await this.modeFilterButton().scrollIntoViewIfNeeded();
    await this.modeFilterButton().click();
    await this.modeFilterOption(value).click();
    await this.modeFilterButton().click();
    await responsePromise;
    await this.page.waitForLoadingIndicatorHidden();
  }

  async clearModeFilter() {
    const responsePromise = this.page.waitForResponse(
      (response) =>
        isRulesListGetResponse(response) && !decodedFilterParam(response).includes('kind:'),
      { timeout: 30_000 }
    );
    await this.modeFilterButton().scrollIntoViewIfNeeded();
    await this.modeFilterButton().click();
    const checkedOption = this.page.locator(
      '[data-test-subj^="rulesListModeFilterOption-"][aria-checked="true"]'
    );
    if ((await checkedOption.count()) > 0) {
      await checkedOption.click();
    }
    await this.modeFilterButton().click();
    await responsePromise;
    await this.page.waitForLoadingIndicatorHidden();
  }

  tagsFilterButton() {
    return this.page.testSubj.locator('rulesListTagsFilter');
  }

  tagFilterOption(tag: string) {
    return this.page.testSubj.locator(`rulesListTagsFilterOption-${tag}`);
  }

  async selectTagFilter(tag: string) {
    const responsePromise = this.page.waitForResponse(
      (response) => {
        if (!isRulesListGetResponse(response)) {
          return false;
        }
        const filter = decodedFilterParam(response);
        return filter.includes('metadata.labels') && filter.includes(tag);
      },
      { timeout: 30_000 }
    );
    await this.tagsFilterButton().scrollIntoViewIfNeeded();
    await this.tagsFilterButton().click();
    await this.tagFilterOption(tag).click();
    await this.tagsFilterButton().click();
    await responsePromise;
    await this.page.waitForLoadingIndicatorHidden();
  }

  async selectTagFilters(filterTags: string[]) {
    const responsePromise = this.page.waitForResponse(
      (response) => {
        if (!isRulesListGetResponse(response)) {
          return false;
        }
        const filter = decodedFilterParam(response);
        if (!filter.includes('metadata.labels')) {
          return false;
        }
        return filterTags.every((tag) => filter.includes(tag));
      },
      { timeout: 30_000 }
    );
    await this.tagsFilterButton().scrollIntoViewIfNeeded();
    await this.tagsFilterButton().click();
    for (const tag of filterTags) {
      await this.tagFilterOption(tag).click();
    }
    await this.tagsFilterButton().click();
    await responsePromise;
    await this.page.waitForLoadingIndicatorHidden();
  }

  async clearTagFilters() {
    const responsePromise = this.page.waitForResponse(
      (response) =>
        isRulesListGetResponse(response) &&
        !decodedFilterParam(response).includes('metadata.labels'),
      { timeout: 30_000 }
    );
    await this.tagsFilterButton().scrollIntoViewIfNeeded();
    await this.tagsFilterButton().click();
    const checkedOptions = this.page.locator(
      '[data-test-subj^="rulesListTagsFilterOption-"][aria-checked="true"]'
    );
    /* eslint-disable playwright/no-nth-methods -- After each toggle, EuiSelectable updates the list; always clearing index 0 removes the next remaining selection. */
    while ((await checkedOptions.count()) > 0) {
      await checkedOptions.nth(0).click();
    }
    /* eslint-enable playwright/no-nth-methods */
    await this.tagsFilterButton().click();
    await responsePromise;
    await this.page.waitForLoadingIndicatorHidden();
  }

  async getVisibleRuleNames(): Promise<string[]> {
    const rows = this.page.locator('[data-test-subj^="ruleNameLink-"]');
    return rows.allTextContents();
  }

  async getVisibleRuleCount(): Promise<number> {
    const rows = this.page.locator('[data-test-subj^="ruleNameLink-"]');
    return rows.count();
  }
}
