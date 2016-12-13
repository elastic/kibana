define(function (require) {
  const bdd = require('intern!bdd');
  const serverConfig = require('intern/dojo/node!../../../server_config');
  const ScenarioManager = require('intern/dojo/node!../../../fixtures/scenario_manager');
  let request = require('intern/dojo/node!supertest-as-promised');
  const url = require('intern/dojo/node!url');
  const count = require('./_count');

  bdd.describe('search API', function () {
    const scenarioManager = new ScenarioManager(url.format(serverConfig.servers.elasticsearch));
    request = request(url.format(serverConfig.servers.kibana) + '/api');

    bdd.before(function () {
      return scenarioManager.load('emptyKibana');
    });

    bdd.after(function () {
      return scenarioManager.unload('emptyKibana');
    });

    count(bdd, scenarioManager, request);
  });
});
