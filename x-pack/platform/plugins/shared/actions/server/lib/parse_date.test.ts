/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseDate, parseIsoOrRelativeDate } from './parse_date';

describe('parseDate', () => {
  test('returns valid parsed date', () => {
    const date = new Date(Date.now() - 1 * 60 * 60 * 1000);
    const parsedDate = parseDate(date.toISOString(), 'dateStart', new Date());
    expect(parsedDate?.valueOf()).toBe(date.valueOf());
  });

  test('returns default value if date is undefined', () => {
    const date = new Date();
    const parsedDate = parseDate(undefined, 'dateStart', date);
    expect(parsedDate?.valueOf()).toBe(date.valueOf());
  });

  test('throws an error for invalid date strings', () => {
    expect(() =>
      parseDate('this shall not pass', 'dateStart', new Date())
    ).toThrowErrorMatchingInlineSnapshot(
      `"Invalid date for parameter dateStart: \\"this shall not pass\\""`
    );
  });
});

describe('parseIsoOrRelativeDate', () => {
  test('handles ISO dates', () => {
    const date = new Date();
    const parsedDate = parseIsoOrRelativeDate(date.toISOString());
    expect(parsedDate?.valueOf()).toBe(date.valueOf());
  });

  test('handles relative dates', () => {
    const hoursDiff = 1;
    const date = new Date(Date.now() - hoursDiff * 60 * 60 * 1000);
    const parsedDate = parseIsoOrRelativeDate(`${hoursDiff}h`);
    const diff = Math.abs(parsedDate!.valueOf() - date.valueOf());
    expect(diff).toBeLessThan(1000);
  });

  test('returns undefined for invalid date strings', () => {
    const parsedDate = parseIsoOrRelativeDate('this shall not pass');
    expect(parsedDate).toBeUndefined();
  });
});
