define(function (require) {
  var Promise = require('bluebird');
  var createTestData = require('intern/dojo/node!../../../unit/api/index_patterns/data');
  var _ = require('intern/dojo/node!lodash');
  var expect = require('intern/dojo/node!expect.js');


  return function (bdd, scenarioManager, request) {

    bdd.describe('DELETE index_patterns', function deleteIndexPatterns() {

      bdd.beforeEach(function () {
        return scenarioManager.reload('emptyKibana')
        .then(function () {
          return request.post('/kibana/index_patterns')
          .send(createTestData().indexPatternWithTemplate)
          .expect(201);
        });
      });

      bdd.afterEach(function () {
        return request.del('/kibana/index_patterns/logstash-*')
        .then(function () {
          return scenarioManager.client.indices.deleteTemplate({name: 'kibana-logstash-*'})
          .catch(function (err) {
            if (err.status !== 404) {
              throw err;
            }
          });
        });
      });

      bdd.it('should return 200 for successful deletion of pattern and template', function () {
        return request.del('/kibana/index_patterns/logstash-*?include=template')
          .expect(200)
          .then(function () {
            return request.get('/kibana/index_patterns/logstash-*').expect(404);
          })
          .then(function () {
            return scenarioManager.client.indices.getTemplate({name: 'kibana-logstash-*'})
              .catch(function (error) {
                expect(error.status).to.be(404);
              });
          });
      });

      bdd.it('should not delete the template if the include parameter is not sent', function () {
        return request.del('/kibana/index_patterns/logstash-*')
          .expect(200)
          .then(function () {
            return request.get('/kibana/index_patterns/logstash-*').expect(404);
          })
          .then(function () {
            return scenarioManager.client.indices.getTemplate({name: 'kibana-logstash-*'})
            .then(function (res) {
              expect(res['kibana-logstash-*']).to.be.ok();
            });
          });
      });

      bdd.it('should return 404 for a non-existent id', function () {
        return request.del('/kibana/index_patterns/doesnotexist?include=template')
          .expect(404);
      });

    });
  };
});
