import expect from 'expect.js';

import {
  bdd
} from '../../../support';

import PageObjects from '../../../support/page_objects';

bdd.describe('check heartbeat', function () {
  bdd.before(async function () {
    await PageObjects.common.tryForTime(120000, async function () {
      await PageObjects.common.navigateToApp('settings', 'power', 'changeme');
      PageObjects.common.debug('create Index Pattern');
      await PageObjects.settings.createIndexPattern('heartbeat-*');
    });
    PageObjects.common.debug('navigateToApp Discover');
    return PageObjects.common.navigateToApp('discover');
  });

  bdd.it('heartbeat- should have hit count GT 0', async function () {
	   //  await PageObjects.header.clickDiscover();
    //await PageObjects.common.navigateToApp('discover');
    await PageObjects.discover.selectIndexPattern('heartbeat-*');
    await PageObjects.common.tryForTime(40000, async () => {
      await PageObjects.header.setQuickSpan('Today');
    });
    await PageObjects.common.tryForTime(40000, async () => {
      const hitCount = await PageObjects.discover.getHitCount();
      expect(hitCount).to.be.greaterThan('0');
    });
  });

});
