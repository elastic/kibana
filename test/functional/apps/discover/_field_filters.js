import {
  bdd,
  common,
  discoverPage,
  headerPage,
  settingsPage,
  scenarioManager,
  esClient,
  elasticDump
} from '../../../support';

var expect = require('expect.js');

bdd.describe('field filters', function describeIndexTests() {
  bdd.before(function () {

    var fromTime = '2015-09-19 06:31:44.000';
    var toTime = '2015-09-23 18:31:44.000';

    // delete .kibana index and update configDoc
    return esClient.deleteAndUpdateConfigDoc({'dateFormat:tz':'UTC', 'defaultIndex':'logstash-*'})
    .then(function loadkibanaIndexPattern() {
      common.debug('load kibana index with default index pattern');
      return elasticDump.elasticLoad('visualize_field-filters','.kibana');
    })
    // and load a set of makelogs data
    .then(function loadIfEmptyMakelogs() {
      return scenarioManager.loadIfEmpty('logstashFunctional');
    })
    .then(function () {
      common.debug('discover');
      return common.navigateToApp('discover');
    })
    .then(function () {
      common.debug('setAbsoluteRange');
      return headerPage.setAbsoluteRange(fromTime, toTime);
    })
    .then(function () {
      //After hiding the time picker, we need to wait for
      //the refresh button to hide before clicking the share button
      return common.sleep(1000);
    })
    .catch(common.handleError(this));
  });


  bdd.describe('field filters', function () {

    bdd.it('should not get the field referer', function () {
      return discoverPage.getAllFieldNames()
      .then(function (fieldNames) {
        expect(fieldNames).to.not.contain('referer');
      })
      .catch(common.handleError(this));
    });

  });
});
