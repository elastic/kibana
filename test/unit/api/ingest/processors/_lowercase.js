define(function (require) {
  var Promise = require('bluebird');
  var _ = require('intern/dojo/node!lodash');
  var expect = require('intern/dojo/node!expect.js');

  const testPipeline = {
    processors: [{
      processor_id: 'processor1',
      type_id: 'lowercase',
      source_field: 'foo',
      ignore_failure: false
    }],
    input: { foo: 'I am Mixed Case' }
  };

  return function (bdd, scenarioManager, request) {
    bdd.describe('simulate - lowercase processor', () => {

      bdd.it('should return 400 for an invalid payload', () => {
        return Promise.all([
          // processor requires source_field property
          request.post('/kibana/ingest/simulate')
          .send({
            processors: [{
              processor_id: 'processor1',
              type_id: 'lowercase',
              source_field: 1234,
              ignore_failure: false
            }],
            input: { foo: 'I am Mixed Case' }
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
            expect(response.body[0].output.foo).to.be('i am mixed case');
          });
      });

      bdd.it('should enforce snake case', () => {
        return request.post('/kibana/ingest/simulate')
        .send({
          processors: [{
            processorId: 'processor1',
            typeId: 'lowercase',
            sourceField: 'foo',
            ignore_failure: false
          }],
          input: { foo: 'I am Mixed Case' }
        })
        .expect(400);
      });

    });
  };
});
