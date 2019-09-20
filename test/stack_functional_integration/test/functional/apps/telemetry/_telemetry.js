import expect from 'expect.js';

import {
  bdd
} from '../../../support';

import PageObjects from '../../../support/page_objects';

describe('telemetry', function () {

  before(function () {
    PageObjects.remote.setWindowSize(1200,800);
    PageObjects.common.debug('monitoring');
    return PageObjects.common.navigateToApp('monitoring');
  });

  it('should show banner Help us improve Kibana and Elasticsearch', function () {
    const expectedMessage =
      'Help us improve the Elastic Stack by providing usage statistics for basic features. We will not share this data outside of Elastic. Read more\nYes\nNo';
    return PageObjects.monitoring.getWelcome()
    .then(function (actualMessage) {
      PageObjects.common.debug(`X-Pack message = ${actualMessage}`);
      expect(actualMessage).to.be(expectedMessage);
    })
    .then(function () {
      return PageObjects.monitoring.optOutPhoneHome();
    });
  });

});
