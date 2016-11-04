import {
  bdd,
  scenarioManager,
  esClient,
  elasticDump
} from '../../../support';

import PageObjects from '../../../support/page_objects';

const expect = require('expect.js');

bdd.describe('source filters', function describeIndexTests() {
  bdd.before(function () {

    const fromTime = '2015-09-19 06:31:44.000';
    const toTime = '2015-09-23 18:31:44.000';

    // delete .kibana index and update configDoc
    return esClient.deleteAndUpdateConfigDoc({'dateFormat:tz':'UTC', 'defaultIndex':'logstash-*'})
    .then(function loadkibanaIndexPattern() {
      PageObjects.common.debug('load kibana index with default index pattern');
      return elasticDump.elasticLoad('visualize_source-filters','.kibana');
    })
    // and load a set of makelogs data
    .then(function loadIfEmptyMakelogs() {
      return scenarioManager.loadIfEmpty('logstashFunctional');
    })
    .then(function () {
      PageObjects.common.debug('discover');
      return PageObjects.common.navigateToApp('discover');
    })
    .then(function () {
      PageObjects.common.debug('setAbsoluteRange');
      return PageObjects.header.setAbsoluteRange(fromTime, toTime);
    })
    .then(function () {
      //After hiding the time picker, we need to wait for
      //the refresh button to hide before clicking the share button
      return PageObjects.common.sleep(1000);
    });
  });

  bdd.it('should not get the field referer', function () {
    return PageObjects.discover.getAllFieldNames()
    .then(function (fieldNames) {
      expect(fieldNames).to.not.contain('referer');
      const relatedContentFields = fieldNames.filter((fieldName) => fieldName.indexOf('relatedContent') === 0);
      expect(relatedContentFields).to.have.length(0);
    });
  });
});
