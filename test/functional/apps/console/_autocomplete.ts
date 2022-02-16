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
  const retry = getService('retry');
  const log = getService('log');
  const PageObjects = getPageObjects(['common', 'console']);

  describe('console autocomplete feature', function describeIndexTests() {
    this.tags('includeFirefox');
    before(async () => {
      log.debug('navigateTo console');
      await PageObjects.common.navigateToApp('console');
      // Ensure that the text area can be interacted with
      await PageObjects.console.dismissTutorial();
    });

    it('should provide basic auto-complete functionality', async () => {
      expect(await PageObjects.console.hasAutocompleter()).to.be(false);
      await PageObjects.console.enterRequest();
      await PageObjects.console.promptAutocomplete();
      await retry.waitFor('autocomplete to be visible', () =>
        PageObjects.console.hasAutocompleter()
      );
    });

    it('should add comma after previous non empty line', async () => {
      const LINE_NUMBER = 2;

      await PageObjects.console.clearTextArea();
      await PageObjects.console.enterText(`{\n\t"query": {\n\t\t"match": {}`);
      await PageObjects.console.pressEnter();
      await PageObjects.console.pressEnter();
      await PageObjects.console.pressEnter();
      await PageObjects.console.promptAutocomplete();

      await retry.waitForWithTimeout('autocomplete to be visible', 2000, async () => {
        const attribute = await PageObjects.console.getAutocompleteAttribute('style');
        log.debug(attribute);
        expect(attribute).to.not.contain('display: none;');
        return true;
      });
      await PageObjects.console.pressEnter();

      await retry.try(async () => {
        const textOfPreviousNonEmptyLine = await PageObjects.console.getVisibleTextAt(LINE_NUMBER);
        log.debug(textOfPreviousNonEmptyLine);
        const lastChar = textOfPreviousNonEmptyLine.charAt(textOfPreviousNonEmptyLine.length - 1);
        expect(lastChar).to.be.eql(',');
      });
    });
  });
}
