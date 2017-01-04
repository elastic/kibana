define(function (require) {
  var bdd = require('intern!bdd');
  var serverConfig = require('intern/dojo/node!../../../server_config');
  var ScenarioManager = require('intern/dojo/node!../../../fixtures/scenario_manager');
  var request = require('intern/dojo/node!supertest-as-promised');
  var url = require('intern/dojo/node!url');
  var expect = require('intern/dojo/node!expect.js');
  var pipeline = require('./_pipeline');

  bdd.describe('pipelines API', function () {
    var scenarioManager = new ScenarioManager(url.format(serverConfig.servers.elasticsearch));
    request = request(url.format(serverConfig.servers.kibana) + '/api');

    bdd.before(function () {
      return scenarioManager.load('emptyKibana');
    });

    bdd.after(function () {
      return scenarioManager.unload('emptyKibana');
    });

    pipeline(bdd, scenarioManager, request);
  });
});
