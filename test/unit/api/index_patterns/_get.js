define(function (require) {
  var _ = require('intern/dojo/node!lodash');
  var expect = require('intern/dojo/node!expect.js');
  var createTestData = require('intern/dojo/node!../../../unit/api/index_patterns/data');
  var Promise = require('bluebird');
  var indexPatternSchema = require('intern/dojo/node!../../../../src/plugins/kibana/server/lib/schemas/resources/index_pattern_schema');
  var Joi = require('intern/dojo/node!joi');

  function expectSnakeCase(object) {
    _.forEach(object, function (value, key) {
      expect(key).to.be(_.snakeCase(key));
    });
  }

  return function (bdd, scenarioManager, request) {

    bdd.describe('GET index_patterns', function getIndexPatterns() {

      bdd.before(function () {
        return scenarioManager.reload('emptyKibana').then(function () {
          return Promise.all([
            request.post('/kibana/index_patterns').send(createTestData().indexPattern),
            request.post('/kibana/index_patterns').send(
              _(createTestData().indexPattern)
              .set('data.attributes.title', 'foo')
              .set('data.id', 'foo')
              .value()
            ),
            request.post('/kibana/index_patterns').send(
              _(createTestData().indexPattern)
                .set('data.attributes.title', 'bar*')
                .set('data.id', 'bar*')
                .value()
            )
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
          request.del('/kibana/index_patterns/bar*')
        ]);
      });

      bdd.it('should return 200 with all patterns in an array', function return200() {
        return request.get('/kibana/index_patterns')
          .expect(200)
          .then(function (res) {
            expect(res.body.data).to.be.an('array');
            expect(res.body.data.length).to.be(3);
            expect(res.body.included).to.not.be.ok();
            Joi.assert(res.body, indexPatternSchema.post);
          });
      });

      bdd.it('should use snake_case in the response body', function () {
        return request.get('/kibana/index_patterns')
          .expect(200)
          .then(function (res) {
            _.forEach(res.body.data, function (resource) {
              expectSnakeCase(resource);
              expectSnakeCase(resource.attributes);
            });
          });
      });

      bdd.describe('GET index_pattern by ID', function getIndexPatternByID() {

        bdd.it('should return 200 with the valid index pattern requested', function () {
          return request.get('/kibana/index_patterns/logstash-*')
            .expect(200)
            .then(function (res) {
              expect(res.body.data.attributes.title).to.be('logstash-*');
              Joi.assert(res.body, indexPatternSchema.post);
            });
        });

        bdd.it('should use snake_case in the response body', function () {
          return request.get('/kibana/index_patterns/logstash-*')
            .expect(200)
            .then(function (res) {
              expectSnakeCase(res.body.data);
              expectSnakeCase(res.body.data.attributes);
            });
        });

        bdd.it('should return 404 for a non-existent ID', function () {
          return request.get('/kibana/index_patterns/thisdoesnotexist').expect(404);
        });

      });

    });
  };
});

