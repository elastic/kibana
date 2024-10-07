/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { setTimeout as setTimeoutAsync } from 'timers/promises';
import { FtrService } from '../ftr_provider_context';

export class NewsfeedPageObject extends FtrService {
  private readonly log = this.ctx.getService('log');
  private readonly find = this.ctx.getService('find');
  private readonly retry = this.ctx.getService('retry');
  private readonly flyout = this.ctx.getService('flyout');
  private readonly testSubjects = this.ctx.getService('testSubjects');
  private readonly common = this.ctx.getPageObject('common');

  async sleep(sleepMilliseconds: number) {
    await setTimeoutAsync(sleepMilliseconds);
  }

  async resetPage() {
    await this.common.navigateToApp('home');
  }

  async closeNewsfeedPanel() {
    await this.flyout.ensureClosed('NewsfeedFlyout');
    this.log.debug('clickNewsfeed icon');
    await this.retry.waitFor('newsfeed flyout', async () => {
      if (await this.testSubjects.exists('NewsfeedFlyout')) {
        await this.testSubjects.click('NewsfeedFlyout > euiFlyoutCloseButton');
        return false;
      }
      return true;
    });
  }

  async openNewsfeedPanel() {
    this.log.debug('clickNewsfeed icon');
    return await this.testSubjects.exists('NewsfeedFlyout');
  }

  async getRedButtonSign() {
    return await this.find.existsByCssSelector('.euiHeaderSectionItemButton__notification--dot');
  }

  async getNewsfeedList() {
    const list = await this.testSubjects.find('NewsfeedFlyout');
    const cells = await list.findAllByTestSubject('newsHeadAlert');

    const objects = [];
    for (const cell of cells) {
      objects.push(await cell.getVisibleText());
    }

    return objects;
  }

  async openNewsfeedEmptyPanel() {
    return await this.testSubjects.exists('emptyNewsfeed');
  }
}
