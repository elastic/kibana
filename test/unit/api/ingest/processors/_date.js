define(function (require) {
  var Promise = require('bluebird');
  var _ = require('intern/dojo/node!lodash');
  var expect = require('intern/dojo/node!expect.js');
  var moment = require('intern/dojo/node!moment');

  const testPipeline = {
    processors: [{
      processor_id: 'processor1',
      type_id: 'date',
      source_field: 'dob',
      target_field: 'dob',
      formats: ['Custom'],
      timezone: 'Etc/UTC',
      locale: 'ENGLISH',
      custom_format: 'MM/dd/yyyy',
      ignore_failure: false
    }],
    input: { dob: '07/05/1979' }
  };

  return function (bdd, scenarioManager, request) {
    bdd.describe('simulate - date processor', () => {

      bdd.it('should return 400 for an invalid payload', () => {
        return Promise.all([
          // Date processor requires source_field property
          request.post('/kibana/ingest/simulate')
          .send({
            input: { dob: '07/05/1979' },
            processors: [{
              processor_id: 'processor1',
              type_id: 'date',
              source_field: 42,
              target_field: 'dob',
              formats: 'Custom',
              timezone: 'Etc/UTC',
              locale: 'ENGLISH',
              custom_format: 'MM/dd/yyyy',
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

      bdd.it('should return a simulated output with the correct result for the given processor', function () {
        return request.post('/kibana/ingest/simulate')
          .send(testPipeline)
          .expect(200)
          .then(function (response) {
            expect(response.body[0].output.dob).to.be('1979-07-05T00:00:00.000Z');
          });
      });

      bdd.it('should return a date in ISO 8601 format', function () {
        return request.post('/kibana/ingest/simulate')
          .send(testPipeline)
          .expect(200)
          .then(function (response) {
            expect(moment(response.body[0].output.dob, moment.ISO_8601).isValid()).to.be(true);
          });
      });

      bdd.it('should enforce snake case', () => {
        return request.post('/kibana/ingest/simulate')
        .send({
          processors: [{
            processorId: 'processor1',
            typeId: 'date',
            sourceField: 'dob',
            targetField: 'dob',
            formats: ['Custom'],
            timezone: 'Etc/UTC',
            locale: 'ENGLISH',
            customFormat: 'MM/dd/yyyy',
            ignore_failure: false
          }],
          input: { dob: '07/05/1979' }
        })
        .expect(400);
      });

    });
  };
});
