/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../ftr_provider_context';

export function QueryBarProvider({ getService, getPageObjects }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const log = getService('log');
  const PageObjects = getPageObjects(['header', 'common']);
  const find = getService('find');
  const browser = getService('browser');

  class QueryBar {
    async getQueryString(): Promise<string> {
      return await testSubjects.getAttribute('queryInput', 'value');
    }

    public async setQuery(query: string): Promise<void> {
      log.debug(`QueryBar.setQuery(${query})`);
      // Extra caution used because of flaky test here: https://github.com/elastic/kibana/issues/16978 doesn't seem
      // to be actually setting the query in the query input based off
      await retry.try(async () => {
        await testSubjects.click('queryInput');

        // testSubjects.setValue uses input.clearValue which wasn't working, but input.clearValueWithKeyboard does.
        // So the following lines do the same thing as input.setValue but with input.clearValueWithKeyboard instead.
        const input = await find.activeElement();
        await input.clearValueWithKeyboard();
        await input.type(query);
        const currentQuery = await this.getQueryString();
        if (currentQuery !== query) {
          throw new Error(
            `Failed to set query input to ${query}, instead query is ${currentQuery}`
          );
        }
      });
    }

    public async clearQuery(): Promise<void> {
      await this.setQuery('');
      await PageObjects.common.pressTabKey();
    }

    public async submitQuery(): Promise<void> {
      log.debug('QueryBar.submitQuery');
      await testSubjects.click('queryInput');
      await PageObjects.common.pressEnterKey();
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    public async clickQuerySubmitButton(): Promise<void> {
      await testSubjects.click('querySubmitButton');
    }

    public async switchQueryLanguage(lang: 'kql' | 'lucene'): Promise<void> {
      await testSubjects.click('switchQueryLanguageButton');
      const kqlToggle = await testSubjects.find('languageToggle');
      const currentLang =
        (await kqlToggle.getAttribute('aria-checked')) === 'true' ? 'kql' : 'lucene';
      if (lang !== currentLang) {
        await kqlToggle.click();
      }

      await browser.pressKeys(browser.keys.ESCAPE); // close popover
      await this.expectQueryLanguageOrFail(lang); // make sure lang is switched
    }

    public async expectQueryLanguageOrFail(lang: 'kql' | 'lucene'): Promise<void> {
      const queryLanguageButton = await testSubjects.find('switchQueryLanguageButton');
      expect((await queryLanguageButton.getVisibleText()).toLowerCase()).to.eql(lang);
    }

    public async getSuggestions() {
      const suggestions = await testSubjects.findAll('autoCompleteSuggestionText');
      return Promise.all(suggestions.map((suggestion) => suggestion.getVisibleText()));
    }
  }

  return new QueryBar();
}
