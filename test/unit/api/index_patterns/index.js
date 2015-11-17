define(function (require) {
  var bdd = require('intern!bdd');
  var config = require('intern').config;
  var ScenarioManager = require('intern/dojo/node!../../../fixtures/scenarioManager');
  var request = require('intern/dojo/node!supertest-as-promised');
  var url = require('intern/dojo/node!url');

  bdd.describe('index-patterns API', function () {
    var scenarioManager = new ScenarioManager(url.format(config.servers.elasticsearch));

    bdd.before(function () {
      request = request(url.format(config.servers.kibana) + '/api');
      return scenarioManager.load('emptyKibana');
    });

    bdd.after(function () {
      return scenarioManager.unload('emptyKibana');
    });

    bdd.describe('GET index-patterns', function getIndexPatterns() {

      bdd.it('GET should return 200', function return200() {
        return request.get('/index-patterns').expect(200);
      });

    });

    bdd.describe('POST index-patterns', function postIndexPatterns() {

      bdd.it('should return 400 for a missing payload', function missingPayload() {
        return request.post('/index-patterns')
          .send({})
          .expect(400);
      });

    });

  });
});
