/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const log = getService('log');
  const retry = getService('retry');
  const PageObjects = getPageObjects(['common', 'console']);
  const testSubjects = getService('testSubjects');
  const browser = getService('browser');
  const toasts = getService('toasts');

  describe('console context menu', function testContextMenu() {
    before(async () => {
      await PageObjects.common.navigateToApp('console');
      // Ensure that the text area can be interacted with
      await PageObjects.console.skipTourIfExists();
      await PageObjects.console.clearEditorText();
      await PageObjects.console.enterText('GET _search');
    });

    it('should open context menu', async () => {
      expect(await PageObjects.console.isContextMenuOpen()).to.be(false);
      await PageObjects.console.clickContextMenu();
      expect(PageObjects.console.isContextMenuOpen()).to.be.eql(true);
    });

    it('should have options to copy as, open documentation, and auto indent', async () => {
      await PageObjects.console.clickContextMenu();
      expect(PageObjects.console.isContextMenuOpen()).to.be.eql(true);
      expect(PageObjects.console.isCopyAsButtonVisible()).to.be.eql(true);
      expect(PageObjects.console.isOpenDocumentationButtonVisible()).to.be.eql(true);
      expect(PageObjects.console.isAutoIndentButtonVisible()).to.be.eql(true);
    });

    describe('Copy as', () => {
      beforeEach(async () => {
        await PageObjects.common.navigateToApp('console');
        await PageObjects.console.skipTourIfExists();
        await PageObjects.console.clearEditorText();
        await PageObjects.console.enterText('GET _search');
      });

      it('by default it should copy as curl and show toast when copy as button is clicked', async () => {
        await PageObjects.console.clickContextMenu();
        await PageObjects.console.clickCopyAsButton();

        const resultToast = await toasts.getElementByIndex(1);
        const toastText = await resultToast.getVisibleText();

        if (toastText.includes('Write permission denied')) {
          log.debug('Write permission denied, skipping test');
          return;
        }

        expect(toastText).to.be('Request copied to clipboard as curl');

        const canReadClipboard = await browser.checkBrowserPermission('clipboard-read');
        if (canReadClipboard) {
          const clipboardText = await browser.getClipboardValue();
          expect(clipboardText).to.contain('curl -X GET');
        }
      });

      it('doesnt allow to copy kbn requests as anything other than curl', async () => {
        await PageObjects.console.clearEditorText();
        await PageObjects.console.enterText('GET _search\n');

        // Add a kbn request
        // pressEnter
        await PageObjects.console.enterText('GET kbn:/api/spaces/space');
        // Make sure to select the es and kbn request
        await PageObjects.console.selectAllRequests();

        await PageObjects.console.clickContextMenu();
        await PageObjects.console.clickCopyAsButton();

        let resultToast = await toasts.getElementByIndex(1);
        let toastText = await resultToast.getVisibleText();

        expect(toastText).to.be('Requests copied to clipboard as curl');

        // Wait until async operation is done
        await PageObjects.common.sleep(1000);

        // Focus editor once again
        await PageObjects.console.focusInputEditor();

        // Try to copy as javascript
        await PageObjects.console.clickContextMenu();
        await PageObjects.console.changeLanguageAndCopy('javascript');

        resultToast = await toasts.getElementByIndex(2);
        toastText = await resultToast.getVisibleText();

        expect(toastText).to.be('Kibana requests can only be copied as curl');
      });

      it.skip('allows to change default language', async () => {
        await PageObjects.console.clickContextMenu();

        // By default should be copy as cURL
        let copyAsButton = await testSubjects.find('consoleMenuCopyAsButton');
        let buttonLabel = await copyAsButton.getVisibleText();
        expect(buttonLabel).to.contain('curl');

        // Select python as default language
        await PageObjects.console.changeDefaultLanguage('python');
        // Wait until async operation is done
        await PageObjects.common.sleep(2000);
        // Open the context menu once again
        await PageObjects.console.clickContextMenu();

        // By default should be copy as cURL
        copyAsButton = await testSubjects.find('consoleMenuCopyAsButton');
        buttonLabel = await copyAsButton.getVisibleText();
        expect(buttonLabel).to.contain('Python');
      });

      it('allows to select a different language to copy as and should copy it right away to clipboard', async () => {
        await PageObjects.console.clickContextMenu();
        await PageObjects.console.changeLanguageAndCopy('javascript');

        const resultToast = await toasts.getElementByIndex(1);
        const toastText = await resultToast.getVisibleText();

        if (toastText.includes('Write permission denied')) {
          log.debug('Write permission denied, skipping test');
          return;
        }

        expect(toastText).to.be('Request copied to clipboard as JavaScript');

        const canReadClipboard = await browser.checkBrowserPermission('clipboard-read');
        if (canReadClipboard) {
          const clipboardText = await browser.getClipboardValue();
          expect(clipboardText).to.contain('require("@elastic/elasticsearch")');
        }
      });
    });

    it('should open documentation when open documentation button is clicked', async () => {
      await PageObjects.console.clearEditorText();
      await PageObjects.console.enterText('GET _search');
      await PageObjects.console.clickContextMenu();
      await PageObjects.console.clickOpenDocumentationButton();

      await retry.tryForTime(10000, async () => {
        await browser.switchTab(1);
      });

      // Retry until the documentation is loaded
      await retry.try(async () => {
        const url = await browser.getCurrentUrl();
        expect(url).to.contain('search-search.html');
      });

      // Close the documentation tab
      await browser.closeCurrentWindow();
      await browser.switchTab(0);
    });

    it('should auto indent when auto indent button is clicked', async () => {
      await PageObjects.console.clearEditorText();
      await PageObjects.console.enterText('GET _search\n{"query": {"match_all": {}}}');
      await PageObjects.console.clickContextMenu();
      await PageObjects.console.clickAutoIndentButton();
      // Retry until the request is auto indented
      await retry.try(async () => {
        const request = await PageObjects.console.getEditorText();
        expect(request).to.be.eql('GET _search\n{\n  "query": {\n    "match_all": {}\n  }\n}');
      });
    });

    // not implemented for monaco yet https://github.com/elastic/kibana/issues/185891
    it.skip('should collapse the request when auto indent button is clicked again', async () => {
      await PageObjects.console.clearEditorText();
      await PageObjects.console.enterText('GET _search\n{"query": {"match_all": {}}}');
      await PageObjects.console.clickContextMenu();
      await PageObjects.console.clickAutoIndentButton();
      // Retry until the request is auto indented
      await retry.try(async () => {
        const request = await PageObjects.console.getEditorText();
        expect(request).to.be.eql('GET _search\n{\n  "query": {\n    "match_all": {}\n  }\n}');
      });

      await PageObjects.console.clickContextMenu();
      // Click the auto-indent button again to condense request
      await PageObjects.console.clickAutoIndentButton();
      // Retry until the request is condensed
      await retry.try(async () => {
        const request = await PageObjects.console.getEditorText();
        expect(request).to.be.eql('GET _search\n{"query":{"match_all":{}}}');
      });
    });
  });
}
