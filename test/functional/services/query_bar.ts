/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { FtrService } from '../ftr_provider_context';

export class QueryBarService extends FtrService {
  private readonly testSubjects = this.ctx.getService('testSubjects');
  private readonly retry = this.ctx.getService('retry');
  private readonly log = this.ctx.getService('log');
  private readonly common = this.ctx.getPageObject('common');
  private readonly header = this.ctx.getPageObject('header');
  private readonly find = this.ctx.getService('find');
  private readonly browser = this.ctx.getService('browser');

  async getQueryString(): Promise<string> {
    return await this.testSubjects.getAttribute('queryInput', 'value');
  }

  public async setQuery(query: string): Promise<void> {
    this.log.debug(`QueryBar.setQuery(${query})`);
    // Extra caution used because of flaky test here: https://github.com/elastic/kibana/issues/16978 doesn't seem
    // to be actually setting the query in the query input based off
    await this.retry.try(async () => {
      await this.testSubjects.click('queryInput');

      // this.testSubjects.setValue uses input.clearValue which wasn't working, but input.clearValueWithKeyboard does.
      // So the following lines do the same thing as input.setValue but with input.clearValueWithKeyboard instead.
      const input = await this.find.activeElement();
      await input.clearValueWithKeyboard();
      await input.type(query);
      const currentQuery = await this.getQueryString();
      if (currentQuery !== query) {
        throw new Error(`Failed to set query input to ${query}, instead query is ${currentQuery}`);
      }
    });
  }

  public async clearQuery(): Promise<void> {
    await this.setQuery('');
    await this.common.pressTabKey(); // move outside of input into language switcher
    await this.common.pressTabKey(); // move outside of language switcher so time picker appears
  }

  public async submitQuery(): Promise<void> {
    this.log.debug('QueryBar.submitQuery');
    await this.testSubjects.click('queryInput');
    await this.common.pressEnterKey();
    await this.header.waitUntilLoadingHasFinished();
  }

  public async clickQuerySubmitButton(): Promise<void> {
    await this.testSubjects.click('querySubmitButton');
  }

  public async switchQueryLanguage(lang: 'kql' | 'lucene'): Promise<void> {
    await this.testSubjects.click('switchQueryLanguageButton');
    const kqlToggle = await this.testSubjects.find('languageToggle');
    const currentLang =
      (await kqlToggle.getAttribute('aria-checked')) === 'true' ? 'kql' : 'lucene';
    if (lang !== currentLang) {
      await kqlToggle.click();
    }

    await this.browser.pressKeys(this.browser.keys.ESCAPE); // close popover
    await this.expectQueryLanguageOrFail(lang); // make sure lang is switched
  }

  public async expectQueryLanguageOrFail(lang: 'kql' | 'lucene'): Promise<void> {
    const queryLanguageButton = await this.testSubjects.find('switchQueryLanguageButton');
    expect((await queryLanguageButton.getVisibleText()).toLowerCase()).to.eql(lang);
  }

  /**
   * Returns the currently shown suggestions texts of the query bar. Since there is no loading
   * indicator to wait for to validate if suggestion loading is done, this method is private
   * and should not be used in tests. Instead {@link #expectSuggestions} should be used, which
   * properly waits for the expected suggestions.
   */
  private async getSuggestions() {
    const suggestions = await this.testSubjects.findAll('autoCompleteSuggestionText');
    return Promise.all(suggestions.map((suggestion) => suggestion.getVisibleText()));
  }

  public async expectSuggestions({ count, contains }: { count: number; contains?: string }) {
    await this.retry.try(async () => {
      const suggestions = await this.getSuggestions();
      expect(suggestions.length).to.be(count);
      if (contains) {
        expect(suggestions).to.contain(contains);
      }
    });
  }
}
