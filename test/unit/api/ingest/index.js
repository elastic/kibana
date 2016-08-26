define(function (require) {
  const bdd = require('intern!bdd');
  const serverConfig = require('intern/dojo/node!../../../server_config');
  const ScenarioManager = require('intern/dojo/node!../../../fixtures/scenario_manager');
  let request = require('intern/dojo/node!supertest-as-promised');
  const url = require('intern/dojo/node!url');
  const post = require('./_post');
  const del = require('./_del');
  const data = require('./_data');
  const simulate = require('./_simulate');
  const processors = require('./_processors');
  const processorTypes = require('./processors/index');

  bdd.describe('ingest API', function () {
    const scenarioManager = new ScenarioManager(url.format(serverConfig.servers.elasticsearch));
    request = request(url.format(serverConfig.servers.kibana) + '/api');

    bdd.before(function () {
      return scenarioManager.load('emptyKibana');
    });

    bdd.after(function () {
      return scenarioManager.unload('emptyKibana');
    });

    post(bdd, scenarioManager, request);
    del(bdd, scenarioManager, request);
    data(bdd, scenarioManager, request);
    simulate(bdd, scenarioManager, request);
    processors(bdd, scenarioManager, request);
    processorTypes(bdd, scenarioManager, request);
  });
});
