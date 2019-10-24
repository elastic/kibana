/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { newJobCapsService } from './new_job_capabilities_service';
import { IndexPattern } from 'ui/index_patterns';

// there is magic happening here. starting the include name with `mock..`
// ensures it can be lazily loaded by the jest.mock function below.
import mockCloudwatchResponse from './__mocks__/cloudwatch_job_caps_response.json';

jest.mock('./ml_api_service', () => ({
  ml: {
    jobs: {
      newJobCaps: jest.fn(() => Promise.resolve(mockCloudwatchResponse)),
    },
  },
}));

const indexPattern = ({
  id: 'cloudwatch-*',
  title: 'cloudwatch-*',
} as unknown) as IndexPattern;

describe('new_job_capabilities_service', () => {
  describe('cloudwatch newJobCaps()', () => {
    it('can construct job caps objects from endpoint json', async done => {
      await newJobCapsService.initializeFromIndexPattern(indexPattern);
      const { fields, aggs } = await newJobCapsService.newJobCaps;

      const networkOutField = fields.find(f => f.id === 'NetworkOut') || { aggs: [] };
      const regionField = fields.find(f => f.id === 'region') || { aggs: [] };
      const meanAgg = aggs.find(a => a.id === 'mean') || { fields: [] };
      const distinctCountAgg = aggs.find(a => a.id === 'distinct_count') || { fields: [] };

      expect(fields).toHaveLength(12);
      expect(aggs).toHaveLength(35);

      expect(networkOutField.aggs).toHaveLength(25);
      expect(regionField.aggs).toHaveLength(3);

      expect(meanAgg.fields).toHaveLength(7);
      expect(distinctCountAgg.fields).toHaveLength(10);
      done();
    });

    it('job caps including text fields', async done => {
      await newJobCapsService.initializeFromIndexPattern(indexPattern, true, false);
      const { fields, aggs } = await newJobCapsService.newJobCaps;

      expect(fields).toHaveLength(13); // one more field
      expect(aggs).toHaveLength(35);

      done();
    });

    it('job caps excluding event rate', async done => {
      await newJobCapsService.initializeFromIndexPattern(indexPattern, false, true);
      const { fields, aggs } = await newJobCapsService.newJobCaps;

      expect(fields).toHaveLength(11); // one less field
      expect(aggs).toHaveLength(35);

      done();
    });
  });
});
