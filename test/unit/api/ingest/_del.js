define(function (require) {
  var Promise = require('bluebird');
  var createTestData = require('intern/dojo/node!../../../unit/api/ingest/data');
  var _ = require('intern/dojo/node!lodash');
  var expect = require('intern/dojo/node!expect.js');


  return function (bdd, scenarioManager, request) {

    bdd.describe('DELETE ingest', function deleteIngestConfig() {

      bdd.beforeEach(function () {
        return scenarioManager.reload('emptyKibana')
        .then(function () {
          return request.post('/kibana/ingest')
          .send(createTestData())
          .expect(204);
        });
      });

      bdd.afterEach(function () {
        return request.del('/kibana/ingest/logstash-*')
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
        return request.del('/kibana/ingest/logstash-*')
          .expect(200)
          .then(function () {
            return request.get('/kibana/ingest/logstash-*').expect(404);
          })
          .then(function () {
            return scenarioManager.client.indices.getTemplate({name: 'kibana-logstash-*'})
              .catch(function (error) {
                expect(error.status).to.be(404);
              });
          })
          .then(function () {
            return scenarioManager.client.transport.request({
              path: '_ingest/pipeline/kibana-logstash-*',
              method: 'GET'
            })
            .catch(function (error) {
              expect(error.status).to.be(404);
            });
          });
      });

      bdd.it('should return 404 for a non-existent id', function () {
        return request.del('/kibana/ingest/doesnotexist')
          .expect(404);
      });

    });
  };
});
