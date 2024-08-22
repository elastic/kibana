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
      await PageObjects.console.closeHelpIfExists();
    });

    beforeEach(async () => {
      await PageObjects.console.monaco.clearEditorText();
    });

    describe('keyboard shortcuts', () => {
      let tabOpened = false;
      afterEach(async () => {
        if (tabOpened) {
          await browser.closeCurrentWindow();
          tabOpened = false;
          await browser.switchTab(0);
        }
      });

      it('should execute the request when Ctrl+Enter is pressed', async () => {
        await PageObjects.console.monaco.enterText('GET _search');
        await PageObjects.console.monaco.pressCtrlEnter();
        await retry.try(async () => {
          const response = await PageObjects.console.monaco.getOutputText();
          expect(response).to.contain('"timed_out": false');
        });
      });

      it('should auto indent current request when Ctrl+I is pressed', async () => {
        await PageObjects.console.monaco.enterText('GET _search\n{"query": {"match_all": {}}}');
        await PageObjects.console.monaco.selectCurrentRequest();
        await PageObjects.console.monaco.pressCtrlI();
        await retry.waitFor('request to be auto indented', async () => {
          const request = await PageObjects.console.monaco.getEditorText();
          return request === 'GET _search\n{\n  "query": {\n    "match_all": {}\n  }\n}';
        });
      });

      it('should jump to the previous request when Ctrl+Up is pressed', async () => {
        await PageObjects.console.monaco.enterText('\nGET _search/foo');
        await PageObjects.console.monaco.enterText('\nGET _search/bar');
        await PageObjects.console.monaco.pressCtrlUp();
        await retry.waitFor('request to be selected', async () => {
          const request = await PageObjects.console.monaco.getEditorTextAtLine(1);
          return request === 'GET _search/foo';
        });
      });

      it('should jump to the next request when Ctrl+Down is pressed', async () => {
        await PageObjects.console.monaco.enterText('\nGET _search/foo');
        await PageObjects.console.monaco.enterText('\nGET _search/bar');
        await PageObjects.console.monaco.pressCtrlUp();
        await PageObjects.console.monaco.pressCtrlDown();
        await retry.waitFor('request to be selected', async () => {
          const request = await PageObjects.console.monaco.getEditorTextAtLine(2);
          return request === 'GET _search/bar';
        });
      });

      // flaky
      it.skip('should go to line number when Ctrl+L is pressed', async () => {
        await PageObjects.console.monaco.enterText(
          '\nGET _search/foo\n{\n  "query": {\n    "match_all": {} \n} \n}'
        );
        await PageObjects.console.monaco.pressCtrlL();
        // Sleep to allow the line number input to be focused
        await PageObjects.common.sleep(1000);
        const alert = await browser.getAlert();
        await alert?.sendKeys('4');
        await alert?.accept();
        await PageObjects.common.sleep(1000);
        expect(await PageObjects.console.monaco.getCurrentLineNumber()).to.be(4);
      });

      describe('open documentation', () => {
        const requests = ['GET _search', 'GET test_index/_search', 'GET /_search'];
        requests.forEach((request) => {
          it('should open documentation when Ctrl+/ is pressed', async () => {
            await PageObjects.console.monaco.enterText(request);
            await PageObjects.console.monaco.pressEscape();
            await PageObjects.console.monaco.pressCtrlSlash();
            await retry.tryForTime(10000, async () => {
              await browser.switchTab(1);
              tabOpened = true;
            });

            // Retry until the documentation is loaded
            await retry.try(async () => {
              const url = await browser.getCurrentUrl();
              expect(url).to.contain('search-search.html');
            });
          });
        });
      });
    });

    it('can toggle keyboard shortcuts', async () => {
      // Enter a sample command
      await PageObjects.console.monaco.enterText('GET _search');

      // Disable keyboard shorcuts
      await PageObjects.console.toggleKeyboardShortcuts(false);

      // Upon clicking ctrl enter a newline character should be added to the editor
      await PageObjects.console.monaco.pressCtrlEnter();
      await retry.waitFor('shortcut shouldnt have generated any request', async () => {
        const response = await PageObjects.console.monaco.getOutputText();
        return response === '';
      });

      // Restore setting
      await PageObjects.console.toggleKeyboardShortcuts(true);
    });

    describe('customizable font size', () => {
      // flaky
      it.skip('should allow the font size to be customized', async () => {
        await PageObjects.console.setFontSizeSetting(20);
        await retry.try(async () => {
          // the settings are not applied synchronously, so we retry for a time
          expect(await PageObjects.console.monaco.getFontSize()).to.be('20px');
        });

        await PageObjects.console.setFontSizeSetting(24);
        await retry.try(async () => {
          // the settings are not applied synchronously, so we retry for a time
          expect(await PageObjects.console.monaco.getFontSize()).to.be('24px');
        });
      });
    });

    describe('invalid requests', () => {
      const invalidRequestText = 'GET _search\n{"query": {"match_all": {';
      it(`should not delete any text if indentations applied to an invalid request`, async () => {
        await PageObjects.console.monaco.clearEditorText();
        await PageObjects.console.monaco.enterText(invalidRequestText);
        await PageObjects.console.monaco.selectCurrentRequest();
        await PageObjects.console.monaco.pressCtrlI();
        // Sleep for a bit and then check that the text has not changed
        await PageObjects.common.sleep(1000);
        await retry.try(async () => {
          const request = await PageObjects.console.monaco.getEditorText();
          expect(request).to.be.eql(invalidRequestText);
        });
      });

      it(`should include an invalid json when sending a request`, async () => {
        await PageObjects.console.monaco.clearEditorText();
        await PageObjects.console.monaco.enterText(invalidRequestText);
        await PageObjects.console.monaco.selectCurrentRequest();
        await PageObjects.console.monaco.pressCtrlEnter();

        await retry.try(async () => {
          const actualResponse = await PageObjects.console.monaco.getOutputText();
          expect(actualResponse).to.contain('parsing_exception');
          expect(await PageObjects.console.hasSuccessBadge()).to.be(false);
        });
      });
    });
  });
}
