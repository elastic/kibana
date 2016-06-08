define(function (require) {
  var Promise = require('bluebird');
  var _ = require('intern/dojo/node!lodash');
  var expect = require('intern/dojo/node!expect.js');

  const testPipeline = {
    processors: [{
      processor_id: 'processor1',
      type_id: 'geoip',
      source_field: 'ip',
      target_field: 'geoip',
      ignore_failure: false
    }],
    input: { ip: '74.125.21.103' }
  };


  return function (bdd, scenarioManager, request) {
    bdd.describe('simulate - geoip processor', () => {
  //TODO: These tests can be re-added when we address
  // installing plugins for integration tests
  // https://github.com/elastic/kibana/issues/6852

  //     bdd.it('should return 400 for an invalid payload', () => {
  //       return Promise.all([
  //         // Geo IP processor requires source_field property
  //         request.post('/kibana/ingest/simulate')
  //         .send({
  //           input: { ip: '74.125.21.103' },
  //           processors: [{
  //             processor_id: 'processor1',
  //             type_id: 'geoip',
  //             source_field: 42,
  //             target_field: 'geoip',
  //             ignore_failure: false
  //           }]
  //         })
  //         .expect(400)
  //       ]);
  //     });

  //     bdd.it('should return 200 for a valid simulate request', () => {
  //       return request.post('/kibana/ingest/simulate')
  //         .send(testPipeline)
  //         .expect(200);
  //     });

  //     bdd.it('should return a simulated output with the correct result for the given processor', () => {
  //       return request.post('/kibana/ingest/simulate')
  //         .send(testPipeline)
  //         .expect(200)
  //         .then(function (response) {
  //           expect(response.body[0].output.geoip.city_name).to.be('Mountain View');
  //         });
  //     });

  //     bdd.it('should enforce snake case', () => {
  //       return request.post('/kibana/ingest/simulate')
  //       .send({
  //         processors: [{
  //           processorId: 'processor1',
  //           typeId: 'geoip',
  //           sourceField: 'ip',
  //           targetField: 'geoip',
  //           ignore_failure: false
  //         }],
  //         input: { ip: '74.125.21.103' }
  //       })
  //       .expect(400);
  //     });

    });
  };
});
