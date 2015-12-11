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
            expect(res.body.data.attributes.time_field_name).to.be('foo');
            expect(res.body.data.attributes.fields[0].count).to.be(5);
          });
      });

      bdd.it('should return 400 if you try to update an included template', function () {
        return request.put('/kibana/index_patterns/logstash-*')
          .send(createTestData().indexPatternWithTemplate)
          .expect(400);
      });

      bdd.it('should return 400 for an invalid payload', function () {
        const putTestData = createTestData().indexPatternWithTemplate;
        delete putTestData.included;

        return Promise.all([
          request.put('/kibana/index_patterns/logstash-*').expect(400),

          request.put('/kibana/index_patterns/logstash-*')
            .send({})
            .expect(400),

          //fields must be an array
          request.put('/kibana/index_patterns/logstash-*')
            .send(_.set(putTestData, 'data.attributes.fields', {}))
            .expect(400),

          // field objects must have a name
          request.put('/kibana/index_patterns/logstash-*')
            .send(_.set(putTestData, 'data.attributes.fields', [{count: 0}]))
            .expect(400)
        ]);
      });

      bdd.it('should return 404 for a non-existent id', function () {
        var pattern = createTestData().indexPatternWithTemplate;
        pattern.data.id = 'idonotexist';
        pattern.data.attributes.title = 'idonotexist';
        delete pattern.included;

        return request.put('/kibana/index_patterns/idonotexist')
        .send(pattern)
        .expect(404);
      });

      bdd.it('should enforce snake_case in the request body', function () {
        var pattern = createTestData().indexPatternWithTemplate;
        pattern.data.attributes.timeFieldName = 'foo';
        delete pattern.data.attributes.time_field_name;
        delete pattern.included;

        return request.put('/kibana/index_patterns/logstash-*')
        .send(pattern)
        .expect(400);
      });

    });

  };
});
