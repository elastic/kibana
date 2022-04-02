/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const log = getService('log');
  const PageObjects = getPageObjects(['common', 'console']);
  const retry = getService('retry');

  describe('console autocomplete feature', function describeIndexTests() {
    this.tags('includeFirefox');
    before(async () => {
      log.debug('navigateTo console');
      await PageObjects.common.navigateToApp('console');
      // Ensure that the text area can be interacted with
      await PageObjects.console.dismissTutorial();
      await PageObjects.console.clearTextArea();
    });

    it('should provide basic auto-complete functionality', async () => {
      await PageObjects.console.enterRequest();
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
      });
      it('should add a comma after previous non empty line', async () => {
        await PageObjects.console.enterText(`{\n\t"query": {\n\t\t"match": {}`);
        await PageObjects.console.pressEnter();
        await PageObjects.console.pressEnter();
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
  });
}
