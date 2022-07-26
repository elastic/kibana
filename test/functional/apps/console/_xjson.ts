/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default ({ getService, getPageObjects }: FtrProviderContext) => {
  const retry = getService('retry');
  const log = getService('log');
  const PageObjects = getPageObjects(['common', 'console', 'header']);

  describe("Console's XJSON features", function testXjson() {
    this.tags('includeFirefox');
    before(async () => {
      log.debug('navigateTo console');
      await PageObjects.common.navigateToApp('console');
      await retry.try(async () => {
        await PageObjects.console.collapseHelp();
      });
    });

    beforeEach(async () => {
      await PageObjects.console.clearTextArea();
    });

    describe('with triple quoted strings', () => {
      it('should allow escaping quotation mark by wrapping it in triple quotes', async () => {
        await PageObjects.console.enterRequest(
          '\nPOST test/_doc/1 \n{\n "foo": """look "escaped" quotes"""'
        );
        await PageObjects.console.clickPlay();
        await PageObjects.header.waitUntilLoadingHasFinished();
        expect(await PageObjects.console.hasErrorMarker()).to.be(false);
      });
    });

    describe('with invalid syntax', () => {
      it('should trigger validation errors', async () => {
        await PageObjects.console.enterRequest('\nGET test/doc/1 \n{\n "foo": \'\'');
        expect(await PageObjects.console.hasInvalidSyntax()).to.be(true);
        expect(await PageObjects.console.hasErrorMarker()).to.be(true);
      });
    });
  });
};
