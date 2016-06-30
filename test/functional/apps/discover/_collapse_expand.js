import {
  bdd,
  common,
  discoverPage,
  headerPage,
  scenarioManager,
  settingsPage,
  esClient,
  elasticDump
} from '../../../support';

var expect = require('expect.js');

bdd.describe('discover tab', function describeIndexTests() {
  bdd.before(function () {
    var fromTime = '2015-09-19 06:31:44.000';
    var toTime = '2015-09-23 18:31:44.000';

    // delete .kibana index and update configDoc
    return esClient.deleteAndUpdateConfigDoc({'dateFormat:tz':'UTC', 'defaultIndex':'logstash-*'})
    .then(function loadkibanaIndexPattern() {
      common.debug('load kibana index with default index pattern');
      return elasticDump.elasticLoad('visualize','.kibana');
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
    });
  });

  bdd.describe('field data', function () {
    bdd.it('should initially be expanded', function () {
      common.saveScreenshot('Discover-sidebar-expanded');
      return discoverPage.getSidebarWidth()
        .then(function (width) {
          common.debug('expanded sidebar width = ' + width);
          expect(width > 180).to.be(true);
        });
    });

    bdd.it('should collapse when clicked', function () {
      return discoverPage.toggleSidebarCollapse()
        .then(function () {
          common.saveScreenshot('Discover-sidebar-collapsed');
          common.debug('discoverPage.getSidebarWidth()');
          return discoverPage.getSidebarWidth();
        })
        .then(function (width) {
          common.debug('collapsed sidebar width = ' + width);
          expect(width < 20).to.be(true);
        });
    });

    bdd.it('should expand when clicked', function () {
      return discoverPage.toggleSidebarCollapse()
        .then(function () {
          common.debug('discoverPage.getSidebarWidth()');
          return discoverPage.getSidebarWidth();
        })
        .then(function (width) {
          common.debug('expanded sidebar width = ' + width);
          expect(width > 180).to.be(true);
        });
    });
  });
});
