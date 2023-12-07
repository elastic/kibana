/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import _ from 'lodash';
import expect from '@kbn/expect';
import { asyncForEach } from '@kbn/std';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const log = getService('log');
  const retry = getService('retry');
  const PageObjects = getPageObjects(['common', 'console', 'header']);
  const find = getService('find');

  describe('console autocomplete feature', function describeIndexTests() {
    this.tags('includeFirefox');
    before(async () => {
      log.debug('navigateTo console');
      await PageObjects.common.navigateToApp('console');
      // Ensure that the text area can be interacted with
      await PageObjects.console.closeHelpIfExists();
      await PageObjects.console.clearTextArea();
      log.debug('setAutocompleteTrace true');
      await PageObjects.console.setAutocompleteTrace(true);
    });

    after(async () => {
      log.debug('setAutocompleteTrace false');
      await PageObjects.console.setAutocompleteTrace(false);
    });

    it('should provide basic auto-complete functionality', async () => {
      await PageObjects.console.enterRequest();
      await PageObjects.console.pressEnter();
      await PageObjects.console.enterText(`{\n\t"query": {`);
      await PageObjects.console.pressEnter();
      await PageObjects.console.sleepForDebouncePeriod();
      await PageObjects.console.promptAutocomplete();
      expect(PageObjects.console.isAutocompleteVisible()).to.be.eql(true);
    });

    // FLAKY: https://github.com/elastic/kibana/issues/165465
    describe.skip('Autocomplete behavior', () => {
      beforeEach(async () => {
        await PageObjects.console.clearTextArea();
        await PageObjects.console.pressEnter();
      });

      it('HTTP methods', async () => {
        const suggestions = {
          G: ['GET'],
          P: ['PUT', 'POST', 'PATCH'],
          D: ['DELETE'],
          H: ['HEAD'],
        };
        for (const [char, methods] of Object.entries(suggestions)) {
          await PageObjects.console.sleepForDebouncePeriod();
          log.debug('Key type "%s"', char);
          await PageObjects.console.enterText(char);

          await retry.waitFor('autocomplete to be visible', () =>
            PageObjects.console.isAutocompleteVisible()
          );
          expect(await PageObjects.console.isAutocompleteVisible()).to.be.eql(true);

          for (const [i, method] of methods.entries()) {
            expect(await PageObjects.console.getAutocompleteSuggestion(i)).to.be.eql(method);
          }

          await PageObjects.console.pressEscape();
          await PageObjects.console.pressEnter();
        }
      });

      it('ES API endpoints', async () => {
        const suggestions = {
          'GET _': ['_alias', '_all'],
          'PUT _': ['_all'],
          'POST _': ['_aliases', '_all'],
          'DELETE _': ['_all'],
          'HEAD _': ['_alias', '_all'],
        };
        for (const [text, endpoints] of Object.entries(suggestions)) {
          for (const char of text) {
            await PageObjects.console.sleepForDebouncePeriod();
            log.debug('Key type "%s"', char);
            await PageObjects.console.enterText(char);
          }

          await retry.waitFor('autocomplete to be visible', () =>
            PageObjects.console.isAutocompleteVisible()
          );
          expect(await PageObjects.console.isAutocompleteVisible()).to.be.eql(true);

          for (const [i, endpoint] of endpoints.entries()) {
            expect(await PageObjects.console.getAutocompleteSuggestion(i)).to.be.eql(endpoint);
          }

          await PageObjects.console.pressEscape();
          await PageObjects.console.pressEnter();
        }
      });

      it('JSON autocompletion with placeholder fields', async () => {
        await PageObjects.console.enterText('GET _search\n{');
        await PageObjects.console.pressEnter();

        for (const char of '"ag') {
          await PageObjects.console.sleepForDebouncePeriod();
          log.debug('Key type "%s"', char);
          await PageObjects.console.enterText(char);
        }
        await retry.waitFor('autocomplete to be visible', () =>
          PageObjects.console.isAutocompleteVisible()
        );
        expect(await PageObjects.console.isAutocompleteVisible()).to.be.eql(true);
        await PageObjects.console.pressEnter();
        await PageObjects.console.sleepForDebouncePeriod();

        expect(await PageObjects.console.getAllVisibleText()).to.be.eql(
          `
GET _search
{
  "aggs": {
    "NAME": {
      "AGG_TYPE": {}
    }
  }
}
`.replace(/\n/g, '')
        );
        // cursor should be located between '"' and 'N'
        expect(await PageObjects.console.getCurrentLineNumber()).to.be.eql(5);

        await PageObjects.console.pressDown();
        await PageObjects.console.pressRight();
        await PageObjects.console.pressRight();
        for (let i = 0; i < 8; i++) {
          await PageObjects.console.pressRight(true); // select 'AGG_TYPE'
        }

        for (const char of 'ter') {
          await PageObjects.console.sleepForDebouncePeriod();
          log.debug('Key type "%s"', char);
          await PageObjects.console.enterText(char);
        }
        await retry.waitFor('autocomplete to be visible', () =>
          PageObjects.console.isAutocompleteVisible()
        );
        expect(await PageObjects.console.isAutocompleteVisible()).to.be.eql(true);
        await PageObjects.console.pressEnter();
        await PageObjects.console.sleepForDebouncePeriod();

        expect(await PageObjects.console.getAllVisibleText()).to.be.eql(
          `
GET _search
{
  "aggs": {
    "NAME": {
      "terms": {
        "field": ""
      }
    }
  }
}
`.replace(/\n/g, '')
        );
      });

      it('Dynamic autocomplete', async () => {
        await PageObjects.console.enterRequest('POST test/_doc\n{}');
        await PageObjects.console.clickPlay();

        await PageObjects.header.waitUntilLoadingHasFinished();
        expect(await PageObjects.console.getResponseStatus()).to.be('201');

        await PageObjects.console.pressEnter();
        for (const char of 'POST t') {
          await PageObjects.console.sleepForDebouncePeriod();
          log.debug('Key type "%s"', char);
          await PageObjects.console.enterText(char);
        }
        await retry.waitFor('autocomplete to be visible', () =>
          PageObjects.console.isAutocompleteVisible()
        );
        expect(await PageObjects.console.isAutocompleteVisible()).to.be.eql(true);

        expect(await PageObjects.console.getAutocompleteSuggestion(0)).to.be.eql('test');
      });
    });

    // FLAKY: https://github.com/elastic/kibana/issues/164584
    describe.skip('anti-regression watchdogs', () => {
      beforeEach(async () => {
        await PageObjects.console.clearTextArea();
      });

      it('should suppress auto-complete on arrow keys', async () => {
        await PageObjects.console.enterRequest();
        await PageObjects.console.enterRequest();
        await PageObjects.console.pressEnter();
        const keyPresses = [
          'pressUp',
          'pressUp',
          'pressDown',
          'pressDown',
          'pressRight',
          'pressRight',
          'pressLeft',
          'pressLeft',
        ] as const;
        for (const keyPress of keyPresses) {
          await PageObjects.console.sleepForDebouncePeriod();
          log.debug('Key', keyPress);
          await PageObjects.console[keyPress]();
          expect(await PageObjects.console.isAutocompleteVisible()).to.be.eql(false);
        }
      });

      it('should activate auto-complete for methods case-insensitively', async () => {
        const methods = _.sampleSize(
          _.compact(
            `
            GET GEt GeT Get gET gEt geT get
            PUT PUt PuT Put pUT pUt puT put
            POST POSt POsT POst PoST PoSt PosT Post pOST pOSt pOsT pOst poST poSt posT post
            DELETE DELETe DELEtE DELEte DELeTE DELeTe DELetE DELete DElETE DElETe DElEtE DElEte DEleTE DEleTe DEletE DElete
            DeLETE DeLETe DeLEtE DeLEte DeLeTE DeLeTe DeLetE DeLete DelETE DelETe DelEtE DelEte DeleTE DeleTe DeletE Delete
            dELETE dELETe dELEtE dELEte dELeTE dELeTe dELetE dELete dElETE dElETe dElEtE dElEte dEleTE dEleTe dEletE dElete
            deLETE deLETe deLEtE deLEte deLeTE deLeTe deLetE deLete delETE delETe delEtE delEte deleTE deleTe deletE delete
            HEAD HEAd HEaD HEad HeAD HeAd HeaD Head hEAD hEAd hEaD hEad heAD heAd heaD head
            PATCH PATCh PATcH PATch PAtCH PAtCh PAtcH PAtch PaTCH PaTCh PaTcH PaTch PatCH PatCh PatcH Patch pATCH pATCh pATcH
            pATch pAtCH pAtCh pAtcH pAtch paTCH paTCh paTcH paTch patCH patCh patcH patch
            `.split(/\s+/m)
          ),
          20 // 20 of 112 (approx. one-fifth) should be enough for testing
        );

        for (const method of methods) {
          await PageObjects.console.clearTextArea();

          for (const char of method.slice(0, -1)) {
            await PageObjects.console.sleepForDebouncePeriod();
            log.debug('Key type "%s"', char);
            await PageObjects.console.enterText(char); // e.g. 'P' -> 'Po' -> 'Pos'
            await retry.waitFor('autocomplete to be visible', () =>
              PageObjects.console.isAutocompleteVisible()
            );
            expect(await PageObjects.console.isAutocompleteVisible()).to.be.eql(true);
          }

          for (const char of [method.at(-1), ' ', '_']) {
            await PageObjects.console.sleepForDebouncePeriod();
            log.debug('Key type "%s"', char);
            await PageObjects.console.enterText(char!); // e.g. 'Post ' -> 'Post _'
          }

          await retry.waitFor('autocomplete to be visible', () =>
            PageObjects.console.isAutocompleteVisible()
          );
          expect(await PageObjects.console.isAutocompleteVisible()).to.be.eql(true);
        }
      });

      it('should activate auto-complete for a single character immediately following a slash in URL', async () => {
        await PageObjects.console.enterText('GET .kibana');

        for (const char of ['/', '_']) {
          await PageObjects.console.sleepForDebouncePeriod();
          log.debug('Key type "%s"', char);
          await PageObjects.console.enterText(char); // i.e. 'GET .kibana/' -> 'GET .kibana/_'
        }

        await retry.waitFor('autocomplete to be visible', () =>
          PageObjects.console.isAutocompleteVisible()
        );
        expect(await PageObjects.console.isAutocompleteVisible()).to.be.eql(true);
      });

      it('should activate auto-complete for multiple indices after comma in URL', async () => {
        await PageObjects.console.enterText('GET /_cat/indices/.kibana');

        await PageObjects.console.sleepForDebouncePeriod();
        log.debug('Key type ","');
        await PageObjects.console.enterText(','); // i.e. 'GET /_cat/indices/.kibana,'

        await PageObjects.console.sleepForDebouncePeriod();
        log.debug('Key type Ctrl+SPACE');
        await PageObjects.console.pressCtrlSpace();

        await retry.waitFor('autocomplete to be visible', () =>
          PageObjects.console.isAutocompleteVisible()
        );
        expect(await PageObjects.console.isAutocompleteVisible()).to.be.eql(true);
      });

      it('should not activate auto-complete after comma following endpoint in URL', async () => {
        await PageObjects.console.enterText('GET _search');

        await PageObjects.console.sleepForDebouncePeriod();
        log.debug('Key type ","');
        await PageObjects.console.enterText(','); // i.e. 'GET _search,'

        await PageObjects.console.sleepForDebouncePeriod();
        log.debug('Key type Ctrl+SPACE');
        await PageObjects.console.pressCtrlSpace();

        expect(await PageObjects.console.isAutocompleteVisible()).to.be.eql(false);
      });
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
        await PageObjects.console.sleepForDebouncePeriod();
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
        await PageObjects.console.sleepForDebouncePeriod();
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
          await PageObjects.console.sleepForDebouncePeriod();
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
