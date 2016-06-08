define(function (require) {
  var Promise = require('bluebird');
  var _ = require('intern/dojo/node!lodash');
  var expect = require('intern/dojo/node!expect.js');

  const testPipeline = {
    processors: [{
      processor_id: 'processor1',
      type_id: 'set',
      target_field: 'foo',
      value: 'bar',
      ignore_failure: false
    }],
    input: {}
  };

  return function (bdd, scenarioManager, request) {
    bdd.describe('simulate - set processor', function simulatePipeline() {

      bdd.it('should return 400 for an invalid payload', function invalidPayload() {
        return Promise.all([
          // Set processor requires targetField property
          request.post('/kibana/ingest/simulate')
          .send({
            input: {},
            processors: [{
              processor_id: 'processor1',
              type_id: 'set',
              value: 'bar',
              target_field: 42,
              ignore_failure: false
            }]
          })
          .expect(400)
        ]);
      });

      bdd.it('should return 200 for a valid simulate request', function validSetSimulate() {
        return request.post('/kibana/ingest/simulate')
          .send(testPipeline)
          .expect(200);
      });

      bdd.it('should return a simulated output with the correct result for the given processor', function () {
        return request.post('/kibana/ingest/simulate')
          .send(testPipeline)
          .expect(200)
          .then(function (response) {
            expect(response.body[0].output.foo).to.be.equal('bar');
          });
      });

      bdd.it('should enforce snake case', function setSimulateSnakeCase() {
        return request.post('/kibana/ingest/simulate')
        .send({
          processors: [{
            processorId: 'processor1',
            typeId: 'set',
            targetField: 'foo',
            value: 'bar',
            ignore_failure: false
          }],
          input: {}
        })
        .expect(400);
      });

    });
  };
});
