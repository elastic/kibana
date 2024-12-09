/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isDateRangeValid } from './utils';

describe('isDateRangeValid', () => {
  describe('Valid ranges', () => {
    it.each([
      ['both start and end date is `now`', { start: 'now', end: 'now' }],
      ['start date is `now-10s` and end date is `now`', { start: 'now-10s', end: 'now' }],
      ['bounded within the min and max date range', { start: 'now-8d', end: 'now-4s' }],
    ])('should return true if %s', (_, { start, end }) => {
      expect(isDateRangeValid({ start, end })).toBe(true);
    });
  });

  describe('Invalid ranges', () => {
    it.each([
      ['starts before the min date', { start: 'now-11d', end: 'now-5s' }],
      ['ends after the max date', { start: 'now-9d', end: 'now+2s' }],
      [
        'end date is before the start date even when both are within min and max date range',
        { start: 'now-3s', end: 'now-10s' },
      ],
    ])('should return false if the date range %s', (_, { start, end }) => {
      expect(isDateRangeValid({ start, end })).toBe(false);
    });
  });
});
