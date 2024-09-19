/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import { REPO_ROOT } from '@kbn/repo-info';
import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'fs';
import { resolve } from 'path';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const retry = getService('retry');
  const browser = getService('browser');
  const PageObjects = getPageObjects(['common', 'console', 'header']);

  // Failing: See https://github.com/elastic/kibana/issues/193309
  describe.skip('misc console behavior', function testMiscConsoleBehavior() {
    this.tags('includeFirefox');
    before(async () => {
      await browser.setWindowSize(1200, 800);
      await PageObjects.common.navigateToApp('console');
      // Ensure that the text area can be interacted with
      await PageObjects.console.skipTourIfExists();

      await PageObjects.console.openConfig();
      await PageObjects.console.toggleKeyboardShortcuts(true);
      await PageObjects.console.openConsole();
    });

    beforeEach(async () => {
      await PageObjects.console.clearEditorText();
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

      it('can open and close Shortcuts popover', async () => {
        // The popover should initially be closed
        expect(await PageObjects.console.isShortcutsPopoverOpen()).to.be(false);

        // Opening the popover
        await PageObjects.console.clickShortcutsIcon();
        expect(await PageObjects.console.isShortcutsPopoverOpen()).to.be(true);

        // Closing the popover
        await PageObjects.console.clickShortcutsIcon();
        expect(await PageObjects.console.isShortcutsPopoverOpen()).to.be(false);
      });

      it('should execute the request when Ctrl+Enter is pressed', async () => {
        await PageObjects.console.enterText('GET _search');
        await PageObjects.console.pressCtrlEnter();
        await retry.try(async () => {
          const response = await PageObjects.console.getOutputText();
          expect(response).to.contain('"timed_out": false');
        });
      });

      it('should auto indent current request when Ctrl+I is pressed', async () => {
        await PageObjects.console.enterText('GET _search\n{"query": {"match_all": {}}}');
        await PageObjects.console.selectCurrentRequest();
        await PageObjects.console.pressCtrlI();
        await retry.waitFor('request to be auto indented', async () => {
          const request = await PageObjects.console.getEditorText();
          return request === 'GET _search\n{\n  "query": {\n    "match_all": {}\n  }\n}';
        });
      });

      it('should jump to the previous request when Ctrl+Up is pressed', async () => {
        await PageObjects.console.enterText('\nGET _search/foo');
        await PageObjects.console.enterText('\nGET _search/bar');
        await PageObjects.console.pressCtrlUp();
        await retry.waitFor('request to be selected', async () => {
          const request = await PageObjects.console.getEditorTextAtLine(1);
          return request === 'GET _search/foo';
        });
      });

      it('should jump to the next request when Ctrl+Down is pressed', async () => {
        await PageObjects.console.enterText('\nGET _search/foo');
        await PageObjects.console.enterText('\nGET _search/bar');
        await PageObjects.console.pressCtrlUp();
        await PageObjects.console.pressCtrlDown();
        await retry.waitFor('request to be selected', async () => {
          const request = await PageObjects.console.getEditorTextAtLine(2);
          return request === 'GET _search/bar';
        });
      });

      // flaky
      it.skip('should go to line number when Ctrl+L is pressed', async () => {
        await PageObjects.console.enterText(
          '\nGET _search/foo\n{\n  "query": {\n    "match_all": {} \n} \n}'
        );
        await PageObjects.console.pressCtrlL();
        // Sleep to allow the line number input to be focused
        await PageObjects.common.sleep(1000);
        const alert = await browser.getAlert();
        await alert?.sendKeys('4');
        await alert?.accept();
        await PageObjects.common.sleep(1000);
        expect(await PageObjects.console.getCurrentLineNumber()).to.be(4);
      });

      describe('open documentation', () => {
        const requests = ['GET _search', 'GET test_index/_search', 'GET /_search'];
        requests.forEach((request) => {
          it('should open documentation when Ctrl+/ is pressed', async () => {
            await PageObjects.console.enterText(request);
            await PageObjects.console.pressEscape();
            await PageObjects.console.pressCtrlSlash();
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
      await PageObjects.console.enterText('GET _search');

      // Disable keyboard shorcuts
      await PageObjects.console.openConfig();
      await PageObjects.console.toggleKeyboardShortcuts(false);
      await PageObjects.console.openConsole();

      // Upon clicking ctrl enter a newline character should be added to the editor
      await PageObjects.console.pressCtrlEnter();
      // Shortcut shouldn't have generated any request so output panel should still be in empty state
      expect(await PageObjects.console.isOutputPanelEmptyStateVisible()).to.be(true);

      // Restore setting
      await PageObjects.console.openConfig();
      await PageObjects.console.toggleKeyboardShortcuts(true);
      await PageObjects.console.openConsole();
    });

    describe('customizable font size', () => {
      it('should allow the font size to be customized', async () => {
        await PageObjects.console.openConfig();
        await PageObjects.console.setFontSizeSetting(20);
        await PageObjects.console.openConsole();

        await retry.try(async () => {
          // the settings are not applied synchronously, so we retry for a time
          expect(await PageObjects.console.getFontSize()).to.be('20px');
        });

        await PageObjects.console.openConfig();
        await PageObjects.console.setFontSizeSetting(24);
        await PageObjects.console.openConsole();

        await retry.try(async () => {
          // the settings are not applied synchronously, so we retry for a time
          expect(await PageObjects.console.getFontSize()).to.be('24px');
        });
      });
    });

    it('can open and close Help popover', async () => {
      // The popover should initially be closed
      expect(await PageObjects.console.isHelpPopoverOpen()).to.be(false);

      // Opening the popover
      await PageObjects.console.clickHelpIcon();
      expect(await PageObjects.console.isHelpPopoverOpen()).to.be(true);

      // Closing the popover
      await PageObjects.console.clickHelpIcon();
      expect(await PageObjects.console.isHelpPopoverOpen()).to.be(false);
    });

    describe('invalid requests', () => {
      const invalidRequestText = 'GET _search\n{"query": {"match_all": {';
      it(`should not delete any text if indentations applied to an invalid request`, async () => {
        await PageObjects.console.clearEditorText();
        await PageObjects.console.enterText(invalidRequestText);
        await PageObjects.console.selectCurrentRequest();
        await PageObjects.console.pressCtrlI();
        // Sleep for a bit and then check that the text has not changed
        await PageObjects.common.sleep(1000);
        await retry.try(async () => {
          const request = await PageObjects.console.getEditorText();
          expect(request).to.be.eql(invalidRequestText);
        });
      });

      it(`should include an invalid json when sending a request`, async () => {
        await PageObjects.console.clearEditorText();
        await PageObjects.console.enterText(invalidRequestText);
        await PageObjects.console.selectCurrentRequest();
        await PageObjects.console.pressCtrlEnter();

        await retry.try(async () => {
          const actualResponse = await PageObjects.console.getOutputText();
          expect(actualResponse).to.contain('parsing_exception');
          expect(await PageObjects.console.hasSuccessBadge()).to.be(false);
        });
      });
    });

    describe('import/export file', () => {
      it('can import file into the editor', async () => {
        await PageObjects.console.clearEditorText();

        // Create input file path
        const filePath = resolve(REPO_ROOT, `target/functional-tests/downloads/console_import`);
        writeFileSync(filePath, 'GET _search', 'utf8');

        // Set file to upload and wait for the editor to be updated
        await PageObjects.console.setFileToUpload(filePath);
        await PageObjects.console.acceptFileImport();
        await PageObjects.common.sleep(1000);

        await retry.try(async () => {
          const request = await PageObjects.console.getEditorText();
          expect(request).to.be.eql('GET _search');
        });

        // Clean up input file
        unlinkSync(filePath);
      });

      // It seems that the downloadPath is not being resolved correctly in the CI anymore?
      // Also doesnt seem to work locally either.
      it.skip('can export input as file', async () => {
        await PageObjects.console.enterText('GET _search');
        await PageObjects.console.clickExportButton();

        // Wait for download to trigger
        await PageObjects.common.sleep(1000);

        const downloadPath = resolve(REPO_ROOT, `target/functional-tests/downloads/console_export`);
        await retry.try(async () => {
          const fileExists = existsSync(downloadPath);
          expect(fileExists).to.be(true);
        });

        // Verify the downloaded file content
        const fileContent = readFileSync(downloadPath, 'utf8');
        expect(fileContent).to.be('GET _search');

        // Clean up downloaded file
        unlinkSync(downloadPath);
      });
    });
  });
}
