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

const DEFAULT_REQUEST = `

# Click the Variables button, above, to create your own variables.
GET \${exampleVariable1} // _search
{
  "query": {
    "\${exampleVariable2}": {} // match_all
  }
}

`.trim();

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const retry = getService('retry');
  const log = getService('log');
  const browser = getService('browser');
  const PageObjects = getPageObjects(['common', 'console', 'header']);
  const toasts = getService('toasts');
  const security = getService('security');
  const testSubjects = getService('testSubjects');

  describe('console app', function describeIndexTests() {
    this.tags('includeFirefox');
    before(async () => {
      log.debug('navigateTo console');
      await PageObjects.common.navigateToApp('console');
    });

    it('should show the default request', async () => {
      // collapse the help pane because we only get the VISIBLE TEXT, not the part that is scrolled
      // on IE11, the dialog that says 'Your browser does not meet the security requirements for Kibana.'
      // blocks the close help button for several seconds so just retry until we can click it.
      await retry.try(async () => {
        await PageObjects.console.collapseHelp();
      });
      await retry.try(async () => {
        const actualRequest = await PageObjects.console.getRequest();
        log.debug(actualRequest);
        expect(actualRequest.trim()).to.eql(DEFAULT_REQUEST);
      });
    });

    it('default request response should include `"timed_out" : false`', async () => {
      const expectedResponseContains = `"timed_out": false`;
      await PageObjects.console.selectAllRequests();
      await PageObjects.console.clickPlay();
      await retry.try(async () => {
        const actualResponse = await PageObjects.console.getResponse();
        log.debug(actualResponse);
        expect(actualResponse).to.contain(expectedResponseContains);
      });
    });

    it('settings should allow changing the text size', async () => {
      await PageObjects.console.setFontSizeSetting(20);
      await retry.try(async () => {
        // the settings are not applied synchronously, so we retry for a time
        expect(await PageObjects.console.getRequestFontSize()).to.be('20px');
      });

      await PageObjects.console.setFontSizeSetting(24);
      await retry.try(async () => {
        // the settings are not applied synchronously, so we retry for a time
        expect(await PageObjects.console.getRequestFontSize()).to.be('24px');
      });
    });

    it('should resize the editor', async () => {
      const editor = await PageObjects.console.getEditor();
      await browser.setWindowSize(1300, 1100);
      const initialSize = await editor.getSize();
      await browser.setWindowSize(1000, 1100);
      const afterSize = await editor.getSize();
      expect(initialSize.width).to.be.greaterThan(afterSize.width);
    });

    describe('with a data URI in the load_from query', () => {
      it('loads the data from the URI', async () => {
        await PageObjects.common.navigateToApp('console', {
          hash: '#/console?load_from=data:text/plain,BYUwNmD2Q',
        });

        await retry.try(async () => {
          const actualRequest = await PageObjects.console.getRequest();
          log.debug(actualRequest);
          expect(actualRequest.trim()).to.eql('hello');
        });
      });

      describe('with invalid data', () => {
        it('shows a toast error', async () => {
          await PageObjects.common.navigateToApp('console', {
            hash: '#/console?load_from=data:text/plain,BYUwNmD2',
          });

          await retry.try(async () => {
            expect(await toasts.getToastCount()).to.equal(1);
          });
        });
      });
    });

    describe('with kbn: prefix in request', () => {
      before(async () => {
        await PageObjects.console.clearTextArea();
      });
      it('it should send successful request to Kibana API', async () => {
        const expectedResponseContains = 'default space';
        await PageObjects.console.enterRequest('\n GET kbn:/api/spaces/space');
        await PageObjects.console.clickPlay();
        await retry.try(async () => {
          const actualResponse = await PageObjects.console.getResponse();
          log.debug(actualResponse);
          expect(actualResponse).to.contain(expectedResponseContains);
        });
      });
    });

    describe('with query params', () => {
      it('should issue a successful request', async () => {
        await PageObjects.console.clearTextArea();
        await PageObjects.console.enterRequest(
          '\n GET _cat/aliases?format=json&v=true&pretty=true'
        );
        await PageObjects.console.clickPlay();
        await PageObjects.header.waitUntilLoadingHasFinished();

        await retry.try(async () => {
          const status = await PageObjects.console.getResponseStatus();
          expect(status).to.eql(200);
        });
      });
    });

    describe('multiple requests output', () => {
      const sendMultipleRequests = async (requests: string[]) => {
        await asyncForEach(requests, async (request) => {
          await PageObjects.console.enterRequest(request);
        });
        await PageObjects.console.selectAllRequests();
        await PageObjects.console.clickPlay();
      };

      before(async () => {
        await security.testUser.setRoles(['kibana_admin', 'test_index']);
      });

      after(async () => {
        await security.testUser.restoreDefaults();
      });

      beforeEach(async () => {
        // Welcome fly out exists sometimes
        const flyOutExists = await testSubjects.exists('euiFlyoutCloseButton');
        if (flyOutExists) {
          await testSubjects.click('euiFlyoutCloseButton');
        }
        await PageObjects.console.clearTextArea();
      });

      it('should contain comments starting with # symbol', async () => {
        await sendMultipleRequests(['\n PUT test-index', '\n DELETE test-index']);
        await retry.try(async () => {
          const response = await PageObjects.console.getResponse();
          log.debug(response);
          expect(response).to.contain('# PUT test-index 200');
          expect(response).to.contain('# DELETE test-index 200');
        });
      });

      it('should display status badges', async () => {
        await sendMultipleRequests(['\n GET _search/test', '\n GET _search']);
        await PageObjects.header.waitUntilLoadingHasFinished();
        expect(await PageObjects.console.hasWarningBadge()).to.be(true);
        expect(await PageObjects.console.hasSuccessBadge()).to.be(true);
      });
    });

    describe('with folded/unfolded lines in request body', () => {
      const enterRequest = async () => {
        await PageObjects.console.enterRequest('\nGET test/doc/1 \n{\n\t\t"_source": []');
        await PageObjects.console.clickPlay();
      };

      beforeEach(async () => {
        await PageObjects.console.clearTextArea();
      });

      it('should restore the state of folding/unfolding when navigating back to Console', async () => {
        await enterRequest();
        await PageObjects.console.clickFoldWidget();
        await PageObjects.common.navigateToApp('home');
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.common.navigateToApp('console');
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.console.closeHelpIfExists();
        expect(await PageObjects.console.hasFolds()).to.be(true);
      });

      it('should restore the state of folding/unfolding when the page reloads', async () => {
        await enterRequest();
        await PageObjects.console.clickFoldWidget();
        await browser.refresh();
        await PageObjects.header.waitUntilLoadingHasFinished();
        expect(await PageObjects.console.hasFolds()).to.be(true);
      });

      it('should not have folds by default', async () => {
        await enterRequest();
        await browser.refresh();
        await PageObjects.header.waitUntilLoadingHasFinished();
        expect(await PageObjects.console.hasFolds()).to.be(false);
      });
    });
  });
}
