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

    describe('with inline http requests', () => {
      it('should issue a successful request', async () => {
        await PageObjects.console.enterRequest();
        await PageObjects.console.clickPlay();
        await PageObjects.header.waitUntilLoadingHasFinished();
        const status = await PageObjects.console.getResponseStatus();
        expect(parseInt(status, 10)).to.be(200);
      });

      it('should be correctly syntax highlighted', async () => {
        const methodTokenComputedColor = 'rgba(200, 10, 104, 1)';
        const urlTokenComputedColor = 'rgba(0, 117, 108, 1)';
        await PageObjects.console.enterRequest('\nGET test/doc/1 \n{\n "foo": "bar"');
        const methodTokenColor = await PageObjects.console.getTokenColor('ace_method');
        const urlColor = await PageObjects.console.getTokenColor('ace_url');
        expect(methodTokenColor).to.eql(methodTokenComputedColor);
        expect(urlColor).to.eql(urlTokenComputedColor);
      });

      describe('with valid request', () => {
        it('should not trigger validation errors', async () => {
          await PageObjects.console.enterRequest('\nGET test/doc/1 \n{\n "foo": "bar"');
          expect(await PageObjects.console.hasInvalidSyntax()).to.be(false);
          expect(await PageObjects.console.hasErrorMarker()).to.be(false);
        });
      });

      describe('with invalid request', () => {
        it('should trigger validation errors', async () => {
          await PageObjects.console.enterRequest('\nGET test/doc/1 \n{\n "foo": \'\'');
          expect(await PageObjects.console.hasInvalidSyntax()).to.be(true);
          expect(await PageObjects.console.hasErrorMarker()).to.be(true);
        });
      });
    });

    describe('with multiple bodies for msearch requests', () => {
      it('should not trigger validation errors', async () => {
        await PageObjects.console.enterRequest(
          '\nGET foo/_msearch \n{}\n{"query": {"match_all": {}}}\n{"index": "bar"}\n{"query": {"match_all": {}}}'
        );
        expect(await PageObjects.console.hasErrorMarker()).to.be(false);
      });
    });

    describe('with multiple JSON blocks', () => {
      it('should not trigger validation errors', async () => {
        await PageObjects.console.enterRequest('\nPOST test/doc/1 \n{\n "foo": "bar"');
        await PageObjects.console.enterRequest('\nPOST test/doc/1 \n{\n "foo": "bar"');
        await PageObjects.console.enterRequest('\nPOST test/doc/1 \n{\n "foo": "bar"');
        expect(await PageObjects.console.hasErrorMarker()).to.be(false);
      });
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
        expect(await PageObjects.console.hasErrorMarker()).to.be(false);
      });
    });

    describe('with inline comments', () => {
      it('should be correctly syntax highlighted', async () => {
        const commentTokenComputedColor = 'rgba(65, 117, 92, 1)';
        await PageObjects.console.enterRequest('\n GET _search // inline comment');
        const color = await PageObjects.console.getTokenColor('ace_comment');
        expect(color).to.eql(commentTokenComputedColor);
      });

      it('should allow inline comments in request url row', async () => {
        await PageObjects.console.enterRequest('\n GET _search // inline comment');
        expect(await PageObjects.console.hasErrorMarker()).to.be(false);
        await PageObjects.console.clickPlay();
        await PageObjects.header.waitUntilLoadingHasFinished();
        expect(await PageObjects.console.getResponseStatus()).to.eql(200);
      });

      it('should allow inline comments in request body', async () => {
        await PageObjects.console.enterRequest(
          '\n GET _search \n{\n "query": {\n "match_all": {} // inline comment'
        );
        expect(await PageObjects.console.hasErrorMarker()).to.be(false);
        await PageObjects.console.clickPlay();
        await PageObjects.header.waitUntilLoadingHasFinished();
        expect(await PageObjects.console.getResponseStatus()).to.eql(200);
      });
    });

    describe('with a request using a deprecated feature', () => {
      it('should print a warning into the response pane above the JSON', async () => {
        await PageObjects.console.enterRequest('\nGET .kibana');
        await PageObjects.console.clickPlay();
        await PageObjects.header.waitUntilLoadingHasFinished();
        expect(await PageObjects.console.responseHasDeprecationWarning()).to.be(true);
      });
    });

    describe('with a request using no deprecated feature', () => {
      it('should not print a warning into the response pane', async () => {
        await PageObjects.console.enterRequest();
        await PageObjects.console.clickPlay();
        await PageObjects.header.waitUntilLoadingHasFinished();
        expect(await PageObjects.console.responseHasDeprecationWarning()).to.be(false);
      });
    });
  });
};
