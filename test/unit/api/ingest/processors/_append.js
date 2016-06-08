define(function (require) {
  var Promise = require('bluebird');
  var _ = require('intern/dojo/node!lodash');
  var expect = require('intern/dojo/node!expect.js');

  const testPipeline = {
    processors: [{
      processor_id: 'processor1',
      type_id: 'append',
      target_field: 'foo',
      values: [ 'value1', 'value2' ],
      ignore_failure: false
    }],
    input: {}
  };

  return function (bdd, scenarioManager, request) {
    bdd.describe('simulate - append processor', () => {

      bdd.it('should return 400 for an invalid payload', () => {
        return Promise.all([
          // Append processor requires targetField property
          request.post('/kibana/ingest/simulate')
          .send({
            input: {},
            processors: [{
              processor_id: 'processor1',
              type_id: 'append',
              values: [ 'value1', 'value2' ],
              target_field: 42,
              ignore_failure: false
            }]
          })
          .expect(400)
        ]);
      });

      bdd.it('should return 200 for a valid simulate request', () => {
        return request.post('/kibana/ingest/simulate')
          .send(testPipeline)
          .expect(200);
      });

      bdd.it('should return a simulated output with the correct result for the given processor', () => {
        return request.post('/kibana/ingest/simulate')
          .send(testPipeline)
          .expect(200)
          .then(function (response) {
            expect(response.body[0].output.foo).to.be.eql([ 'value1', 'value2' ]);
          });
      });

      bdd.it('should enforce snake case', () => {
        return request.post('/kibana/ingest/simulate')
        .send({
          processors: [{
            processorId: 'processor1',
            typeId: 'append',
            targetField: 'foo',
            value: [ 'value1', 'value2' ],
            ignore_failure: false
          }],
          input: {}
        })
        .expect(400);
      });

    });
  };
});
