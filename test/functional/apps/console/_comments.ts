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

  describe('console app', function testComments() {
    this.tags('includeFirefox');
    before(async () => {
      log.debug('navigateTo console');
      await PageObjects.common.navigateToApp('console');
      // blocks the close help button for several seconds so just retry until we can click it.
      await retry.try(async () => {
        await PageObjects.console.collapseHelp();
      });
    });

    describe('with comments', async () => {
      const enterRequest = async (url: string, body: string) => {
        await PageObjects.console.clearTextArea();
        await PageObjects.console.enterRequest(url);
        await PageObjects.console.pressEnter();
        await PageObjects.console.enterText(body);
      };

      async function runTests(
        tests: Array<{ description: string; url?: string; body: string }>,
        fn: () => Promise<void>
      ) {
        await asyncForEach(tests, async ({ description, url, body }) => {
          it(description, async () => {
            await enterRequest(url ?? '\nGET search', body);
            await fn();
          });
        });
      }

      describe('with single line comments', async () => {
        await runTests(
          [
            {
              url: '\n// GET _search',
              body: '',
              description: 'should allow in request url, using //',
            },
            {
              body: '{\n\t\t"query": {\n\t\t\t// "match_all": {}',
              description: 'should allow in request body, using //',
            },
            {
              url: '\n # GET _search',
              body: '',
              description: 'should allow in request url, using #',
            },
            {
              body: '{\n\t\t"query": {\n\t\t\t# "match_all": {}',
              description: 'should allow in request body, using #',
            },
            {
              description: 'should accept as field names, using //',
              body: '{\n "//": {}',
            },
            {
              description: 'should accept as field values, using //',
              body: '{\n "f": "//"',
            },
            {
              description: 'should accept as field names, using #',
              body: '{\n "#": {}',
            },
            {
              description: 'should accept as field values, using #',
              body: '{\n "f": "#"',
            },
          ],
          async () => {
            expect(await PageObjects.console.hasInvalidSyntax()).to.be(false);
            expect(await PageObjects.console.hasErrorMarker()).to.be(false);
          }
        );
      });

      describe('with multiline comments', async () => {
        await runTests(
          [
            {
              url: '\n /* \nGET _search \n*/',
              body: '',
              description: 'should allow in request url, using /* */',
            },
            {
              body: '{\n\t\t"query": {\n\t\t\t/* "match_all": {} */',
              description: 'should allow in request body, using /* */',
            },
            {
              description: 'should accept as field names, using /*',
              body: '{\n "/*": {} \n\t\t /* "f": 1 */',
            },
            {
              description: 'should accept as field values, using */',
              body: '{\n /* "f": 1 */ \n"f": "*/"',
            },
          ],
          async () => {
            expect(await PageObjects.console.hasInvalidSyntax()).to.be(false);
            expect(await PageObjects.console.hasErrorMarker()).to.be(false);
          }
        );
      });

      describe('with invalid syntax in request body', async () => {
        await runTests(
          [
            {
              description: 'should highlight invalid syntax',
              body: '{\n "query": \'\'', // E.g. using single quotes
            },
          ],

          async () => {
            expect(await PageObjects.console.hasInvalidSyntax()).to.be(true);
          }
        );
      });

      describe('with invalid request', async () => {
        await runTests(
          [
            {
              description: 'with invalid character should display error marker',
              body: '{\n $ "query": {}',
            },
            {
              description: 'with missing field name',
              body: '{\n "query": {},\n {}',
            },
          ],
          async () => {
            expect(await PageObjects.console.hasErrorMarker()).to.be(true);
          }
        );
      });
    });
  });
}
