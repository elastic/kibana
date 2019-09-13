import expect from 'expect.js';

import {
  bdd
} from '../../../support';

import PageObjects from '../../../support/page_objects';

bdd.describe('check filebeat', function () {
  bdd.before(function () {
    PageObjects.common.debug('navigateToApp Discover');
    //return PageObjects.common.navigateToApp('discover');
  });

  bdd.it('filebeat- should have hit count GT 0', async function () {
	   //  await PageObjects.header.clickDiscover();
    //await PageObjects.common.navigateToApp('discover');
    await PageObjects.discover.selectIndexPattern('filebeat-*');
    await PageObjects.common.tryForTime(40000, async () => {
      await PageObjects.header.setQuickSpan('Today');
    });
    await PageObjects.common.tryForTime(40000, async () => {
      const hitCount = await PageObjects.discover.getHitCount();
      expect(hitCount).to.be.greaterThan('0');
    });
  });

});
