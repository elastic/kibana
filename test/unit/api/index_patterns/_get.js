define(function (require) {
  var _ = require('intern/dojo/node!lodash');
  var expect = require('intern/dojo/node!expect.js');
  var createTestData = require('intern/dojo/node!../../../unit/api/index_patterns/data');
  var Promise = require('bluebird');
  var indexPatternSchema = require('intern/dojo/node!../../../../src/plugins/kibana/server/lib/schemas/index_pattern_schema');
  var Joi = require('intern/dojo/node!joi');

  return function (bdd, scenarioManager, request) {

    bdd.describe('GET index_patterns', function getIndexPatterns() {

      bdd.before(function () {
        return scenarioManager.reload('emptyKibana').then(function () {
          return Promise.all([
            request.post('/kibana/index_patterns').send(createTestData().indexPatternWithMappings),
            request.post('/kibana/index_patterns').send(_.assign(createTestData().indexPatternWithMappings, {title: 'foo'})),
            request.post('/kibana/index_patterns').send(_.assign(createTestData().indexPatternWithMappings, {title: 'bar*'})),
            request.post('/kibana/index_patterns').send(_.assign(createTestData().indexPatternWithMappings,
              {title: '[.marvel-es-]YYYY.MM.DD'}))
          ]).then(function () {
            return scenarioManager.client.indices.refresh({
              index: '.kibana'
            });
          });
        });
      });

      bdd.after(function () {
        return Promise.all([
          request.del('/kibana/index_patterns/logstash-*'),
          request.del('/kibana/index_patterns/foo'),
          request.del('/kibana/index_patterns/bar*'),
          request.del('/kibana/index_patterns/[.marvel-es-]YYYY.MM.DD')
        ]);
      });

      bdd.it('should return 200 with all patterns in an array', function return200() {
        return request.get('/kibana/index_patterns')
          .expect(200)
          .then(function (res) {
            expect(res.body).to.be.an('array');
            expect(res.body.length).to.be(4);
          });
      });

      bdd.describe('GET index_pattern by ID', function getIndexPatternByID() {

        bdd.it('should return 200 with the valid index pattern requested', function () {
          return request.get('/kibana/index_patterns/logstash-*')
            .expect(200)
            .then(function (res) {
              expect(res.body.title).to.be('logstash-*');
              Joi.assert(res.body, indexPatternSchema.post);
            });
        });

        bdd.it('should return mappings info from the indices if there is no template', function () {
          var pattern = createTestData().indexPatternWithMappings;
          pattern.fields = _.map(pattern.fields, function (field) {
            return _.omit(field, 'mapping');
          });

          return request.del('/kibana/index_patterns/logstash-*').expect(200)
            .then(function () {
              return scenarioManager.load('makelogs');
            })
            .then(function () {
              return request.post('/kibana/index_patterns').send(pattern).expect(201);
            })
            .then(function () {
              return request.get('/kibana/index_patterns/logstash-*').expect(200);
            })
            .then(function (res) {
              expect(res.body.fields[0].mapping).to.be.an('object');
            })
            .finally(function () {
              scenarioManager.unload('makelogs');
            });
        });

        bdd.it('should return 404 for a non-existent ID', function () {
          return request.get('/kibana/index_patterns/thisdoesnotexist').expect(404);
        });

      });

    });
  };
});

