define(function (require) {
  var Promise = require('bluebird');
  var _ = require('intern/dojo/node!lodash');
  var expect = require('intern/dojo/node!expect.js');

  const testPipeline = {
    processors: [{
      processor_id: 'processor1',
      type_id: 'trim',
      source_field: 'foo'
    }],
    input: { foo: ' bar baz ' }
  };

  return function (bdd, scenarioManager, request) {
    bdd.describe('simulate - trim processor', () => {

      bdd.it('should return 400 for an invalid payload', () => {
        return Promise.all([
          // processor requires source_field property
          request.post('/kibana/ingest/simulate')
          .send({
            processors: [{
              processor_id: 'processor1',
              type_id: 'trim',
              source_field: 1234
            }],
            input: { foo: ' bar baz ' }
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
            expect(response.body[0].output).to.eql({ foo: 'bar baz' });
          });
      });

      bdd.it('should enforce snake case', () => {
        return request.post('/kibana/ingest/simulate')
        .send({
          processors: [{
            processorId: 'processor1',
            typeId: 'trim',
            sourceField: 'foo'
          }],
          input: { foo: ' bar baz ' }
        })
        .expect(400);
      });

    });
  };
});
