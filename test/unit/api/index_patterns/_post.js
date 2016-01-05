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

      bdd.it('should provide defaults for optional field properties that need to be initialized and cast types', function createTemplate() {
        return request.post('/kibana/index_patterns')
          .send(createTestData().indexPattern)
          .expect(201)
          .then(function () {
            return request.get('/kibana/index_patterns/logstash-*')
            .expect(200)
            .then(function (res) {
              var fields = res.body.data.attributes.fields;
              // @timestamp was created with only name and type, all other fields should be set as defaults by API
              expect(res.body.data.attributes.title).to.be('logstash-*');
              expect(fields[1].name).to.be('@timestamp');
              expect(fields[1].type).to.be('date');
              expect(fields[1].count).to.be(0);
              expect(fields[1].scripted).to.be(false);
              expect(fields[1].indexed).to.be(true);
              expect(fields[1].analyzed).to.be(false);
              expect(fields[1].doc_values).to.be(true);

              // API should cast Java types to JS before storing the Kibana index pattern.
              // bytes was created as a long and cast to number
              expect(fields[3].name).to.be('bytes');
              expect(fields[3].type).to.be('number');
            });
          });
      });

      bdd.it('should create index template with _default_ mappings based on the info in the kibana index pattern',
      function createTemplate() {
        return request.post('/kibana/index_patterns')
          .send(createTestData().indexPattern)
          .expect(201)
          .then(function () {
            return scenarioManager.client.indices.getTemplate({name: 'kibana-logstash-*'})
            .then(function (template) {
              var mappings = template['kibana-logstash-*'].mappings._default_.properties;
              expect(mappings).to.be.ok();
              expect(_.isEqual(mappings.ip, {index: 'not_analyzed', type: 'ip', doc_values: false})).to.be.ok();
              expect(_.isEqual(mappings['@timestamp'], {index: 'not_analyzed', type: 'date', doc_values: true})).to.be.ok();
              expect(_.isEqual(mappings.agent, {index: 'analyzed', type: 'string', doc_values: false})).to.be.ok();
              expect(_.isEqual(mappings.bytes, {index: 'not_analyzed', type: 'long', doc_values: true})).to.be.ok();
              expect(_.isEqual(mappings.geo, {
                properties: {
                  coordinates: {
                    index: 'not_analyzed',
                    type: 'geo_point',
                    doc_values: true
                  }
                }
              })).to.be.ok();
            });
          });
      });

      bdd.it('scripted fields should not get added to the template', function createTemplate() {
        var testData = createTestData().indexPattern;
        testData.data.attributes.fields.push({
          'name': 'Double Bytes',
          'type': 'number',
          'scripted': true,
          'script': 'doc[\'bytes\'].value * 2',
          'lang': 'expression',
          'indexed': false,
          'analyzed': false,
          'doc_values': false
        });

        return request.post('/kibana/index_patterns')
          .send(testData)
          .expect(201)
          .then(function () {
            return scenarioManager.client.indices.getTemplate({name: 'kibana-logstash-*'})
              .then(function (template) {
                var mappings = template['kibana-logstash-*'].mappings._default_.properties;
                expect(mappings).to.be.ok();
                expect(mappings).to.not.have.property('Double Bytes');
              });
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
