define(function (require) {
  var Promise = require('bluebird');
  var createTestData = require('intern/dojo/node!../../../unit/api/ingest/data');
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
          request.post('/kibana/ingest/simulate').expect(400),

          request.post('/kibana/ingest/simulate')
          .send({})
          .expect(400),

          // requires at least one processor
          request.post('/kibana/ingest/simulate')
          .send({input: {}, processors: []})
          .expect(400),

          // All processors must have a processorId property and a typeId property
          request.post('/kibana/ingest/simulate')
          .send({input: {}, processors: [{}]})
          .expect(400)
        ]);
      });

      bdd.it('should return 200 for a successful run', function () {
        return request.post('/kibana/ingest/simulate')
        .send(testPipeline)
        .expect(200);
      });

      // test for 400 when required fields for particular processor are missing, in separate files for each processor type
    });
  };
});
