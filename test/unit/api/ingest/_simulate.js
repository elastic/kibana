define(function (require) {
  var Promise = require('bluebird');
  var createTestData = require('intern/dojo/node!../../../unit/api/ingest/data');
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
          .expect(400),

          request.post('/kibana/ingest/simulate')
          .send({input: {}, processors: ['foo']})
          .expect(400),

          request.post('/kibana/ingest/simulate')
          .send({input: {}, processors: 'foo'})
          .expect(400)
        ]);
      });

      bdd.it('should return 200 for a successful run', function () {
        return request.post('/kibana/ingest/simulate')
        .send(testPipeline)
        .expect(200);
      });

      bdd.describe('compilation errors', function simulatePipeline() {
        const pipeline = {
          input: { foo: '[message]' },
          processors: [
            {
              processor_id: 'processor1',
              type_id: 'set',
              target_field: 'foo',
              value: 'bar',
              ignore_failure: false
            },
            {
              processor_id: 'processor2',
              type_id: 'gsub',
              source_field: 'foo',
              pattern: '[',
              replacement: '<',
              ignore_failure: false
            },
            {
              processor_id: 'processor3',
              type_id: 'set',
              target_field: 'bar',
              value: 'baz',
              ignore_failure: false
            }
          ]
        };

        bdd.it('should return a 200 for a compile error caused by a processor', function () {
          request.post('/kibana/ingest/simulate')
          .send(pipeline)
          .expect(200)
          .then((response) => {
            expect(response.body[0].processor_id).to.be('processor2');
            expect(response.body[0].error.compile).to.be(true);
          });
        });

        bdd.it('should only return a result for the processor that threw the error', function () {
          request.post('/kibana/ingest/simulate')
          .send(pipeline)
          .expect(200)
          .then((response) => {
            expect(response.body[0].processor_id).to.be('processor2');
            expect(response.body[0].error.compile).to.be(true);
            expect(response.body.length).to.be(1);
          });
        });
      });

      bdd.describe('data errors', function simulatePipeline() {
        const pipeline = {
          input: { foo: '[message]' },
          processors: [
            {
              processor_id: 'processor1',
              type_id: 'set',
              target_field: 'foo',
              value: 'bar',
              ignore_failure: false
            },
            {
              processor_id: 'processor2',
              type_id: 'gsub',
              source_field: '', //invalid source field
              pattern: '\\[',
              replacement: '<',
              ignore_failure: false
            },
            {
              processor_id: 'processor3',
              type_id: 'set',
              target_field: 'bar',
              value: 'baz',
              ignore_failure: false
            }
          ]
        };

        bdd.it('should return 200 with non-compile error object for a processor with an invalid source_field', () => {
          return Promise.all([
            request.post('/kibana/ingest/simulate')
            .send(pipeline)
            .expect(200)
            .then((response) => {
              expect(response.body[0].error).to.be(undefined);
              expect(response.body[1].error.compile).to.be(false);
              expect(response.body[1].processor_id).to.be('processor2');
            })
          ]);
        });

        bdd.it('should return results up to and including the erroring processor', () => {
          return Promise.all([
            request.post('/kibana/ingest/simulate')
            .send(pipeline)
            .expect(200)
            .then((response) => {
              expect(response.body.length).to.be(2);
            })
          ]);
        });

      });

    });
  };
});
