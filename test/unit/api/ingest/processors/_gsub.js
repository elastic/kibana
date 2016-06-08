define(function (require) {
  var Promise = require('bluebird');
  var _ = require('intern/dojo/node!lodash');
  var expect = require('intern/dojo/node!expect.js');

  const testPipeline = {
    processors: [{
      processor_id: 'processor1',
      type_id: 'gsub',
      source_field: 'foo',
      pattern: 'bar',
      replacement: 'baz',
      ignore_failure: false
    }],
    input: { foo: 'bar' }
  };

  return function (bdd, scenarioManager, request) {
    bdd.describe('simulate - gsub processor', () => {

      bdd.it('should return 400 for an invalid payload', () => {
        return Promise.all([
          // GSub processor requires targetField property
          request.post('/kibana/ingest/simulate')
          .send({
            input: { foo: 'bar' },
            processors: [{
              processor_id: 'processor1',
              type_id: 'gsub',
              source_field: 42,
              pattern: 'bar',
              replacement: 'baz',
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
          .then((response) => {
            expect(response.body[0].output.foo).to.be.equal('baz');
          });
      });

      bdd.it('should enforce snake case', () => {
        return request.post('/kibana/ingest/simulate')
        .send({
          processors: [{
            processorId: 'processor1',
            typeId: 'gsub',
            sourceField: 'foo',
            pattern: 'bar',
            replacement: 'baz',
            ignore_failure: false
          }],
          input: { foo: 'bar' }
        })
        .expect(400);
      });

    });
  };
});
