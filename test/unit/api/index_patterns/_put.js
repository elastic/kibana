define(function (require) {
  var Promise = require('bluebird');
  var createTestData = require('intern/dojo/node!../../../unit/api/index_patterns/data');
  var _ = require('intern/dojo/node!lodash');
  var expect = require('intern/dojo/node!expect.js');

  return function (bdd, scenarioManager, request) {

    bdd.describe('PUT index_patterns', function putIndexPatterns() {

      bdd.beforeEach(function () {
        return scenarioManager.reload('emptyKibana').then(function () {
          return request.post('/kibana/index_patterns').send(createTestData().indexPatternWithTemplate);
        });
      });

      bdd.afterEach(function () {
        return request.del('/kibana/index_patterns/logstash-*');
      });

      bdd.it('should return 200 for a successful update', function () {
        var pattern = createTestData().indexPatternWithTemplate;
        delete pattern.included;
        pattern.data.attributes.time_field_name = 'foo';
        pattern.data.attributes.fields[0].count = 5;

        return request.put('/kibana/index_patterns/logstash-*')
          .send(pattern)
          .expect(200)
          .then(function () {
            return request.get('/kibana/index_patterns/logstash-*');
          })
          .then(function (res) {
            expect(res.body.time_field_name).to.be('foo');
            expect(res.body.fields[0].count).to.be(5);
          });
      });

      bdd.it('should return 400 if you try to modify the title', function () {
        var pattern = createTestData().indexPatternWithTemplate;
        pattern.fields = _.map(pattern.fields, function (field) {
          return _.omit(field, 'mapping');
        });
        pattern.title = 'foo';

        return request.put('/kibana/index_patterns/logstash-*')
          .send(pattern)
          .expect(400);
      });

      bdd.it('should return 400 if you try to update mappings', function () {
        return request.put('/kibana/index_patterns/logstash-*')
          .send(createTestData().indexPatternWithTemplate)
          .expect(400);
      });

      bdd.it('should return 400 for an invalid payload', function () {
        function omitMappings(pattern) {
          pattern.fields = _.map(pattern.fields, function (field) {
            return _.omit(field, 'mapping');
          });
          return pattern;
        };

        return Promise.all([
          request.put('/kibana/index_patterns/logstash-*').expect(400),

          request.put('/kibana/index_patterns/logstash-*')
            .send({})
            .expect(400),

          //fields must be an array
          request.put('/kibana/index_patterns/logstash-*')
            .send(_.assign(omitMappings(createTestData().indexPatternWithTemplate), {fields: {}}))
            .expect(400),

          // field objects must have a name
          request.put('/kibana/index_patterns/logstash-*')
            .send(_.assign(omitMappings(createTestData().indexPatternWithTemplate), {fields: [{count: 0}]}))
            .expect(400)
        ]);
      });

      bdd.it('should return 404 for a non-existent id', function () {
        var pattern = createTestData().indexPatternWithTemplate;
        pattern.fields = _.map(pattern.fields, function (field) {
          return _.omit(field, 'mapping');
        });
        pattern.title = 'idonotexist';

        return request.put('/kibana/index_patterns/idonotexist')
          .send(pattern)
          .expect(404);
      });

      bdd.it('should enforce snake_case in the request body', function () {
        return request.put('/kibana/index_patterns/logstash-*')
          .send({timeFieldName: 'foo'})
          .expect(400);
      });

    });

  };
});
