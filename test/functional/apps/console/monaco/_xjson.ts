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

export default ({ getService, getPageObjects }: FtrProviderContext) => {
  const retry = getService('retry');
  const PageObjects = getPageObjects(['common', 'console', 'header']);

  describe('XJSON', function testXjson() {
    this.tags('includeFirefox');
    before(async () => {
      await PageObjects.common.navigateToApp('console');
      await PageObjects.console.closeHelpIfExists();
    });

    beforeEach(async () => {
      await PageObjects.console.monaco.clearEditorText();
    });

    const executeRequest = async (request = '\n GET _search') => {
      await PageObjects.console.monaco.enterText(request);
      await PageObjects.console.clickPlay();
      await PageObjects.header.waitUntilLoadingHasFinished();
    };

    describe('inline http request', () => {
      it('should not have validation errors', async () => {
        await PageObjects.console.monaco.enterText('\n GET foo/bar');
        expect(await PageObjects.console.monaco.hasInvalidSyntax()).to.be(false);
      });

      it('should have validation error for invalid method', async () => {
        await PageObjects.console.monaco.enterText('\n FOO foo/bar');
        // Retry because the error marker is not always immediately visible.
        await retry.try(async () => {
          expect(await PageObjects.console.monaco.hasInvalidSyntax()).to.be(true);
        });
      });

      it('should have validation error for invalid path', async () => {
        await PageObjects.console.monaco.enterText('\n GET');
        // Retry because the error marker is not always immediately visible.
        await retry.try(async () => {
          expect(await PageObjects.console.monaco.hasInvalidSyntax()).to.be(true);
        });
      });

      it('should have validation error for invalid body', async () => {
        await PageObjects.console.monaco.enterText('\n POST foo/bar\n {"foo": "bar"');
        // Retry because the error marker is not always immediately visible.
        await retry.try(async () => {
          expect(await PageObjects.console.monaco.hasInvalidSyntax()).to.be(true);
        });
      });

      it('should not trigger error for multiple bodies for _msearch requests', async () => {
        await PageObjects.console.monaco.enterText(
          '\nGET foo/_msearch \n{}\n{"query": {"match_all": {}}}\n{"index": "bar"}\n{"query": {"match_all": {}}}'
        );
        // Retry until typing is finished.
        await retry.try(async () => {
          expect(await PageObjects.console.monaco.hasInvalidSyntax()).to.be(false);
        });
      });

      it('should not trigger validation errors for multiple JSON blocks', async () => {
        await PageObjects.console.monaco.enterText('\nPOST test/doc/1 \n{\n "foo": "bar"\n}');
        await PageObjects.console.monaco.enterText('\nPOST test/doc/2 \n{\n "foo": "baz"\n}');
        await PageObjects.console.monaco.enterText('\nPOST test/doc/3 \n{\n "foo": "qux"\n}');
        // Retry until typing is finished.
        await retry.try(async () => {
          expect(await PageObjects.console.monaco.hasInvalidSyntax()).to.be(false);
        });
      });

      it('should allow escaping quotation mark by wrapping it in triple quotes', async () => {
        await PageObjects.console.monaco.enterText(
          '\nPOST test/_doc/1 \n{\n "foo": """look "escaped" quotes"""\n}'
        );
        // Retry until typing is finished and validation errors are gone.
        await retry.try(async () => {
          expect(await PageObjects.console.monaco.hasInvalidSyntax()).to.be(false);
        });
      });

      it('should allow inline comments in request url row', async () => {
        await executeRequest('\n GET _search // inline comment');
        expect(await PageObjects.console.monaco.hasInvalidSyntax()).to.be(false);
        expect(await PageObjects.console.getResponseStatus()).to.eql(200);
      });

      it('should allow inline comments in request body', async () => {
        await executeRequest(
          '\n GET _search \n{\n "query": {\n "match_all": {} // inline comment\n}\n}'
        );
        expect(await PageObjects.console.monaco.hasInvalidSyntax()).to.be(false);
        expect(await PageObjects.console.getResponseStatus()).to.eql(200);
      });

      it('should print warning for deprecated request', async () => {
        await executeRequest('\nGET .kibana');
        expect(await PageObjects.console.monaco.responseHasDeprecationWarning()).to.be(true);
      });

      it('should not print warning for non-deprecated request', async () => {
        await executeRequest('\n GET _search');
        expect(await PageObjects.console.monaco.responseHasDeprecationWarning()).to.be(false);
      });
    });
  });
};
