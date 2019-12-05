/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  loadMlServerInfo,
  getCloudDeploymentId,
  isCloud,
  getNewJobDefaults,
  getNewJobLimits,
} from './ml_server_info';
import mockMlInfoResponse from './__mocks__/ml_info_response.json';

jest.mock('./ml_api_service', () => ({
  ml: {
    mlInfo: jest.fn(() => Promise.resolve(mockMlInfoResponse)),
  },
}));

describe('ml_server_info initial state', () => {
  it('server info not loaded ', () => {
    expect(isCloud()).toBe(false);
    expect(getCloudDeploymentId()).toBe(null);
  });
});

describe('ml_server_info', () => {
  beforeEach(async done => {
    await loadMlServerInfo();
    done();
  });

  describe('cloud information', () => {
    it('can get could deployment id', () => {
      expect(isCloud()).toBe(true);
      expect(getCloudDeploymentId()).toBe('85d666f3350c469e8c3242d76a7f459c');
    });
  });

  describe('defaults', () => {
    it('can get defaults', async done => {
      const defaults = getNewJobDefaults();

      expect(defaults.anomaly_detectors.model_memory_limit).toBe('128mb');
      expect(defaults.anomaly_detectors.categorization_examples_limit).toBe(4);
      expect(defaults.anomaly_detectors.model_snapshot_retention_days).toBe(1);
      expect(defaults.datafeeds.scroll_size).toBe(1000);
      done();
    });
  });

  describe('limits', () => {
    it('can get limits', async done => {
      const limits = getNewJobLimits();

      expect(limits.max_model_memory_limit).toBe('128mb');
      done();
    });
  });
});
