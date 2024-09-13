/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const log = getService('log');
  const retry = getService('retry');
  const PageObjects = getPageObjects(['common', 'console', 'header']);

  const enterRequest = async (url: string, body: string) => {
    await PageObjects.console.clearTextArea();
    await PageObjects.console.enterRequest(url);
    await PageObjects.console.pressEnter();
    await PageObjects.console.enterText(body);
  };

  async function runTest(input: { url?: string; body: string }, fn: () => Promise<void>) {
    await enterRequest(input.url ?? '\nGET search', input.body);
    await fn();
  }

  // Failing: See https://github.com/elastic/kibana/issues/138160
  describe.skip('console app', function testComments() {
    this.tags('includeFirefox');
    before(async () => {
      log.debug('navigateTo console');
      await PageObjects.common.navigateToApp('console');
      // blocks the close help button for several seconds so just retry until we can click it.
      await retry.try(async () => {
        await PageObjects.console.collapseHelp();
      });
    });

    describe('with comments', () => {
      describe('with single line comments', () => {
        it('should allow in request url, using //', async () => {
          await runTest(
            {
              url: '\n// GET _search',
              body: '',
            },
            async () => {
              expect(await PageObjects.console.hasInvalidSyntax()).to.be(false);
              expect(await PageObjects.console.hasErrorMarker()).to.be(false);
            }
          );
        });

        it('should allow in request body, using //', async () => {
          await runTest(
            {
              body: '{\n\t\t"query": {\n\t\t\t// "match_all": {}',
            },
            async () => {
              expect(await PageObjects.console.hasInvalidSyntax()).to.be(false);
              expect(await PageObjects.console.hasErrorMarker()).to.be(false);
            }
          );
        });

        it('should allow in request url, using #', async () => {
          await runTest(
            {
              url: '\n # GET _search',
              body: '',
            },
            async () => {
              expect(await PageObjects.console.hasInvalidSyntax()).to.be(false);
              expect(await PageObjects.console.hasErrorMarker()).to.be(false);
            }
          );
        });

        it('should allow in request body, using #', async () => {
          await runTest(
            {
              body: '{\n\t\t"query": {\n\t\t\t# "match_all": {}',
            },
            async () => {
              expect(await PageObjects.console.hasInvalidSyntax()).to.be(false);
              expect(await PageObjects.console.hasErrorMarker()).to.be(false);
            }
          );
        });

        it('should accept as field names, using //', async () => {
          await runTest(
            {
              body: '{\n "//": {}',
            },
            async () => {
              expect(await PageObjects.console.hasInvalidSyntax()).to.be(false);
              expect(await PageObjects.console.hasErrorMarker()).to.be(false);
            }
          );
        });

        it('should accept as field values, using //', async () => {
          await runTest(
            {
              body: '{\n "f": "//"',
            },
            async () => {
              expect(await PageObjects.console.hasInvalidSyntax()).to.be(false);
              expect(await PageObjects.console.hasErrorMarker()).to.be(false);
            }
          );
        });

        it('should accept as field names, using #', async () => {
          await runTest(
            {
              body: '{\n "#": {}',
            },
            async () => {
              expect(await PageObjects.console.hasInvalidSyntax()).to.be(false);
              expect(await PageObjects.console.hasErrorMarker()).to.be(false);
            }
          );
        });

        it('should accept as field values, using #', async () => {
          await runTest(
            {
              body: '{\n "f": "#"',
            },
            async () => {
              expect(await PageObjects.console.hasInvalidSyntax()).to.be(false);
              expect(await PageObjects.console.hasErrorMarker()).to.be(false);
            }
          );
        });
      });

      describe('with multiline comments', () => {
        it('should allow in request url, using /* */', async () => {
          await runTest(
            {
              url: '\n /* \nGET _search \n*/',
              body: '',
            },
            async () => {
              expect(await PageObjects.console.hasInvalidSyntax()).to.be(false);
              expect(await PageObjects.console.hasErrorMarker()).to.be(false);
            }
          );
        });

        it('should allow in request body, using /* */', async () => {
          await runTest(
            {
              body: '{\n\t\t"query": {\n\t\t\t/* "match_all": {} */',
            },
            async () => {
              expect(await PageObjects.console.hasInvalidSyntax()).to.be(false);
              expect(await PageObjects.console.hasErrorMarker()).to.be(false);
            }
          );
        });

        it('should accept as field names, using /*', async () => {
          await runTest(
            {
              body: '{\n "/*": {} \n\t\t /* "f": 1 */',
            },
            async () => {
              expect(await PageObjects.console.hasInvalidSyntax()).to.be(false);
              expect(await PageObjects.console.hasErrorMarker()).to.be(false);
            }
          );
        });

        it('should accept as field values, using */', async () => {
          await runTest(
            {
              body: '{\n /* "f": 1 */ \n"f": "*/"',
            },
            async () => {
              expect(await PageObjects.console.hasInvalidSyntax()).to.be(false);
              expect(await PageObjects.console.hasErrorMarker()).to.be(false);
            }
          );
        });
      });

      describe('with invalid syntax in request body', () => {
        it('should highlight invalid syntax', async () => {
          await runTest(
            {
              body: '{\n "query": \'\'', // E.g. using single quotes
            },
            async () => {
              expect(await PageObjects.console.hasInvalidSyntax()).to.be(true);
            }
          );
        });
      });

      describe('with invalid request', () => {
        it('with invalid character should display error marker', async () => {
          await runTest(
            {
              body: '{\n $ "query": {}',
            },
            async () => {
              expect(await PageObjects.console.hasErrorMarker()).to.be(true);
            }
          );
        });

        it('with missing field name', async () => {
          await runTest(
            {
              body: '{\n "query": {},\n {}',
            },
            async () => {
              expect(await PageObjects.console.hasErrorMarker()).to.be(true);
            }
          );
        });
      });
    });
  });
}
