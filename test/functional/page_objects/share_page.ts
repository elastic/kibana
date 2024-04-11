/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FtrService } from '../ftr_provider_context';

export class SharePageObject extends FtrService {
  private readonly testSubjects = this.ctx.getService('testSubjects');
  private readonly find = this.ctx.getService('find');
  private readonly log = this.ctx.getService('log');

  async isShareMenuOpen() {
    return await this.testSubjects.exists('shareContextMenu');
  }

  async clickShareTopNavButton() {
    return this.testSubjects.click('shareTopNavButton');
  }

  async openShareMenuItem(itemTitle: string) {
    this.log.debug(`openShareMenuItem title:${itemTitle}`);
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
    const menuPanel = await this.find.byCssSelector('div.euiContextMenuPanel');
    await this.testSubjects.click(`sharePanel-${itemTitle.replace(' ', '')}`);
    await this.testSubjects.waitForDeleted(menuPanel);
  }

  /**
   * if there are more entries in the share menu, the permalinks entry has to be clicked first
   * else the selection isn't displayed. this happens if you're testing against an instance
   * with xpack features enabled, where there's also a csv sharing option
   * in a pure OSS environment, the permalinks sharing panel is displayed initially
   */
  async openPermaLinks() {
    if (await this.testSubjects.exists('sharePanel-Permalinks')) {
      await this.testSubjects.click(`sharePanel-Permalinks`);
    }
  }

  async getSharedUrl() {
    await this.openPermaLinks();
    return (await this.testSubjects.getAttribute('copyShareUrlButton', 'data-share-url')) ?? '';
  }

  async createShortUrlExistOrFail() {
    await this.testSubjects.existOrFail('createShortUrl');
  }

  async createShortUrlMissingOrFail() {
    await this.testSubjects.missingOrFail('createShortUrl');
  }

  async checkShortenUrl() {
    await this.openPermaLinks();
    const shareForm = await this.testSubjects.find('shareUrlForm');
    await this.testSubjects.setCheckbox('useShortUrl', 'check');
    await shareForm.waitForDeletedByCssSelector('.euiLoadingSpinner');
  }

  async exportAsSavedObject() {
    await this.openPermaLinks();
    return await this.testSubjects.click('exportAsSavedObject');
  }
}
