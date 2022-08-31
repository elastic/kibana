/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { asyncForEach } from '@kbn/std';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const log = getService('log');
  const retry = getService('retry');
  const PageObjects = getPageObjects(['common', 'console', 'header']);
  const find = getService('find');

  describe("Console's autocomplete", function describeIndexTests() {
    this.tags('includeFirefox');
    before(async () => {
      log.debug('navigateTo console');
      await PageObjects.common.navigateToApp('console');
      // Ensure that the text area can be interacted with
      await PageObjects.console.closeHelpIfExists();
      await PageObjects.console.clearTextArea();
    });

    it('should provide basic auto-complete functionality', async () => {
      await PageObjects.console.enterRequest();
      await PageObjects.console.pressEnter();
      await PageObjects.console.enterText(`{\n\t"query": {`);
      await PageObjects.console.pressEnter();
      await PageObjects.console.promptAutocomplete();
      expect(PageObjects.console.isAutocompleteVisible()).to.be.eql(true);
    });

    describe('with a missing comma in query', () => {
      const LINE_NUMBER = 4;
      beforeEach(async () => {
        await PageObjects.console.clearTextArea();
        await PageObjects.console.enterRequest();
        await PageObjects.console.pressEnter();
      });

      it('should add a comma after previous non empty line', async () => {
        await PageObjects.console.enterText(`{\n\t"query": {\n\t\t"match": {}`);
        await PageObjects.console.pressEnter();
        await PageObjects.console.pressEnter();
        await PageObjects.console.pressEnter();
        await PageObjects.console.promptAutocomplete();
        await PageObjects.console.pressEnter();
        await retry.try(async () => {
          let conApp = await find.byCssSelector('.conApp');
          const firstInnerHtml = await conApp.getAttribute('innerHTML');
          await PageObjects.common.sleep(500);
          conApp = await find.byCssSelector('.conApp');
          const secondInnerHtml = await conApp.getAttribute('innerHTML');
          return firstInnerHtml === secondInnerHtml;
        });
        const textAreaString = await PageObjects.console.getAllVisibleText();
        log.debug('Text Area String Value==================\n');
        log.debug(textAreaString);
        expect(textAreaString).to.contain(',');
        const text = await PageObjects.console.getVisibleTextAt(LINE_NUMBER);
        const lastChar = text.charAt(text.length - 1);
        expect(lastChar).to.be.eql(',');
      });

      it('should add a comma after the triple quoted strings', async () => {
        await PageObjects.console.enterText(`{\n\t"query": {\n\t\t"term": """some data"""`);
        await PageObjects.console.pressEnter();
        await PageObjects.console.promptAutocomplete();
        await PageObjects.console.pressEnter();

        await retry.waitForWithTimeout('text area to contain comma', 25000, async () => {
          const textAreaString = await PageObjects.console.getAllVisibleText();
          return textAreaString.includes(',');
        });

        const text = await PageObjects.console.getVisibleTextAt(LINE_NUMBER);
        const lastChar = text.charAt(text.length - 1);
        expect(lastChar).to.be.eql(',');
      });
    });

    describe('with conditional templates', async () => {
      const CONDITIONAL_TEMPLATES = [
        {
          type: 'fs',
          template: `"location": "path"`,
        },
        {
          type: 'url',
          template: `"url": ""`,
        },
        { type: 's3', template: `"bucket": ""` },
        {
          type: 'azure',
          template: `"path": ""`,
        },
      ];

      beforeEach(async () => {
        await PageObjects.console.clearTextArea();
        await PageObjects.console.enterRequest('\n POST _snapshot/test_repo');
        await PageObjects.console.pressEnter();
      });

      await asyncForEach(CONDITIONAL_TEMPLATES, async ({ type, template }) => {
        it('should insert different templates depending on the value of type', async () => {
          await PageObjects.console.enterText(`{\n\t"type": "${type}"`);
          await PageObjects.console.pressEnter();
          // Prompt autocomplete for 'settings'
          await PageObjects.console.promptAutocomplete('s');

          await retry.waitFor('autocomplete to be visible', () =>
            PageObjects.console.isAutocompleteVisible()
          );
          await PageObjects.console.pressEnter();
          await retry.try(async () => {
            const request = await PageObjects.console.getRequest();
            log.debug(request);
            expect(request).to.contain(`${template}`);
          });
        });
      });
    });

    describe('Autocomplete behavior', () => {
      beforeEach(async () => {
        await PageObjects.console.clearTextArea();
      });

      it('should suggest HTTP methods POST, GET, etc', async () => {
        await PageObjects.console.triggerAutocomplete();
        await retry.waitFor('autocomplete to be visible', () =>
          PageObjects.console.isAutocompleteVisible()
        );
        await retry.waitFor('autocomplete to be visible', () =>
          PageObjects.console.isAutocompleteVisible()
        );
        expect(await PageObjects.console.getAutocompleteSuggestions()).to.eql([
          'GET',
          'PUT',
          'POST',
          'DELETE',
          'HEAD',
        ]);
      });

      it('should suggest ES API endpoints', async () => {
        await PageObjects.console.enterRequest('\nGET _cat');
        await PageObjects.console.triggerAutocomplete();
        const suggestions = await PageObjects.console.getAutocompleteSuggestions();
        expect(suggestions.sort()).to.be.eql([
          '_cat',
          '_cat/aliases',
          '_cat/allocation',
          '_cat/count',
          '_cat/fielddata',
          '_cat/health',
          '_cat/indices',
          '_cat/master',
        ]);
      });

      it('should suggest JSON autocompletion with placeholder fields', async () => {
        await PageObjects.console.enterRequest('\nGET _search\n {\n\t\t "');
        await PageObjects.console.promptAutocomplete('agg');
        await PageObjects.console.pressEnter();
        await PageObjects.console.moveMouseToText('AGG_TYPE');
        await PageObjects.console.enterText('term');
        await retry.waitFor('autocomplete to be visible', () =>
          PageObjects.console.isAutocompleteVisible()
        );
        expect(await PageObjects.console.getAutocompleteSuggestions()).to.eql([
          'terms',
          'date_histogram',
          'significant_terms',
        ]);

        await PageObjects.console.pressEnter();
        const request = await PageObjects.console.getRequest();
        expect(request).to.contain(
          `"terms": {\n             "field": "",\n             "size": 10\n           }`
        );
      });

      describe('with dynamic autocomplete', () => {
        const executeRequest = async (request: string) => {
          await PageObjects.console.enterRequest(request);
          await PageObjects.console.clickPlay();
          await PageObjects.header.waitUntilLoadingHasFinished();
        };

        it('should suggest indices that the user has created', async () => {
          // Create an index
          await executeRequest('\nPUT test_index');
          expect(await PageObjects.console.getResponse()).to.contain('acknowledged');

          await PageObjects.console.enterRequest('\nGET test_ind');
          await PageObjects.console.triggerAutocomplete();
          await retry.waitFor('autocomplete to be visible', () =>
            PageObjects.console.isAutocompleteVisible()
          );
          expect(await PageObjects.console.getAutocompleteSuggestions()).to.eql(['test_index']);

          // Delete the index
          await executeRequest('\nDELETE test_index');
          expect(await PageObjects.console.getResponse()).to.contain('acknowledged');
        });
      });
    });
  });
}
