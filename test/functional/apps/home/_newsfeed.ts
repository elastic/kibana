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

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function({ getService, getPageObjects }: FtrProviderContext) {
  const globalNav = getService('globalNav');
  const PageObjects = getPageObjects(['common', 'newsfeed']);

  describe('Newsfeed', () => {
    before(async () => {
      await PageObjects.newsfeed.resetPage();
    });

    it('has red icon which is a sign of not checked news', async () => {
      const hasCheckedNews = await PageObjects.newsfeed.getRedButtonSign();
      expect(hasCheckedNews).to.be(true);
    });

    it('clicking on newsfeed icon should open you newsfeed', async () => {
      await globalNav.clickNewsfeed();
      const isOpen = await PageObjects.newsfeed.openNewsfeedPanel();
      expect(isOpen).to.be(true);
    });

    it('no red icon, because all news is checked', async () => {
      const hasCheckedNews = await PageObjects.newsfeed.getRedButtonSign();
      expect(hasCheckedNews).to.be(false);
    });

    it('shows all news from newsfeed', async () => {
      const objects = await PageObjects.newsfeed.getNewsfeedList();
      expect(objects).to.eql([
        '21 June 2019\nYou are functionally testing the newsfeed widget with fixtures!\nSee test/common/fixtures/plugins/newsfeed/newsfeed_simulation\nGeneric feed-viewer could go here',
        '21 June 2019\nStaging too!\nHello world\nGeneric feed-viewer could go here',
      ]);
    });

    it('clicking on newsfeed icon should close opened newsfeed', async () => {
      await globalNav.clickNewsfeed();
      const isOpen = await PageObjects.newsfeed.openNewsfeedPanel();
      expect(isOpen).to.be(false);
    });
  });
}
