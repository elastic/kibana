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
  const PageObjects = getPageObjects(['common', 'console', 'header']);

  describe.skip('Console variables', function testConsoleVariables() {
    this.tags('includeFirefox');
    before(async () => {
      log.debug('navigateTo console');
      await PageObjects.common.navigateToApp('console');
      await retry.try(async () => {
        await PageObjects.console.collapseHelp();
        await PageObjects.console.clearTextArea();
      });
    });

    it('should create a new variable', async function () {
      await PageObjects.console.addNewVariable('myIndex', 'test');
      await PageObjects.console.enterRequest('\n PUT ${myIndex}');
      await PageObjects.console.clickPlay();
      await PageObjects.header.waitUntilLoadingHasFinished();

      await retry.try(async () => {
        const response = await PageObjects.console.getResponse();
        log.debug(response);
        expect(response).to.contain('"acknowledged": true');
      });
    });
  });
}
