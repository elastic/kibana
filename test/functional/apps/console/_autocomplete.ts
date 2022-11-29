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
  const PageObjects = getPageObjects(['common', 'console']);
  const find = getService('find');

  describe('console autocomplete feature', function describeIndexTests() {
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

    describe('with aggregation templates', async () => {
      const AGGREGATION_TEMPLATES = [
        {
          prompt: 'geoti',
          aggregation: 'geotile_grid',
        },
        {
          prompt: 'geoha',
          aggregation: 'geohash_grid',
        },
        {
          prompt: 'geohe',
          aggregation: 'geohex_grid',
        },
      ];
      beforeEach(async () => {
        await PageObjects.console.clearTextArea();
        await PageObjects.console.enterRequest('\n POST _search');
        await PageObjects.console.pressEnter();
      });

      it('should autocomplete the aggregation template', async () => {
        await PageObjects.console.enterText(`{\n\t`);
        await PageObjects.console.promptAutocomplete('ag');
        await retry.waitFor('autocomplete to be visible', () =>
          PageObjects.console.isAutocompleteVisible()
        );
        await PageObjects.console.pressEnter();
        await retry.try(async () => {
          const request = await PageObjects.console.getRequest();
          log.debug(request);
          expect(request).to.contain(`AGG_TYPE`);
        });
      });

      await asyncForEach(AGGREGATION_TEMPLATES, async ({ prompt, aggregation }) => {
        it('should autocomplete template for aggregation types', async () => {
          await PageObjects.console.enterText(`{\n\t"aggs": {\n\t"foo": {\n\t`);
          await PageObjects.console.promptAutocomplete(prompt);
          await retry.waitFor('autocomplete to be visible', () =>
            PageObjects.console.isAutocompleteVisible()
          );
          await PageObjects.console.pressEnter();
          await retry.try(async () => {
            const request = await PageObjects.console.getRequestAtLine(5);
            log.debug(request);
            expect(request).to.contain(aggregation);
          });
        });
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
  });
}
