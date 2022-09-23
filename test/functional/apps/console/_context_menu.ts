/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const log = getService('log');
  const retry = getService('retry');
  const PageObjects = getPageObjects(['common', 'console']);
  const browser = getService('browser');
  const toasts = getService('toasts');

  describe('console context menu', function testContextMenu() {
    before(async () => {
      await PageObjects.common.navigateToApp('console');
      // Ensure that the text area can be interacted with
      await PageObjects.console.closeHelpIfExists();
      await PageObjects.console.clearTextArea();
    });

    it('should open context menu', async () => {
      expect(await PageObjects.console.isContextMenuOpen()).to.be(false);
      await PageObjects.console.enterRequest();
      await PageObjects.console.clickContextMenu();
      expect(PageObjects.console.isContextMenuOpen()).to.be.eql(true);
    });

    it('should have options to copy as curl, open documentation, and auto indent', async () => {
      await PageObjects.console.clickContextMenu();
      expect(PageObjects.console.isContextMenuOpen()).to.be.eql(true);
      expect(PageObjects.console.isCopyAsCurlButtonVisible()).to.be.eql(true);
      expect(PageObjects.console.isOpenDocumentationButtonVisible()).to.be.eql(true);
      expect(PageObjects.console.isAutoIndentButtonVisible()).to.be.eql(true);
    });

    it('should copy as curl and show toast when copy as curl button is clicked', async () => {
      await PageObjects.console.clickContextMenu();
      await PageObjects.console.clickCopyAsCurlButton();

      const resultToast = await toasts.getToastElement(1);
      const toastText = await resultToast.getVisibleText();

      if (toastText.includes('Write permission denied')) {
        log.debug('Write permission denied, skipping test');
        return;
      }

      expect(toastText).to.be('Request copied as cURL');

      const canReadClipboard = await browser.checkBrowserPermission('clipboard-read');
      if (canReadClipboard) {
        const clipboardText = await browser.getClipboardValue();
        expect(clipboardText).to.contain('curl -XGET');
      }
    });

    it('should open documentation when open documentation button is clicked', async () => {
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
      await PageObjects.console.clearTextArea();
      await PageObjects.console.enterRequest('GET _search\n{"query": {"match_all": {}}}');
      await PageObjects.console.clickContextMenu();
      await PageObjects.console.clickAutoIndentButton();
      // Retry until the request is auto indented
      await retry.try(async () => {
        const request = await PageObjects.console.getRequest();
        expect(request).to.be.eql('GET _search\n{\n  "query": {\n    "match_all": {}\n  }\n}');
      });
    });

    it('should condense when auto indent button is clicked again', async () => {
      await PageObjects.console.clickContextMenu();
      await PageObjects.console.clickAutoIndentButton();
      // Retry until the request is condensed
      await retry.try(async () => {
        const request = await PageObjects.console.getRequest();
        expect(request).to.be.eql('GET _search\n{"query":{"match_all":{}}}');
      });
    });
  });
}
