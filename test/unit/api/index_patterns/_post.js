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
            .send(_.assign(createTestData().indexPatternWithMappings, {title: false}))
            .expect(400),

          request.post('/kibana/index_patterns')
            .send(_.assign(createTestData().indexPatternWithMappings, {fields: {}}))
            .expect(400),

          // Fields must have a name
          request.post('/kibana/index_patterns')
            .send(_.assign(createTestData().indexPatternWithMappings, {fields: [{count: 0}]}))
            .expect(400),

          // Mapping requires type
          request.post('/kibana/index_patterns')
            .send(_.assign(createTestData().indexPatternWithMappings, {
              fields: [{
                'name': 'geo.coordinates',
                'count': 0,
                'scripted': false,
                'mapping': {'index': 'not_analyzed', 'doc_values': false}
              }]
            }))
            .expect(400)
        ]);
      });

      bdd.it('should return 201 when a pattern is successfully created', function createPattern() {
        return request.post('/kibana/index_patterns')
          .send(createTestData().indexPatternWithMappings)
          .expect(201);
      });

      bdd.it('should create an index template if mappings are provided', function createTemplate() {
        return request.post('/kibana/index_patterns')
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

        return request.post('/kibana/index_patterns')
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

        return request.post('/kibana/index_patterns')
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
        return request.post('/kibana/index_patterns')
          .send(createTestData().indexPatternWithMappings)
          .expect(201)
          .then(function () {
            return request.post('/kibana/index_patterns')
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
          return request.post('/kibana/index_patterns')
            .send(createTestData().indexPatternWithMappings)
            .expect(409);
        });
      });

      bdd.it('should return 409 conflict when mappings are provided with a pattern that matches existing indices',
        function existingIndicesConflict() {
          var pattern = createTestData().indexPatternWithMappings;
          pattern.title = '.kib*';

          return request.post('/kibana/index_patterns')
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

          return request.post('/kibana/index_patterns')
            .send(pattern)
            .expect(201);
        });

      bdd.it('should enforce snake_case in the request body', function () {
        return request.post('/kibana/index_patterns')
          .send(_.mapKeys(createTestData().indexPatternWithMappings, function (value, key) {
            return _.camelCase(key);
          }))
          .expect(400);
      });

    });

  };
});
