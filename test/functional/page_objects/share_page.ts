/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FtrProviderContext } from '../ftr_provider_context';

export function SharePageProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const find = getService('find');
  const log = getService('log');

  class SharePage {
    async isShareMenuOpen() {
      return await testSubjects.exists('shareContextMenu');
    }

    async clickShareTopNavButton() {
      return testSubjects.click('shareTopNavButton');
    }

    async openShareMenuItem(itemTitle: string) {
      log.debug(`openShareMenuItem title:${itemTitle}`);
      const isShareMenuOpen = await this.isShareMenuOpen();
      if (!isShareMenuOpen) {
        await this.clickShareTopNavButton();
      } else {
        // there is no easy way to ensure the menu is at the top level
        // so just close the existing menu
        await this.clickShareTopNavButton();
        // and then re-open the menu
        await this.clickShareTopNavButton();
      }
      const menuPanel = await find.byCssSelector('div.euiContextMenuPanel');
      await testSubjects.click(`sharePanel-${itemTitle.replace(' ', '')}`);
      await testSubjects.waitForDeleted(menuPanel);
    }

    /**
     * if there are more entries in the share menu, the permalinks entry has to be clicked first
     * else the selection isn't displayed. this happens if you're testing against an instance
     * with xpack features enabled, where there's also a csv sharing option
     * in a pure OSS environment, the permalinks sharing panel is displayed initially
     */
    async openPermaLinks() {
      if (await testSubjects.exists('sharePanel-Permalinks')) {
        await testSubjects.click(`sharePanel-Permalinks`);
      }
    }

    async getSharedUrl() {
      await this.openPermaLinks();
      return await testSubjects.getAttribute('copyShareUrlButton', 'data-share-url');
    }

    async createShortUrlExistOrFail() {
      await testSubjects.existOrFail('createShortUrl');
    }

    async createShortUrlMissingOrFail() {
      await testSubjects.missingOrFail('createShortUrl');
    }

    async checkShortenUrl() {
      await this.openPermaLinks();
      const shareForm = await testSubjects.find('shareUrlForm');
      await testSubjects.setCheckbox('useShortUrl', 'check');
      await shareForm.waitForDeletedByCssSelector('.euiLoadingSpinner');
    }

    async exportAsSavedObject() {
      await this.openPermaLinks();
      return await testSubjects.click('exportAsSavedObject');
    }
  }

  return new SharePage();
}
