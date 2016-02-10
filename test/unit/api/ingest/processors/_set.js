define(function (require) {
  var Promise = require('bluebird');
  var _ = require('intern/dojo/node!lodash');
  var expect = require('intern/dojo/node!expect.js');

  const testPipeline = {
    processors: [{
      processorId: 'processor1',
      typeId: 'set',
      targetField: 'foo',
      value: 'bar'
    }],
    input: {}
  };

  return function (bdd, scenarioManager, request) {
    bdd.describe('simulate', function simulatePipeline() {

      bdd.it('should return 400 for an invalid payload', function invalidPayload() {
        return Promise.all([
          // Set processor requires targetField property
          request.post('/kibana/ingest/simulate')
          .send({
            input: {},
            processors: [{
              processorId: 'processor1',
              typeId: 'set',
              value: 'bar'
            }]
          })
          .expect(400)
        ]);
      });

    });
  };
});
