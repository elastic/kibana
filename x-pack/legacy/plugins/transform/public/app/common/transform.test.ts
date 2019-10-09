/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isTransformIdValid } from './transform';

describe('Transform: isTransformIdValid()', () => {
  test('returns true for job ID: "good_job-name"', () => {
    expect(isTransformIdValid('good_job-name')).toBe(true);
  });
  test('returns false for job ID: "_bad_job-name"', () => {
    expect(isTransformIdValid('_bad_job-name')).toBe(false);
  });
  test('returns false for job ID: "bad_job-name_"', () => {
    expect(isTransformIdValid('bad_job-name_')).toBe(false);
  });
  test('returns false for job ID: "-bad_job-name"', () => {
    expect(isTransformIdValid('-bad_job-name')).toBe(false);
  });
  test('returns false for job ID: "bad_job-name-"', () => {
    expect(isTransformIdValid('bad_job-name-')).toBe(false);
  });
  test('returns false for job ID: "bad&job-name"', () => {
    expect(isTransformIdValid('bad&job-name')).toBe(false);
  });
});
