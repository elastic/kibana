
import expect from 'expect.js';

import {
  bdd
} from '../../../support';

import PageObjects from '../../../support/page_objects';

bdd.describe('monitoring app', function describeIndexTests() {

  bdd.before(async function () {
    PageObjects.remote.setWindowSize(1200,800);
    if (varHashMap.SECURITY === 'YES') {
      await PageObjects.shield.logout();
      PageObjects.common.debug('varHashMap.SECURITY === YES so log in as elastic superuser to enable monitoring');
      // Tests may be running as a non-superuser like `power` but that user
      // doesn't have the cluster privs to enable monitoring.
      // On the SAML config, this will fail, but the test recovers on the next
      // navigate and logs in as the saml user.
    }
    // navigateToApp without a username and password will default to the superuser
    await PageObjects.common.navigateToApp('monitoring');
  });

  bdd.it('should enable Monitoring', function () {
    return PageObjects.monitoring.enableMonitoring();
  });

  bdd.after(async function () {
    if (varHashMap.SECURITY === 'YES') {
      await PageObjects.shield.logout();
    }
  })

});
