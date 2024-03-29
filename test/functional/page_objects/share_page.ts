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

  async closeShareModal() {
    if (await this.isShareModalOpen()) {
      await this.find.clickByCssSelector(
        '[data-test-subj="shareContextModal"] .euiModal__closeIcon'
      );
    }
  }

  async clickTab(content: string) {
    if (!(await this.isShareModalOpen())) {
      await this.clickShareTopNavButton();
    }
    await (await this.find.byButtonText(content)).click();
  }

  async isShareMenuOpen() {
    return await this.testSubjects.exists('shareContextMenu');
  }

  async isShareModalOpen() {
    return await this.testSubjects.exists('shareContextModal');
  }

  async clickShareTopNavButton() {
    return this.testSubjects.click('shareTopNavButton');
  }

  async openShareModalItem(itemTitle: string) {
    this.log.debug(`openShareModalItem title: ${itemTitle}`);
    const isShareModalOpen = await this.isShareModalOpen();
    if (!isShareModalOpen) {
      await this.clickShareTopNavButton();
    }
    await this.testSubjects.click(itemTitle);
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

  async checkOldVersion() {
    await this.clickShareTopNavButton();
    if (await this.testSubjects.find('shareContextModal')) {
      this.log.debug('This is the new share context modal');
      await this.closeShareModal();
      return false;
    }
    return true;
  }

  async getSharedUrl() {
    return await this.testSubjects.getAttribute('copyShareUrlButton', 'data-share-url');
  }

  async createShortUrlExistOrFail() {
    await this.testSubjects.existOrFail('createShortUrl');
  }

  async createShortUrlMissingOrFail() {
    await this.testSubjects.missingOrFail('createShortUrl');
  }

  async checkShortenUrl() {
    const shareForm = await this.testSubjects.find('shareUrlForm');
    await this.testSubjects.setCheckbox('useShortUrl', 'check');
    await shareForm.waitForDeletedByCssSelector('.euiLoadingSpinner');
  }
}
