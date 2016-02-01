define(function (require) {
  var Promise = require('bluebird');
  var createTestData = require('intern/dojo/node!../../../unit/api/ingest/data');
  var _ = require('intern/dojo/node!lodash');
  var expect = require('intern/dojo/node!expect.js');

  return function (bdd, scenarioManager, request) {
    bdd.describe('POST ingest', function postIngest() {

      bdd.beforeEach(function () {
        return scenarioManager.reload('emptyKibana');
      });

      bdd.afterEach(function () {
        return request.del('/kibana/ingest/logstash-*');
      });

      bdd.it('should return 400 for an invalid payload', function invalidPayload() {
        return Promise.all([
          request.post('/kibana/ingest').expect(400),

          request.post('/kibana/ingest')
            .send({})
            .expect(400),

          request.post('/kibana/ingest')
            .send(_.set(createTestData(), 'index_pattern.title', false))
            .expect(400),

          request.post('/kibana/ingest')
            .send(_.set(createTestData(), 'index_pattern.fields', {}))
            .expect(400),

          request.post('/kibana/ingest')
            .send(_.set(createTestData(), 'index_pattern.fields', []))
            .expect(400),

          // Fields must have a name and type
          request.post('/kibana/ingest')
            .send(_.set(createTestData(), 'index_pattern.fields', [{count: 0}]))
            .expect(400)
        ]);
      });

      bdd.it('should return 204 when an ingest config is successfully created', function createIngestConfig() {
        return request.post('/kibana/ingest')
          .send(createTestData())
          .expect(204);
      });

      bdd.it('should create an index template if a fields array is included', function createTemplate() {
        return request.post('/kibana/ingest')
          .send(createTestData())
          .expect(204)
          .then(function () {
            return scenarioManager.client.indices.getTemplate({name: 'kibana-logstash-*'});
          });
      });

      bdd.it('should provide defaults for field properties', function createTemplate() {
        return request.post('/kibana/ingest')
          .send(createTestData())
          .expect(204)
          .then(function () {
            return scenarioManager.client.get({
              index: '.kibana',
              type: 'index-pattern',
              id: 'logstash-*'
            })
            .then(function (res) {
              var fields = JSON.parse(res._source.fields);
              // @timestamp was created with only name and type, all other fields should be set as defaults by API
              expect(res._source.title).to.be('logstash-*');
              expect(fields[1].name).to.be('@timestamp');
              expect(fields[1].type).to.be('date');
              expect(fields[1].count).to.be(0);
              expect(fields[1].scripted).to.be(false);
              expect(fields[1].indexed).to.be(true);
              expect(fields[1].analyzed).to.be(false);
              expect(fields[1].doc_values).to.be(true);
            });
          });
      });

      bdd.it('should create index template with _default_ mappings based on the info in the ingest config',
      function createTemplate() {
        return request.post('/kibana/ingest')
          .send(createTestData())
          .expect(204)
          .then(function () {
            return scenarioManager.client.indices.getTemplate({name: 'kibana-logstash-*'})
            .then(function (template) {
              var mappings = template['kibana-logstash-*'].mappings._default_.properties;
              expect(mappings).to.be.ok();
              expect(_.isEqual(mappings.ip, {index: 'not_analyzed', type: 'ip', doc_values: true})).to.be.ok();
              expect(_.isEqual(mappings['@timestamp'], {index: 'not_analyzed', type: 'date', doc_values: true})).to.be.ok();
              expect(_.isEqual(mappings.bytes, {index: 'not_analyzed', type: 'double', doc_values: true})).to.be.ok();

              // object fields are mapped as such, with individual mappings for each of their properties
              expect(_.isEqual(mappings.geo, {
                properties: {
                  coordinates: {
                    index: 'not_analyzed',
                    type: 'geo_point',
                    doc_values: true
                  }
                }
              })).to.be.ok();

              // strings should be mapped as multi fields
              expect(mappings.agent).to.have.property('fields');
            });
          });
      });

      bdd.it('should return 409 conflict when a pattern with the given ID already exists', function patternConflict() {
        return request.post('/kibana/ingest')
          .send(createTestData())
          .expect(204)
          .then(function () {
            return request.post('/kibana/ingest')
              .send(createTestData())
              .expect(409);
          });
      });


      bdd.it('should return 409 conflict when an index template with the given ID already exists', function templateConflict() {
        return scenarioManager.client.indices.putTemplate({
          name: 'kibana-logstash-*', body: {
            template: 'logstash-*'
          }
        }).then(function () {
          return request.post('/kibana/ingest')
            .send(createTestData())
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
          var ingestConfig = createTestData();
          ingestConfig.index_pattern.id = ingestConfig.index_pattern.title = '.kib*';

          return request.post('/kibana/ingest')
            .send(ingestConfig)
            .expect(409);
        });

      bdd.it('should enforce snake_case in the request body', function () {
        var ingestConfig = createTestData();
        ingestConfig.index_pattern = _.mapKeys(ingestConfig.index_pattern, function (value, key) {
          return _.camelCase(key);
        });

        return request.post('/kibana/ingest')
          .send(ingestConfig)
          .expect(400);
      });

    });

  };
});
