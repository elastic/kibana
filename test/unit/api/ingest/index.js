define(function (require) {
  let bdd = require('intern!bdd');
  let serverConfig = require('intern/dojo/node!../../../server_config');
  let ScenarioManager = require('intern/dojo/node!../../../fixtures/scenario_manager');
  let request = require('intern/dojo/node!supertest-as-promised');
  let url = require('intern/dojo/node!url');
  let _ = require('intern/dojo/node!lodash');
  let expect = require('intern/dojo/node!expect.js');
  let post = require('./_post');
  let del = require('./_del');
  let data = require('./_data');
  let simulate = require('./_simulate');
  let processors = require('./_processors');
  let processorTypes = require('./processors/index');

  bdd.describe('ingest API', function () {
    let scenarioManager = new ScenarioManager(url.format(serverConfig.servers.elasticsearch));
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
