/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { newJobCapsService } from './new_job_capabilities_service';
import { IndexPattern } from 'ui/index_patterns';

// there is magic happening here. starting the include name with `mock..`
// ensures it can be lazily loaded by the jest.mock function below.
import mockFarequoteResponse from './__mocks__/farequote_job_caps_response.json';

jest.mock('./ml_api_service', () => ({
  ml: {
    jobs: {
      newJobCaps: jest.fn(() => Promise.resolve(mockFarequoteResponse)),
    },
  },
}));

const indexPattern = ({
  id: 'farequote-*',
  title: 'farequote-*',
} as unknown) as IndexPattern;

describe('new_job_capabilities_service', () => {
  describe('farequote newJobCaps()', () => {
    it('can construct job caps objects from endpoint json', async done => {
      await newJobCapsService.initializeFromIndexPattern(indexPattern);
      const { fields, aggs } = await newJobCapsService.newJobCaps;

      const responseTimeField = fields.find(f => f.id === 'responsetime') || { aggs: [] };
      const airlineField = fields.find(f => f.id === 'airline') || { aggs: [] };
      const meanAgg = aggs.find(a => a.id === 'mean') || { fields: [] };
      const distinctCountAgg = aggs.find(a => a.id === 'distinct_count') || { fields: [] };

      expect(fields).toHaveLength(3);
      expect(aggs).toHaveLength(15);

      expect(responseTimeField.aggs).toHaveLength(12);
      expect(airlineField.aggs).toHaveLength(1);

      expect(meanAgg.fields).toHaveLength(1);
      expect(distinctCountAgg.fields).toHaveLength(2);
      done();
    });
  });
});
