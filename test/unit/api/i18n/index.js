define(function (require) {
  var bdd = require('intern!bdd');
  var serverConfig = require('intern/dojo/node!../../../server_config');
  var ScenarioManager = require('intern/dojo/node!../../../fixtures/scenario_manager');
  var request = require('intern/dojo/node!supertest-as-promised');
  var url = require('intern/dojo/node!url');
  var _ = require('intern/dojo/node!lodash');
  var expect = require('intern/dojo/node!expect.js');
  var get = require('./_get');

  bdd.describe('i18n API', function () {
    var scenarioManager = new ScenarioManager(url.format(serverConfig.servers.elasticsearch));
    request = request(url.format(serverConfig.servers.kibana) + '/api');
    console.log('i18n bdd request: ', request);

    bdd.before(function () {
      return scenarioManager.load('emptyKibana');
    });

    bdd.after(function () {
      return scenarioManager.unload('emptyKibana');
    });

    get(bdd, scenarioManager, request);
  });
});
