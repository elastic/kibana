define(function (require) {
  var Promise = require('bluebird');
  var createTestData = require('intern/dojo/node!../../../unit/api/index_patterns/data');
  var _ = require('intern/dojo/node!lodash');
  var expect = require('intern/dojo/node!expect.js');


  return function (bdd, scenarioManager, request) {

    bdd.describe('DELETE index-patterns', function deleteIndexPatterns() {

      bdd.beforeEach(function () {
        return scenarioManager.reload('emptyKibana').then(function () {
          return request.post('/index-patterns').send(createTestData().indexPatternWithMappings);
        });
      });

      bdd.afterEach(function () {
        return request.del('/index-patterns/logstash-*');
      });

      bdd.it('should return 200 for successful deletion of pattern and template', function () {
        return request.del('/index-patterns/logstash-*')
          .expect(200)
          .then(function () {
            return request.get('/index-patterns/logstash-*').expect(404);
          })
          .then(function () {
            return scenarioManager.client.indices.getTemplate({name: 'kibana-logstash-*'})
              .catch(function (error) {
                expect(error.status).to.be(404);
              });
          });
      });

      bdd.it('should return 404 for a non-existent id', function () {
        return request.del('/index-patterns/doesnotexist')
          .expect(404);
      });

    });
  };
});
