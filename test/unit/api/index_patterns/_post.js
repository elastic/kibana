define(function (require) {
  var Promise = require('bluebird');
  var createTestData = require('intern/dojo/node!../../../unit/api/index_patterns/data');
  var _ = require('intern/dojo/node!lodash');
  var expect = require('intern/dojo/node!expect.js');

  return function (bdd, scenarioManager, request) {
    bdd.describe('POST index_patterns', function postIndexPatterns() {

      bdd.beforeEach(function () {
        return scenarioManager.reload('emptyKibana');
      });

      bdd.afterEach(function () {
        return request.del('/kibana/index_patterns/logstash-*');
      });

      bdd.it('should return 400 for an invalid payload', function invalidPayload() {
        return Promise.all([
          request.post('/kibana/index_patterns').expect(400),

          request.post('/kibana/index_patterns')
            .send({})
            .expect(400),

          request.post('/kibana/index_patterns')
            .send(_.set(createTestData().indexPattern, 'data.attributes.title', false))
            .expect(400),

          request.post('/kibana/index_patterns')
            .send(_.set(createTestData().indexPattern, 'data.attributes.fields', {}))
            .expect(400),

          // Fields must have a name and type
          request.post('/kibana/index_patterns')
            .send(_.set(createTestData().indexPattern, 'data.attributes.fields', [{count: 0}]))
            .expect(400)
        ]);
      });

      bdd.it('should return 201 when a pattern is successfully created', function createPattern() {
        return request.post('/kibana/index_patterns')
          .send(createTestData().indexPattern)
          .expect(201);
      });

      bdd.it('should create an index template if a fields array is included', function createTemplate() {
        return request.post('/kibana/index_patterns')
          .send(createTestData().indexPattern)
          .expect(201)
          .then(function () {
            return scenarioManager.client.indices.getTemplate({name: 'kibana-logstash-*'});
          });
      });

      bdd.it('should return 409 conflict when a pattern with the given ID already exists', function patternConflict() {
        return request.post('/kibana/index_patterns')
          .send(createTestData().indexPattern)
          .expect(201)
          .then(function () {
            return request.post('/kibana/index_patterns')
              .send(createTestData().indexPattern)
              .expect(409);
          });
      });


      bdd.it('should return 409 conflict when an index template with the given ID already exists', function templateConflict() {
        return scenarioManager.client.indices.putTemplate({
          name: 'kibana-logstash-*', body: {
            template: 'logstash-*'
          }
        }).then(function () {
          return request.post('/kibana/index_patterns')
            .send(createTestData().indexPattern)
            .expect(409);
        })
        .then(function () {
          return scenarioManager.client.indices.deleteTemplate({
            name: 'kibana-logstash-*'
          });
        });
      });

      bdd.it('should return 409 conflict when the pattern matches existing indices',
        function existingIndicesConflict() {
          var pattern = createTestData().indexPattern;
          pattern.data.id = pattern.data.attributes.title = '.kib*';

          return request.post('/kibana/index_patterns')
            .send(pattern)
            .expect(409);
        });

      bdd.it('should enforce snake_case in the request body', function () {
        var pattern = createTestData().indexPattern;
        pattern.data.attributes = _.mapKeys(pattern.data.attributes, function (value, key) {
          return _.camelCase(key);
        });

        return request.post('/kibana/index_patterns')
          .send(pattern)
          .expect(400);
      });

    });

  };
});
