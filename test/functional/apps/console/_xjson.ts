/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { rgbToHex } from '@elastic/eui';
import { FtrProviderContext } from '../../ftr_provider_context';

export default ({ getService, getPageObjects }: FtrProviderContext) => {
  const retry = getService('retry');
  const log = getService('log');
  const PageObjects = getPageObjects(['common', 'console', 'header']);

  // FLAKY: https://github.com/elastic/kibana/issues/171259
  // FLAKY: https://github.com/elastic/kibana/issues/158484
  describe.skip('XJSON', function testXjson() {
    this.tags('includeFirefox');
    before(async () => {
      await PageObjects.common.navigateToApp('console');
      await retry.try(async () => {
        await PageObjects.console.collapseHelp();
      });
    });

    beforeEach(async () => {
      await PageObjects.console.clearTextArea();
    });

    const executeRequest = async (request = '\n GET _search') => {
      await PageObjects.console.enterRequest(request);
      await PageObjects.console.clickPlay();
      await PageObjects.header.waitUntilLoadingHasFinished();
    };

    describe('inline http request', () => {
      it('should have method and path', async () => {
        await PageObjects.console.enterRequest('\n PUT foo/bar');
        expect(await PageObjects.console.getRequestMethod()).to.be('PUT');
        expect(await PageObjects.console.getRequestPath()).to.be('foo/bar');
      });

      it('should have optional query parameters', async () => {
        await PageObjects.console.enterRequest('\n GET foo/bar?pretty');
        expect(await PageObjects.console.getRequestQueryParams()).to.be('pretty');
      });

      it('should have optional request body', async () => {
        await PageObjects.console.enterRequest('\n POST foo/bar\n {"foo": "bar"}');
        log.debug('request body: ' + (await PageObjects.console.getRequestBody()));
        expect(await PageObjects.console.getRequestBody()).to.be('{"foo": "bar"}');
      });

      it('should not have validation errors', async () => {
        await PageObjects.console.enterRequest('\n GET foo/bar');
        expect(await PageObjects.console.hasErrorMarker()).to.be(false);
      });

      it('should have validation error for invalid method', async () => {
        await PageObjects.console.enterRequest('\n FOO foo/bar');
        // Retry because the error marker is not always immediately visible.
        await retry.try(async () => {
          expect(await PageObjects.console.hasErrorMarker()).to.be(true);
        });
      });

      it('should have validation error for invalid path', async () => {
        await PageObjects.console.enterRequest('\n GET');
        // Retry because the error marker is not always immediately visible.
        await retry.try(async () => {
          expect(await PageObjects.console.hasErrorMarker()).to.be(true);
        });
      });

      it('should have validation error for invalid body', async () => {
        await PageObjects.console.enterRequest('\n POST foo/bar\n {"foo": "bar"');
        // Retry because the error marker is not always immediately visible.
        await retry.try(async () => {
          expect(await PageObjects.console.hasErrorMarker()).to.be(true);
        });
      });

      it('should have correct syntax highlighting', async () => {
        await PageObjects.console.enterRequest('\n GET foo/bar');
        expect(await PageObjects.console.getRequestLineHighlighting()).to.contain(
          'ace_method ace_whitespace ace_url ace_part ace_url ace_slash ace_url ace_part'
        );
      });

      it('should have correct syntax highlighting for method', async () => {
        await PageObjects.console.enterRequest('\n PUT foo/bar');
        const color = await PageObjects.console.getRequestMethodColor();
        expect(rgbToHex(color)).to.be('#c80a68');
      });

      it('should have correct syntax highlighting for path', async () => {
        await PageObjects.console.enterRequest('\n PUT foo/bar');
        const color = await PageObjects.console.getRequestPathColor();
        expect(rgbToHex(color)).to.be('#00756c');
      });

      it('should have correct syntax highlighting for query', async () => {
        await PageObjects.console.enterRequest('\n PUT foo/bar?pretty');
        const color = await PageObjects.console.getRequestQueryColor();
        expect(rgbToHex(color)).to.be('#00756c');
      });

      it('should have correct syntax highlighting for body', async () => {
        await PageObjects.console.enterRequest('\n PUT foo/bar\n {"foo": "bar"}');
        const color = await PageObjects.console.getRequestBodyColor();
        expect(rgbToHex(color)).to.be('#343741');
      });

      it('should have multiple bodies for _msearch requests', async () => {
        await PageObjects.console.enterRequest(
          '\nGET foo/_msearch \n{}\n{"query": {"match_all": {}}}\n{"index": "bar"}\n{"query": {"match_all": {}}}'
        );
        // Retry because body elements are not always immediately visible.
        await retry.try(async () => {
          expect(await PageObjects.console.getRequestBodyCount()).to.be(4);
        });
      });

      it('should not trigger error for multiple bodies for _msearch requests', async () => {
        await PageObjects.console.enterRequest(
          '\nGET foo/_msearch \n{}\n{"query": {"match_all": {}}}\n{"index": "bar"}\n{"query": {"match_all": {}}}'
        );
        // Retry until typing is finished.
        await retry.try(async () => {
          expect(await PageObjects.console.hasErrorMarker()).to.be(false);
        });
      });

      it('should not trigger validation errors for multiple JSON blocks', async () => {
        await PageObjects.console.enterRequest('\nPOST test/doc/1 \n{\n "foo": "bar"');
        await PageObjects.console.enterRequest('\nPOST test/doc/2 \n{\n "foo": "baz"');
        await PageObjects.console.enterRequest('\nPOST test/doc/3 \n{\n "foo": "qux"');
        // Retry until typing is finished.
        await retry.try(async () => {
          expect(await PageObjects.console.hasErrorMarker()).to.be(false);
        });
      });

      it('should allow escaping quotation mark by wrapping it in triple quotes', async () => {
        await PageObjects.console.enterRequest(
          '\nPOST test/_doc/1 \n{\n "foo": """look "escaped" quotes"""'
        );
        // Retry until typing is finished and validation errors are gone.
        await retry.try(async () => {
          expect(await PageObjects.console.hasErrorMarker()).to.be(false);
        });
      });

      it('should have correct syntax highlighting for inline comments', async () => {
        await PageObjects.console.enterRequest(
          '\nPOST test/_doc/1 \n{\n "foo": "bar" # inline comment'
        );
        const color = await PageObjects.console.getCommentColor();
        expect(rgbToHex(color)).to.be('#41755c');
      });

      it('should allow inline comments in request url row', async () => {
        await executeRequest('\n GET _search // inline comment');
        expect(await PageObjects.console.hasErrorMarker()).to.be(false);
        expect(await PageObjects.console.getResponseStatus()).to.eql(200);
      });

      it('should allow inline comments in request body', async () => {
        await executeRequest('\n GET _search \n{\n "query": {\n "match_all": {} // inline comment');
        expect(await PageObjects.console.hasErrorMarker()).to.be(false);
        expect(await PageObjects.console.getResponseStatus()).to.eql(200);
      });

      it('should print warning for deprecated request', async () => {
        await executeRequest('\nGET .kibana');
        expect(await PageObjects.console.responseHasDeprecationWarning()).to.be(true);
      });

      it('should not print warning for non-deprecated request', async () => {
        await executeRequest('\n GET _search');
        expect(await PageObjects.console.responseHasDeprecationWarning()).to.be(false);
      });
    });
  });
};
