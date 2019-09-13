
import expect from 'expect.js';

import {
  bdd,
  config
} from '../../../support';

import PageObjects from '../../../support/page_objects';

bdd.describe('eCommerce Sample Data', function sampleData() {

  bdd.before(async function () {
    // PageObjects.common.debug('navigateToApp visualize');
    await PageObjects.common.navigateToApp('sampledata');
    await PageObjects.common.sleep(3000);
  });

  bdd.it('install eCommerce sample data', async function installECommerceData() {
    await PageObjects.common.findTestSubject('addSampleDataSetecommerce').click();
    await PageObjects.common.sleep(5000);
    // verify it's installed by finding the remove link
    await PageObjects.common.findTestSubject('removeSampleDataSetecommerce');
  });

});
