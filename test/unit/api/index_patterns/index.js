define(function (require) {
  var bdd = require('intern!bdd');
  var serverConfig = require('intern/dojo/node!../../../serverConfig');
  var ScenarioManager = require('intern/dojo/node!../../../fixtures/scenarioManager');
  var request = require('intern/dojo/node!supertest-as-promised');
  var url = require('intern/dojo/node!url');
  var _ = require('intern/dojo/node!lodash');
  var expect = require('intern/dojo/node!expect.js');
  var post = require('./_post');
  var get = require('./_get');
  var put = require('./_put');
  var del = require('./_del');

  bdd.describe('index_patterns API', function () {
    var scenarioManager = new ScenarioManager(url.format(serverConfig.servers.elasticsearch));
    request = request(url.format(serverConfig.servers.kibana) + '/api');

    bdd.before(function () {
      return scenarioManager.load('emptyKibana');
    });

    bdd.after(function () {
      return scenarioManager.unload('emptyKibana');
    });

    get(bdd, scenarioManager, request);
    post(bdd, scenarioManager, request);
    put(bdd, scenarioManager, request);
    del(bdd, scenarioManager, request);
  });
});
