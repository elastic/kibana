/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { FtrProviderContext } from '../ftr_provider_context';

export function NewsfeedPageProvider({ getService, getPageObjects }: FtrProviderContext) {
  const log = getService('log');
  const find = getService('find');
  const retry = getService('retry');
  const flyout = getService('flyout');
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['common']);

  class NewsfeedPage {
    async resetPage() {
      await PageObjects.common.navigateToUrl('home', '', { useActualUrl: true });
    }

    async closeNewsfeedPanel() {
      await flyout.ensureClosed('NewsfeedFlyout');
      log.debug('clickNewsfeed icon');
      await retry.waitFor('newsfeed flyout', async () => {
        if (await testSubjects.exists('NewsfeedFlyout')) {
          await testSubjects.click('NewsfeedFlyout > euiFlyoutCloseButton');
          return false;
        }
        return true;
      });
    }

    async openNewsfeedPanel() {
      log.debug('clickNewsfeed icon');
      return await testSubjects.exists('NewsfeedFlyout');
    }

    async getRedButtonSign() {
      return await find.existsByCssSelector('.euiHeaderSectionItemButton__notification--dot');
    }

    async getNewsfeedList() {
      const list = await testSubjects.find('NewsfeedFlyout');
      const cells = await list.findAllByTestSubject('newsHeadAlert');

      const objects = [];
      for (const cell of cells) {
        objects.push(await cell.getVisibleText());
      }

      return objects;
    }

    async openNewsfeedEmptyPanel() {
      return await testSubjects.exists('emptyNewsfeed');
    }
  }

  return new NewsfeedPage();
}
