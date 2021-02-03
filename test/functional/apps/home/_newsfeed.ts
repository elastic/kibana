/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const globalNav = getService('globalNav');
  const deployment = getService('deployment');
  const PageObjects = getPageObjects(['newsfeed']);

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

      if (await deployment.isOss()) {
        expect(objects).to.eql([
          '21 June 2019\nYou are functionally testing the newsfeed widget with fixtures!\nSee test/common/fixtures/plugins/newsfeed/newsfeed_simulation\nGeneric feed-viewer could go here',
          '21 June 2019\nStaging too!\nHello world\nGeneric feed-viewer could go here',
        ]);
      } else {
        // can't shim the API in cloud so going to check that at least something is rendered
        // to test that the API was called and returned something that could be rendered
        expect(objects.length).to.be.above(0);
      }
    });

    it('clicking on newsfeed icon should close opened newsfeed', async () => {
      await globalNav.clickNewsfeed();
      const isOpen = await PageObjects.newsfeed.openNewsfeedPanel();
      expect(isOpen).to.be(false);
    });
  });
}
