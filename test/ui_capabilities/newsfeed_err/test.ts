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
import { FtrProviderContext } from '../../functional/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function uiCapabilitiesTests({ getService, getPageObjects }: FtrProviderContext) {
  const globalNav = getService('globalNav');
  const PageObjects = getPageObjects(['common', 'newsfeed']);

  describe('Newsfeed icon button handle errors', function() {
    this.tags('ciGroup6');

    before(async () => {
      await PageObjects.newsfeed.resetPage();
    });

    it('clicking on newsfeed icon should open you empty newsfeed', async () => {
      await globalNav.clickNewsfeed();
      const isOpen = await PageObjects.newsfeed.openNewsfeedPanel();
      expect(isOpen).to.be(true);

      const hasNewsfeedEmptyPanel = await PageObjects.newsfeed.openNewsfeedEmptyPanel();
      expect(hasNewsfeedEmptyPanel).to.be(true);
    });

    it('no red icon', async () => {
      const hasCheckedNews = await PageObjects.newsfeed.getRedButtonSign();
      expect(hasCheckedNews).to.be(false);
    });

    it('shows empty panel due to error response', async () => {
      const objects = await PageObjects.newsfeed.getNewsfeedList();
      expect(objects).to.eql([]);
    });

    it('clicking on newsfeed icon should close opened newsfeed', async () => {
      await globalNav.clickNewsfeed();
      const isOpen = await PageObjects.newsfeed.openNewsfeedPanel();
      expect(isOpen).to.be(false);
    });
  });
}
