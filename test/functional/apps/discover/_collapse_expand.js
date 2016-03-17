define(function (require) {
  var Common = require('../../../support/pages/common');
  var HeaderPage = require('../../../support/pages/header_page');
  var SettingsPage = require('../../../support/pages/settings_page');
  var DiscoverPage = require('../../../support/pages/discover_page');
  var expect = require('intern/dojo/node!expect.js');

  return function (bdd, scenarioManager) {
    bdd.describe('discover tab', function describeIndexTests() {
      var common;
      var headerPage;
      var settingsPage;
      var discoverPage;
      var baseUrl;

      bdd.before(function () {
        common = new Common(this.remote);
        headerPage = new HeaderPage(this.remote);
        settingsPage = new SettingsPage(this.remote);
        discoverPage = new DiscoverPage(this.remote);

        baseUrl = common.getHostPort();

        var fromTime = '2015-09-19 06:31:44.000';
        var toTime = '2015-09-23 18:31:44.000';

        // start each test with an empty kibana index
        return scenarioManager.reload('emptyKibana')
        // and load a set of makelogs data
        .then(function loadIfEmptyMakelogs() {
          return scenarioManager.loadIfEmpty('logstashFunctional');
        })
        .then(function (navigateTo) {
          common.debug('navigateTo');
          return settingsPage.navigateTo();
        })
        .then(function () {
          common.debug('createIndexPattern');
          return settingsPage.createIndexPattern();
        })
        .then(function () {
          common.debug('discover');
          return common.navigateToApp('discover');
        })
        .then(function () {
          common.debug('setAbsoluteRange');
          return headerPage.setAbsoluteRange(fromTime, toTime);
        })
        .catch(common.handleError(this));
      });

      bdd.describe('field data', function () {

        bdd.it('should initially be expanded', function () {
          return discoverPage.getSidebarWidth()
            .then(function (width) {
              common.debug('expanded sidebar width = ' + width);
              expect(width > 180).to.be(true);
            })
            .catch(common.handleError(this));
        });

        bdd.it('should collapse when clicked', function () {
          return discoverPage.toggleSidebarCollapse()
            .then(function () {
              common.debug('discoverPage.getSidebarWidth()');
              return discoverPage.getSidebarWidth();
            })
            .then(function (width) {
              common.debug('collapsed sidebar width = ' + width);
              expect(width < 20).to.be(true);
            })
            .catch(common.handleError(this));
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
            })
            .catch(common.handleError(this));
        });

      });

    });
  };
});
