define(function (require) {
  var bdd = require('intern!bdd');
  var serverConfig = require('intern/dojo/node!../../../server_config');
  var ScenarioManager = require('intern/dojo/node!../../../fixtures/scenario_manager');
  var request = require('intern/dojo/node!supertest-as-promised');
  var url = require('intern/dojo/node!url');
  var _ = require('intern/dojo/node!lodash');
  var expect = require('intern/dojo/node!expect.js');
  var post = require('./_post');
  var del = require('./_del');
  var data = require('./_data');
  var simulate = require('./_simulate');
  var processors = require('./_processors');
  var processorTypes = require('./processors/index');

  bdd.describe('ingest API', function () {
    var scenarioManager = new ScenarioManager(url.format(serverConfig.servers.elasticsearch));
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
