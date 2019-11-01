/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// import {
//   loadMlServerInfo,
//   cloudDeploymentId,
//   isCloud,
//   newJobDefaults,
//   newJobLimits,
// } from './ml_server_info';
// import mockMlInfoResponse from './__mocks__/ml_info_response.json';

// jest.mock('./ml_api_service', () => ({
//   ml: {
//     mlInfo: jest.fn(() => Promise.resolve(mockMlInfoResponse)),
//   },
// }));

// describe('ml_server_info', () => {
//   it('server info not loaded ', async done => {
//     expect(isCloud()).toBe(false);
//     expect(cloudDeploymentId()).toBe(null);

//     // now load the info for the other tests
//     await loadMlServerInfo();
//     done();
//   });

//   describe('cloud information', () => {
//     it('can get could deployment id', () => {
//       expect(isCloud()).toBe(true);
//       expect(cloudDeploymentId()).toBe('85d666f3350c469e8c3242d76a7f459c');
//     });
//   });

//   describe('defaults', () => {
//     it('can get defaults', () => {
//       const defaults = newJobDefaults();

//       expect(defaults.anomaly_detectors.model_memory_limit).toBe('128mb');
//       expect(defaults.anomaly_detectors.categorization_examples_limit).toBe(4);
//       expect(defaults.anomaly_detectors.model_snapshot_retention_days).toBe(1);
//       expect(defaults.datafeeds.scroll_size).toBe(1000);
//     });
//   });

//   describe('limits', () => {
//     it('can get limits', () => {
//       const limits = newJobLimits();

//       expect(limits.max_model_memory_limit).toBe('128mb');
//     });
//   });
// });
