/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isJobIdValid } from './is_job_id_valid';

describe('isJobIdValid', () => {
  test('returns true for job id: "good_job-name"', () => {
    expect(isJobIdValid('good_job-name')).toBe(true);
  });
  test('returns false for job id: "_bad_job-name"', () => {
    expect(isJobIdValid('_bad_job-name')).toBe(false);
  });
  test('returns false for job id: "bad_job-name_"', () => {
    expect(isJobIdValid('bad_job-name_')).toBe(false);
  });
  test('returns false for job id: "-bad_job-name"', () => {
    expect(isJobIdValid('-bad_job-name')).toBe(false);
  });
  test('returns false for job id: "bad_job-name-"', () => {
    expect(isJobIdValid('bad_job-name-')).toBe(false);
  });
  test('returns false for job id: "bad&job-name"', () => {
    expect(isJobIdValid('bad&job-name')).toBe(false);
  });
});
