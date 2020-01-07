/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
