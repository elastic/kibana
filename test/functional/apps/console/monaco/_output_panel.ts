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
  const log = getService('log');
  const toasts = getService('toasts');
  const browser = getService('browser');
  const PageObjects = getPageObjects(['common', 'console', 'header']);

  describe('console output panel', function describeIndexTests() {
    before(async () => {
      log.debug('navigateTo console');
      await PageObjects.common.navigateToApp('console');
      await PageObjects.console.closeHelpIfExists();
    });

    beforeEach(async () => {
      await PageObjects.console.closeHelpIfExists();
      await PageObjects.console.monaco.clearEditorText();
    });

    const sendRequest = async (request: string) => {
      await PageObjects.console.monaco.enterText(request);
      await PageObjects.console.clickPlay();
      await PageObjects.header.waitUntilLoadingHasFinished();
    };

    it('should be able to copy the response of a request', async () => {
      await sendRequest('GET /_search?pretty');

      await PageObjects.console.clickCopyOutput();

      const resultToast = await toasts.getElementByIndex(1);
      const toastText = await resultToast.getVisibleText();

      expect(toastText).to.be('Selected output copied to clipboard');

      const canReadClipboard = await browser.checkBrowserPermission('clipboard-read');
      if (canReadClipboard) {
        const clipboardText = await browser.getClipboardValue();
        expect(clipboardText).to.contain('"successful":');
      }
    });
  });
}
