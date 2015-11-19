define(function (require) {
  var bdd = require('intern!bdd');
  var config = require('intern').config;
  var ScenarioManager = require('intern/dojo/node!../../../fixtures/scenarioManager');
  var request = require('intern/dojo/node!supertest-as-promised');
  var url = require('intern/dojo/node!url');
  var Promise = require('bluebird');
  var createTestData = require('intern/dojo/node!../../../unit/api/index_patterns/data');
  var _ = require('intern/dojo/node!lodash');
  var expect = require('intern/dojo/node!expect.js');


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

      bdd.beforeEach(function () {
        return scenarioManager.reload('emptyKibana');
      });

      bdd.afterEach(function () {
        return request.del('/index-patterns/logstash-*');
      });

      bdd.it('should return 400 for an invalid payload', function invalidPayload() {
        return Promise.all([
          request.post('/index-patterns').expect(400),

          request.post('/index-patterns')
            .send({})
            .expect(400),

          request.post('/index-patterns')
            .send(_.assign(createTestData().indexPatternWithMappings, {title: false}))
            .expect(400),

          request.post('/index-patterns')
            .send(_.assign(createTestData().indexPatternWithMappings, {fields: {}}))
            .expect(400),

          request.post('/index-patterns')
            .send(_.assign(createTestData().indexPatternWithMappings, {fields: [{count: 0}]}))
            .expect(400)
        ]);
      });

      bdd.it('should return 201 when a pattern is successfully created', function createPattern() {
        return request.post('/index-patterns')
          .send(createTestData().indexPatternWithMappings)
          .expect(201);
      });

      bdd.it('should create an index template if mappings are provided', function createTemplate() {
        return request.post('/index-patterns')
          .send(createTestData().indexPatternWithMappings)
          .expect(201)
          .then(function () {
            return scenarioManager.client.indices.getTemplate({name: 'kibana-logstash-*'});
          });
      });

      bdd.it('should NOT create an index template if mappings are NOT provided', function noMappings() {
        var pattern = createTestData().indexPatternWithMappings;
        pattern.fields = _.map(pattern.fields, function (field) {
          return _.omit(field, 'mapping');
        });

        return request.post('/index-patterns')
          .send(pattern)
          .expect(201)
          .then(function () {
            return scenarioManager.client.indices.getTemplate({name: 'kibana-logstash-*'});
          })
          .then(function () {
            throw new Error('Template was created');
          }, function (error) {
            expect(error.status).to.be(404);
          });
      });

      bdd.it('should NOT create an index template if pattern does not contain a wildcard', function noWildcard() {
        var pattern = createTestData().indexPatternWithMappings;
        pattern.title = 'notawildcard';

        return request.post('/index-patterns')
          .send(pattern)
          .expect(201)
          .then(function () {
            return scenarioManager.client.indices.getTemplate({name: 'kibana-notawildcard'});
          })
          .then(function () {
            throw new Error('Template was created');
          }, function (error) {
            expect(error.status).to.be(404);
          });
      });

      bdd.it('should return 409 conflict when a pattern with the given ID already exists', function patternConflict() {
        return request.post('/index-patterns')
          .send(createTestData().indexPatternWithMappings)
          .expect(201)
          .then(function () {
            return request.post('/index-patterns')
              .send(createTestData().indexPatternWithMappings)
              .expect(409);
          });
      });


      bdd.it('should return 409 conflict when an index template with the given ID already exists', function templateConflict() {
        return scenarioManager.client.indices.putTemplate({
          name: 'kibana-logstash-*', body: {
            template: 'logstash-*'
          }
        }).then(function () {
          return request.post('/index-patterns')
            .send(createTestData().indexPatternWithMappings)
            .expect(409);
        });
      });

      bdd.it('should return 409 conflict when mappings are provided with a pattern that matches existing indices',
        function templateConflict() {
          var pattern = createTestData().indexPatternWithMappings;
          pattern.title = '.kib*';

          return request.post('/index-patterns')
            .send(pattern)
            .expect(409);
        });

      bdd.it('should return 201 created successfully if a pattern matches existing indices but has NO mappings',
        function existingIndicesNoMappings() {
          var pattern = createTestData().indexPatternWithMappings;
          pattern.fields = _.map(pattern.fields, function (field) {
            return _.omit(field, 'mapping');
          });
          pattern.title = '.kib*';

          return request.post('/index-patterns')
            .send(pattern)
            .expect(201);
        });

    });

  });
});
