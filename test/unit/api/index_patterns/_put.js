define(function (require) {
  var Promise = require('bluebird');
  var createTestData = require('intern/dojo/node!../../../unit/api/index_patterns/data');
  var _ = require('intern/dojo/node!lodash');
  var expect = require('intern/dojo/node!expect.js');

  return function (bdd, scenarioManager, request) {

    bdd.describe('PUT index-patterns', function putIndexPatterns() {

      bdd.beforeEach(function () {
        return scenarioManager.reload('emptyKibana').then(function () {
          return request.post('/index-patterns').send(createTestData().indexPatternWithMappings);
        });
      });

      bdd.afterEach(function () {
        return request.del('/index-patterns/logstash-*');
      });

      bdd.it('should return 200 for a successful update', function () {
        var pattern = createTestData().indexPatternWithMappings;
        pattern.fields = _.map(pattern.fields, function (field) {
          return _.omit(field, 'mapping');
        });
        pattern.timeFieldName = 'foo';
        pattern.fields[0].count = 5;

        return request.put('/index-patterns/logstash-*')
          .send(pattern)
          .expect(200)
          .then(function () {
            return request.get('/index-patterns/logstash-*');
          })
          .then(function (res) {
            expect(res.body.timeFieldName).to.be('foo');
            expect(res.body.fields[0].count).to.be(5);
          });
      });

      bdd.it('should return 400 if you try to modify the title', function () {
        var pattern = createTestData().indexPatternWithMappings;
        pattern.fields = _.map(pattern.fields, function (field) {
          return _.omit(field, 'mapping');
        });
        pattern.title = 'foo';

        return request.put('/index-patterns/logstash-*')
          .send(pattern)
          .expect(400);
      });

    });

  };
});
