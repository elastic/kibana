/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateDuration } from './task';

test('allows valid duration', () => {
  expect(validateDuration('1s')).toBeUndefined();
  expect(validateDuration('45346s')).toBeUndefined();
  expect(validateDuration('10m')).toBeUndefined();
  expect(validateDuration('30000000h')).toBeUndefined();
  expect(validateDuration('3245d')).toBeUndefined();
});

test('returns error message for invalid duration', () => {
  expect(validateDuration('10x')).toBe('string is not a valid duration: 10x');
  expect(validateDuration('PT1M')).toBe('string is not a valid duration: PT1M');
  expect(validateDuration('foo')).toBe('string is not a valid duration: foo');
  expect(validateDuration('1 minute')).toBe('string is not a valid duration: 1 minute');
  expect(validateDuration('1hr')).toBe('string is not a valid duration: 1hr');
});
