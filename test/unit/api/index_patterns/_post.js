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
        return request.del('/kibana/index_patterns/logstash-*?include=template');
      });

      bdd.it('should return 400 for an invalid payload', function invalidPayload() {
        return Promise.all([
          request.post('/kibana/index_patterns').expect(400),

          request.post('/kibana/index_patterns')
            .send({})
            .expect(400),

          request.post('/kibana/index_patterns')
            .send(_.set(createTestData().indexPatternWithTemplate, 'data.attributes.title', false))
            .expect(400),

          request.post('/kibana/index_patterns')
            .send(_.set(createTestData().indexPatternWithTemplate, 'data.attributes.fields', {}))
            .expect(400),

          // Fields must have a name
          request.post('/kibana/index_patterns')
            .send(_.set(createTestData().indexPatternWithTemplate, 'data.attributes.fields', [{count: 0}]))
            .expect(400)
        ]);
      });

      bdd.it('should return 201 when a pattern is successfully created', function createPattern() {
        return request.post('/kibana/index_patterns')
          .send(createTestData().indexPatternWithTemplate)
          .expect(201);
      });

      bdd.it('should create an index template if a template is included', function createTemplate() {
        return request.post('/kibana/index_patterns')
          .send(createTestData().indexPatternWithTemplate)
          .expect(201)
          .then(function () {
            return scenarioManager.client.indices.getTemplate({name: 'kibana-logstash-*'});
          });
      });

      bdd.it('should normalize field mappings and add them to the index pattern if a template is included', function () {
        return request.post('/kibana/index_patterns')
          .send(createTestData().indexPatternWithTemplate)
          .expect(201)
          .then(function () {
            return request.get('/kibana/index_patterns/logstash-*')
            .expect(200)
            .then(function (res) {
              _.forEach(res.body.data.attributes.fields, function (field) {
                expect(field).to.have.keys('type', 'indexed', 'analyzed', 'doc_values');

                if (field.name === 'bytes') {
                  expect(field).to.have.property('type', 'number');
                }
              });
            });
          });
      });

      bdd.it('should return 409 conflict when a pattern with the given ID already exists', function patternConflict() {
        return request.post('/kibana/index_patterns')
          .send(createTestData().indexPatternWithTemplate)
          .expect(201)
          .then(function () {
            return request.post('/kibana/index_patterns')
              .send(createTestData().indexPatternWithTemplate)
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
            .send(createTestData().indexPatternWithTemplate)
            .expect(409);
        })
        .then(function () {
          return scenarioManager.client.indices.deleteTemplate({
            name: 'kibana-logstash-*'
          });
        });
      });

      bdd.it('should return 409 conflict when a template is included with a pattern that matches existing indices',
        function existingIndicesConflict() {
          var pattern = createTestData().indexPatternWithTemplate;
          pattern.data.id = pattern.data.attributes.title = pattern.included[0].attributes.template = '.kib*';

          return request.post('/kibana/index_patterns')
            .send(pattern)
            .expect(409);
        });

      bdd.it('should return 201 created successfully if a pattern matches existing indices but no template is included',
        function existingIndicesNoTemplate() {
          var pattern = createTestData().indexPatternWithTemplate;
          pattern.data.id = pattern.data.attributes.title = '.kib*';
          delete pattern.included;

          return request.post('/kibana/index_patterns')
            .send(pattern)
            .expect(201);
        });

      bdd.it('should enforce snake_case in the request body', function () {
        var pattern = createTestData().indexPatternWithTemplate;
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
