/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getMaybeDate } from './maybe_date';

describe('#getMaybeDate', () => {
  test('returns empty string as invalid date', () => {
    expect(getMaybeDate('').isValid()).toBe(false);
  });

  test('returns string with empty spaces as invalid date', () => {
    expect(getMaybeDate('  ').isValid()).toBe(false);
  });

  test('returns string date time as valid date', () => {
    expect(getMaybeDate('2019-05-28T23:05:28.405Z').isValid()).toBe(true);
  });

  test('returns string date time as the date we expect', () => {
    expect(getMaybeDate('2019-05-28T23:05:28.405Z').toISOString()).toBe('2019-05-28T23:05:28.405Z');
  });

  test('returns plain string number as epoch as valid date', () => {
    expect(getMaybeDate('1559084770612').isValid()).toBe(true);
  });

  test('returns plain string number as the date we expect', () => {
    expect(
      getMaybeDate('1559084770612')
        .toDate()
        .toISOString()
    ).toBe('2019-05-28T23:06:10.612Z');
  });

  test('returns plain number as epoch as valid date', () => {
    expect(getMaybeDate(1559084770612).isValid()).toBe(true);
  });

  test('returns plain number as epoch as the date we expect', () => {
    expect(
      getMaybeDate(1559084770612)
        .toDate()
        .toISOString()
    ).toBe('2019-05-28T23:06:10.612Z');
  });

  test('returns a short date time string as an epoch (sadly) so this is ambiguous', () => {
    expect(
      getMaybeDate('20190101')
        .toDate()
        .toISOString()
    ).toBe('1970-01-01T05:36:30.101Z');
  });
});
