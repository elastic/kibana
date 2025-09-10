/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isJobVersionGte } from './is_job_version_gte';
import type { CombinedJob } from '@kbn/ml-common-types/anomaly_detection_jobs/combined_job';

describe('isJobVersionGte', () => {
  const job = {
    job_version: '6.1.1',
  } as unknown as CombinedJob;

  test('returns true for later job version', () => {
    expect(isJobVersionGte(job, '6.1.0')).toBe(true);
  });
  test('returns true for equal job version', () => {
    expect(isJobVersionGte(job, '6.1.1')).toBe(true);
  });
  test('returns false for earlier job version', () => {
    expect(isJobVersionGte(job, '6.1.2')).toBe(false);
  });
});
