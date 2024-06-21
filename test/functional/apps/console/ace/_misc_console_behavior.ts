/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const retry = getService('retry');
  const browser = getService('browser');
  const PageObjects = getPageObjects(['common', 'console', 'header']);

  describe('misc console behavior', function testMiscConsoleBehavior() {
    this.tags('includeFirefox');
    before(async () => {
      await browser.setWindowSize(1200, 800);
      await PageObjects.common.navigateToApp('console');
      // Ensure that the text area can be interacted with
      await PageObjects.console.collapseHelp();
    });

    beforeEach(async () => {
      await PageObjects.console.clearTextArea();
    });

    // FLAKY: https://github.com/elastic/kibana/issues/151056
    describe.skip('collapsible JSON blocks', () => {
      it('should collapse and expand JSON blocks', async () => {
        const blockNumber = 1;
        await PageObjects.console.enterRequest(
          'GET _search\n{\n  "query": {\n    "match_all": {}\n'
        );
        // Sleep to allow the JSON to be parsed and rendered
        await PageObjects.common.sleep(1000);
        await PageObjects.console.collapseJsonBlock(blockNumber);
        expect(await PageObjects.console.isJsonBlockExpanded(blockNumber)).to.be(false);
        await PageObjects.console.expandJsonBlock(blockNumber);
        expect(await PageObjects.console.isJsonBlockExpanded(blockNumber)).to.be(true);
      });
    });

    describe('keyboard shortcuts', () => {
      let tabCount = 1;

      after(async () => {
        if (tabCount > 1) {
          await browser.closeCurrentWindow();
          await browser.switchTab(0);
        }
      });

      it('should execute the request when Ctrl+Enter is pressed', async () => {
        await PageObjects.console.enterRequest();
        await PageObjects.console.pressCtrlEnter();
        await retry.try(async () => {
          const response = await PageObjects.console.getResponse();
          expect(response).to.contain('"timed_out": false');
        });
      });

      it('should auto indent current request when Ctrl+I is pressed', async () => {
        await PageObjects.console.enterRequest('GET _search\n{"query": {"match_all": {}}}');
        await PageObjects.console.selectCurrentRequest();
        await PageObjects.console.pressCtrlI();
        await retry.waitFor('request to be auto indented', async () => {
          const request = await PageObjects.console.getRequest();
          return request === 'GET _search\n{\n  "query": {\n    "match_all": {}\n  }\n}';
        });
      });

      it('should jump to the previous request when Ctrl+Up is pressed', async () => {
        await PageObjects.console.enterRequest('\nGET _search/foo');
        await PageObjects.console.enterRequest('\nGET _search/bar');
        await PageObjects.console.pressCtrlUp();
        await retry.waitFor('request to be selected', async () => {
          const request = await PageObjects.console.getRequestAtLine(1);
          return request === 'GET _search/foo';
        });
      });

      it('should jump to the next request when Ctrl+Down is pressed', async () => {
        await PageObjects.console.enterRequest('\nGET _search/foo');
        await PageObjects.console.enterRequest('\nGET _search/bar');
        await PageObjects.console.pressCtrlUp();
        await PageObjects.console.pressCtrlDown();
        await retry.waitFor('request to be selected', async () => {
          const request = await PageObjects.console.getRequestAtLine(2);
          return request === 'GET _search/bar';
        });
      });

      it('should go to line number when Ctrl+L is pressed', async () => {
        await PageObjects.console.enterRequest(
          '\nGET _search/foo\n{\n  "query": {\n    "match_all": {}'
        );
        await PageObjects.console.pressCtrlL();
        // Sleep to allow the line number input to be focused
        await PageObjects.common.sleep(1000);
        const alert = await browser.getAlert();
        await alert?.sendKeys('4');
        await alert?.accept();
        expect(await PageObjects.console.getCurrentLineNumber()).to.be(4);
      });

      it('should open documentation when Ctrl+/ is pressed', async () => {
        await PageObjects.console.enterRequest('GET _search');
        await PageObjects.console.pressCtrlSlash();
        await retry.tryForTime(10000, async () => {
          await browser.switchTab(1);
          tabCount++;
        });

        // Retry until the documentation is loaded
        await retry.try(async () => {
          const url = await browser.getCurrentUrl();
          expect(url).to.contain('search-search.html');
        });
      });
    });

    describe('customizable font size', () => {
      it('should allow the font size to be customized', async () => {
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
    });
  });
}
