define(function (require) {
  var bdd = require('intern!bdd');
  var config = require('intern').config;
  var url = require('intern/dojo/node!url');
  var ScenarioManager = require('intern/dojo/node!../../../fixtures/scenario_manager');

  var initialStateTest = require('./_initial_state');
  var creationChangesTest = require('./_creation_form_changes');
  var indexPatternCreateDeleteTest = require('./_index_pattern_create_delete');
  var indexPatternResultsSortTest = require('./_index_pattern_results_sort');
  var indexPatternPopularityTest = require('./_index_pattern_popularity');
  var advancedSettingsTest = require('./_advanced_settings');

  bdd.describe('settings app', function () {
    var scenarioManager = new ScenarioManager(url.format(config.servers.elasticsearch));
    this.timeout = config.timeouts.default;

    // on setup, we create an settingsPage instance
    // that we will use for all the tests
    bdd.before(function () {
      return scenarioManager.reload('emptyKibana')
      .then(function () {
        return scenarioManager.loadIfEmpty('makelogs');
      });
    });

    bdd.after(function () {
      return scenarioManager.unload('makelogs')
      .then(function () {
        scenarioManager.unload('emptyKibana');
      });
    });

    advancedSettingsTest(bdd, scenarioManager);
    initialStateTest(bdd, scenarioManager);
    creationChangesTest(bdd, scenarioManager);
    indexPatternCreateDeleteTest(bdd, scenarioManager);
    indexPatternResultsSortTest(bdd, scenarioManager);
    indexPatternPopularityTest(bdd, scenarioManager);
  });
});
