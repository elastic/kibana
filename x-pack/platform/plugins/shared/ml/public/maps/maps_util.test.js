/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getResultsForJobId } from './util';
import {
  mlResultsServiceMock,
  typicalExpected,
  actualExpected,
  typicalToActualExpected,
} from './results.test.mock';

describe('Maps util', () => {
  describe('getResultsForJobId', () => {
    const jobId = 'jobId';
    const searchFilters = {
      timeFilters: { from: 'now-2y', to: 'now' },
      query: { language: 'kuery', query: '' },
    };

    test('should get map features from job anomalies results for typical layer', async () => {
      const actual = await getResultsForJobId(
        mlResultsServiceMock,
        jobId,
        'typical',
        searchFilters
      );
      expect(actual).toEqual(typicalExpected);
    });

    test('should get map features from job anomalies results for actual layer', async () => {
      const actual = await getResultsForJobId(mlResultsServiceMock, jobId, 'actual', searchFilters);
      expect(actual).toEqual(actualExpected);
    });

    test('should get map features from job anomalies results for "typical to actual" layer', async () => {
      const actual = await getResultsForJobId(
        mlResultsServiceMock,
        jobId,
        'typical to actual',
        searchFilters
      );
      expect(actual).toEqual(typicalToActualExpected);
    });
  });
});
