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

  describe('XJSON', function testXjson() {
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

    describe('inline HTTP requests', () => {
      it('should not trigger validation errors with a valid request', async () => {
        await PageObjects.console.enterRequest('\nGET test/doc/1 \n{\n "foo": "bar"');
        expect(await PageObjects.console.hasInvalidSyntax()).to.be(false);
        expect(await PageObjects.console.hasErrorMarker()).to.be(false);
      });

      it('should trigger validation errors with an invalid request', async () => {
        await PageObjects.console.enterRequest('\nGET test/doc/1 \n{\n "foo": \'\'');
        expect(await PageObjects.console.hasInvalidSyntax()).to.be(true);
        expect(await PageObjects.console.hasErrorMarker()).to.be(true);
      });

      it('should trigger validation errors with an invalid syntax', async () => {
        await PageObjects.console.enterRequest('\nGET test/doc/1 \n{\n "foo": \'\'');
        expect(await PageObjects.console.hasInvalidSyntax()).to.be(true);
      });

      it('should be correctly syntax highlighted', async () => {
        const methodTokenColor = '#c80a68';
        const urlTokenColor = '#00756c';
        await PageObjects.console.enterRequest('\nGET test/doc/1 \n{\n "foo": "bar"');
        const methodTokenColorRGB = await PageObjects.console.getTokenColor('ace_method');
        const urlColorRGB = await PageObjects.console.getTokenColor('ace_url');
        // getTokenColor returns rgb value of css color property, we need to convert rgb to hex to compare it to the actual value
        expect(rgbToHex(methodTokenColorRGB)).to.eql(methodTokenColor);
        expect(rgbToHex(urlColorRGB)).to.eql(urlTokenColor);
      });
    });

    describe('multiple bodies for msearch requests', () => {
      it('should not trigger validation errors', async () => {
        await PageObjects.console.enterRequest(
          '\nGET foo/_msearch \n{}\n{"query": {"match_all": {}}}\n{"index": "bar"}\n{"query": {"match_all": {}}}'
        );
        expect(await PageObjects.console.hasErrorMarker()).to.be(false);
      });
    });

    describe('multiple JSON blocks', () => {
      it('should not trigger validation errors', async () => {
        await PageObjects.console.enterRequest('\nPOST test/doc/1 \n{\n "foo": "bar"');
        await PageObjects.console.enterRequest('\nPOST test/doc/1 \n{\n "foo": "bar"');
        await PageObjects.console.enterRequest('\nPOST test/doc/1 \n{\n "foo": "bar"');
        expect(await PageObjects.console.hasErrorMarker()).to.be(false);
      });
    });

    describe('triple quoted strings', () => {
      it('should allow escaping quotation mark by wrapping it in triple quotes', async () => {
        await PageObjects.console.enterRequest(
          '\nPOST test/_doc/1 \n{\n "foo": """look "escaped" quotes"""'
        );
        await PageObjects.console.clickPlay();
        await PageObjects.header.waitUntilLoadingHasFinished();
        expect(await PageObjects.console.hasErrorMarker()).to.be(false);
      });
    });

    describe('inline comments', () => {
      it('should be correctly syntax highlighted', async () => {
        const commentTokenColor = '#41755c';
        await PageObjects.console.enterRequest('\n GET _search // inline comment');
        const commentTokenColorRGB = await PageObjects.console.getTokenColor('ace_comment');
        // getTokenColor returns rgb value of css color property, we need to convert rgb to hex to compare it to the actual value
        expect(rgbToHex(commentTokenColorRGB)).to.eql(commentTokenColor);
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
