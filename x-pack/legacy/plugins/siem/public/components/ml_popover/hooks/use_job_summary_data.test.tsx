/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getSiemJobsFromJobsSummary } from './use_job_summary_data';
import { mockJobsSummaryResponse } from '../__mocks__/api';

describe('useJobSummaryData', () => {
  describe('getSiemJobsFromJobsSummary', () => {
    test('returns all jobs that are in the siem group', () => {
      const siemJobs = getSiemJobsFromJobsSummary(mockJobsSummaryResponse);
      expect(siemJobs.length).toEqual(3);
    });
  });
});
