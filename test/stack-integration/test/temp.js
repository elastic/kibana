define(function (require) {
  var bdd = require('intern!bdd');
  var expect = require('intern/dojo/node!expect.js');
  var config = require('intern').config;
  var url = require('intern/dojo/node!url');
  var _ = require('intern/dojo/node!lodash');
  var Common = require('../../../../kibana/test/support/pages/common');
  var HeaderPage = require('../../../../kibana/test/support/pages/header_page');
  var SettingsPage = require('../../../../kibana/test/support/pages/settings_page');
  var DashboardPage = require('../../../../kibana/test/support/pages/dashboard_page');


  bdd.describe('dashboard app', function () {
    var common;
    var scenarioManager;
    var remote;
    var headerPage;
    var settingsPage;
    var dashboardPage;
    // var scenarioManager = new ScenarioManager(url.format(config.servers.elasticsearch));
    this.timeout = config.timeouts.default;

    // on setup, we create an settingsPage instance
    // that we will use for all the tests
    bdd.before(function () {
      var self = this;
      remote.setWindowSize(1200,800);
      common = new Common(this.remote);
      remote = this.remote;
      headerPage = new HeaderPage(this.remote);
      settingsPage = new SettingsPage(this.remote);
      dashboardPage = new DashboardPage(this.remote);
      remote = this.remote;

      common.debug('navigateTo');
      return settingsPage.navigateTo()
      .then(function () {
        common.debug('navigateToApp dashboard');
        return common.navigateToApp('dashboard');
      })
      .catch(common.handleError(this));
    });

    bdd.describe('saved Dashboards', function indexPatternCreation() {

      bdd.it('should have the Topbeat-Dashboard', function pageHeader() {
        common.debug('loadSavedDashboard');
        return dashboardPage.loadSavedDashboard('Topbeat-Dashboard')
        .catch(common.handleError(this));
      });

      bdd.it('the Topbeat-Dashboard should have the correct 10 visualizations', function pageHeader() {
        var expectedTitles = ['Navigation','System load','Process status','Memory usage','CPU usage',
        'CPU usage per process','Memory usage per process','Top processes','Servers','Disk utilization over time'];

        return common.tryForTime(10000, function () {
          return dashboardPage.getPanelTitles()
          .then(function checkTitles(actualTitles) {
            common.debug('actual Titles = ' + actualTitles);
            expect(actualTitles).to.eql(expectedTitles);
          });
        })
        .catch(common.handleError(this));
      });
    });
  });
});
