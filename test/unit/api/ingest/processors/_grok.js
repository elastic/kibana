define(function (require) {
  var Promise = require('bluebird');
  var _ = require('intern/dojo/node!lodash');
  var expect = require('intern/dojo/node!expect.js');

  const testPipeline = {
    processors: [{
      processor_id: 'processor1',
      type_id: 'grok',
      source_field: 'foo',
      pattern: '%{GREEDYDATA:bar} - %{GREEDYDATA:baz}',
      ignore_failure: false
    }],
    input: { foo: 'value1 - value2' }
  };

  return function (bdd, scenarioManager, request) {
    bdd.describe('simulate - grok processor', () => {

      bdd.it('should return 400 for an invalid payload', () => {
        return Promise.all([
          // Grok processor requires source_field property
          request.post('/kibana/ingest/simulate')
          .send({
            input: {},
            processors: [{
              processor_id: 'processor1',
              type_id: 'grok',
              source_field: 123,
              pattern: '%{GREEDYDATA:bar} - %{GREEDYDATA:baz}',
              ignore_failure: false
            }],
          })
          .expect(400)
        ]);
      });

      bdd.it('should return 200 for a valid simulate request', () => {
        return request.post('/kibana/ingest/simulate')
          .send(testPipeline)
          .expect(200);
      });

      bdd.it('should return a simulated output with the correct result for the given processor', function () {
        const expected = {
          foo: 'value1 - value2',
          bar: 'value1',
          baz: 'value2'
        };
        return request.post('/kibana/ingest/simulate')
          .send(testPipeline)
          .expect(200)
          .then(function (response) {
            expect(response.body[0].output).to.eql(expected);
          });
      });

      bdd.it('should enforce snake case', () => {
        return request.post('/kibana/ingest/simulate')
        .send({
          processors: [{
            processorId: 'processor1',
            typeId: 'grok',
            sourceField: 'foo',
            pattern: '%{GREEDYDATA:bar} - %{GREEDYDATA:baz}',
            ignore_failure: false
          }],
          input: { foo: 'value1 - value2' }
        })
        .expect(400);
      });

    });
  };
});
