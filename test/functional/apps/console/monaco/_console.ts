/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import { asyncForEach } from '@kbn/std';
import { DEFAULT_INPUT_VALUE } from '@kbn/console-plugin/common/constants';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const retry = getService('retry');
  const log = getService('log');
  const browser = getService('browser');
  const PageObjects = getPageObjects(['common', 'console', 'header']);
  const security = getService('security');

  describe('console app', function describeIndexTests() {
    this.tags('includeFirefox');
    before(async () => {
      log.debug('navigateTo console');
      await PageObjects.common.navigateToApp('console');
    });
    beforeEach(async () => {
      await PageObjects.console.closeHelpIfExists();
    });

    it('should show the default request', async () => {
      await retry.try(async () => {
        const actualRequest = await PageObjects.console.monaco.getEditorText();
        log.debug(actualRequest);
        expect(actualRequest.replace(/\s/g, '')).to.eql(DEFAULT_INPUT_VALUE.replace(/\s/g, ''));
      });
    });

    it('default request response should include `"timed_out" : false`', async () => {
      const expectedResponseContains = `"timed_out": false`;
      await PageObjects.console.monaco.selectAllRequests();
      await PageObjects.console.clickPlay();
      await retry.try(async () => {
        const actualResponse = await PageObjects.console.monaco.getOutputText();
        log.debug(actualResponse);
        expect(actualResponse).to.contain(expectedResponseContains);
      });
    });

    // the resizer doesn't work the same as in ace https://github.com/elastic/kibana/issues/184352
    it.skip('should resize the editor', async () => {
      const editor = await PageObjects.console.monaco.getEditor();
      await browser.setWindowSize(1300, 1100);
      const initialSize = await editor.getSize();
      await browser.setWindowSize(1000, 1100);
      const afterSize = await editor.getSize();
      expect(initialSize.width).to.be.greaterThan(afterSize.width);
    });

    it('should return statusCode 400 to unsupported HTTP verbs', async () => {
      const expectedResponseContains = '"statusCode": 400';
      await PageObjects.console.monaco.clearEditorText();
      await PageObjects.console.monaco.enterText('OPTIONS /');
      await PageObjects.console.clickPlay();
      await retry.try(async () => {
        const actualResponse = await PageObjects.console.monaco.getOutputText();
        log.debug(actualResponse);
        expect(actualResponse).to.contain(expectedResponseContains);

        expect(await PageObjects.console.hasSuccessBadge()).to.be(false);
      });
    });

    describe('with kbn: prefix in request', () => {
      before(async () => {
        await PageObjects.console.monaco.clearEditorText();
      });
      it('it should send successful request to Kibana API', async () => {
        const expectedResponseContains = 'default space';
        await PageObjects.console.monaco.enterText('GET kbn:/api/spaces/space');
        await PageObjects.console.clickPlay();
        await retry.try(async () => {
          const actualResponse = await PageObjects.console.monaco.getOutputText();
          log.debug(actualResponse);
          expect(actualResponse).to.contain(expectedResponseContains);
        });
      });
    });

    describe('with query params', () => {
      it('should issue a successful request', async () => {
        await PageObjects.console.monaco.clearEditorText();
        await PageObjects.console.monaco.enterText(
          'GET _cat/aliases?format=json&v=true&pretty=true'
        );
        await PageObjects.console.clickPlay();
        await PageObjects.header.waitUntilLoadingHasFinished();

        // set the width of the browser, so that the response status is visible
        await browser.setWindowSize(1300, 1100);
        await retry.try(async () => {
          const status = await PageObjects.console.getResponseStatus();
          expect(status).to.eql(200);
        });
      });
    });

    describe('multiple requests output', function () {
      const sendMultipleRequests = async (requests: string[]) => {
        await asyncForEach(requests, async (request) => {
          await PageObjects.console.monaco.enterText(request);
        });
        await PageObjects.console.monaco.selectAllRequests();
        await PageObjects.console.clickPlay();
      };

      before(async () => {
        await security.testUser.setRoles(['kibana_admin', 'test_index']);
      });

      after(async () => {
        await security.testUser.restoreDefaults();
      });

      beforeEach(async () => {
        await PageObjects.console.closeHelpIfExists();
        await PageObjects.console.monaco.clearEditorText();
      });

      it('should contain comments starting with # symbol', async () => {
        await sendMultipleRequests(['\n PUT test-index', '\n DELETE test-index']);
        await retry.try(async () => {
          const response = await PageObjects.console.monaco.getOutputText();
          log.debug(response);
          expect(response).to.contain('# PUT test-index 200');
          expect(response).to.contain('# DELETE test-index 200');
        });
      });

      // not implemented for monaco yet https://github.com/elastic/kibana/issues/184010
      it.skip('should display status badges', async () => {
        await sendMultipleRequests(['\n GET _search/test', '\n GET _search']);
        await PageObjects.header.waitUntilLoadingHasFinished();
        expect(await PageObjects.console.hasWarningBadge()).to.be(true);
        expect(await PageObjects.console.hasSuccessBadge()).to.be(true);
      });
    });
  });
}
