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

export function NewsfeedPageProvider({ getService, getPageObjects }: FtrProviderContext) {
  const log = getService('log');
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
      return await testSubjects.exists('showBadgeNews');
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
