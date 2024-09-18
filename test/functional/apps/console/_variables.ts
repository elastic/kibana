/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default ({ getService, getPageObjects }: FtrProviderContext) => {
  const retry = getService('retry');
  const log = getService('log');
  const PageObjects = getPageObjects(['common', 'console', 'header']);

  // Failing: See https://github.com/elastic/kibana/issues/157776
  describe.skip('Console variables', function testConsoleVariables() {
    this.tags('includeFirefox');

    before(async () => {
      log.debug('navigateTo console');
      await PageObjects.common.navigateToApp('console');
      await PageObjects.console.skipTourIfExists();
      await PageObjects.console.clearEditorText();
    });

    it('should allow creating a new variable', async () => {
      await PageObjects.console.openConfig();

      await PageObjects.console.addNewVariable({ name: 'index1', value: 'test' });

      const variables = await PageObjects.console.getVariables();
      log.debug(variables);
      const variableNames = variables.map((variable) => variable.name);
      expect(variableNames).to.contain('${index1}');
    });

    it('should allow removing a variable', async () => {
      await PageObjects.console.openConfig();

      await PageObjects.console.addNewVariable({ name: 'index2', value: 'test' });
      await PageObjects.console.removeVariables();

      const variables = await PageObjects.console.getVariables();
      log.debug(variables);
      expect(variables).to.eql([]);
    });

    describe('with variables in url', () => {
      it('should send a successful request', async () => {
        await PageObjects.console.openConfig();
        await PageObjects.console.addNewVariable({ name: 'index3', value: '_search' });
        await PageObjects.console.openConsole();

        await PageObjects.console.clickClearInput();
        await PageObjects.console.enterText('\n GET ${index3}');
        await PageObjects.console.clickPlay();
        await PageObjects.header.waitUntilLoadingHasFinished();

        await retry.try(async () => {
          const status = await PageObjects.console.getResponseStatus();
          expect(status).to.eql(200);
        });
      });
    });

    // Flaky: https://github.com/elastic/kibana/issues/157776
    // Beware that this test will pass locally and in flaky test runner, but it
    // will fail after merged.
    describe.skip('with variables in request body', () => {
      it('should send a successful request', async () => {
        await PageObjects.console.openConfig();
        await PageObjects.console.addNewVariable({ name: 'query1', value: '{"match_all": {}}' });
        await PageObjects.console.openConsole();
        await PageObjects.console.clickClearInput();
        await PageObjects.console.enterText('\n GET _search\n');
        await PageObjects.console.enterText(`{\n\t"query": "\${query1}"`);
        await PageObjects.console.clickPlay();
        await PageObjects.header.waitUntilLoadingHasFinished();

        await retry.try(async () => {
          const status = await PageObjects.console.getResponseStatus();
          expect(status).to.eql(200);
        });
      });
    });
  });
};
