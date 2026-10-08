/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rRuleRequestSchema, getRRuleRequestSchema } from './v1';

describe('rRuleRequestSchema', () => {
  const basicRequest = {
    dtstart: '2021-01-01T00:00:00Z',
    tzid: 'UTC',
    freq: 0,
    byweekday: ['MO'],
    bymonthday: [1],
    bymonth: [2],
    interval: 2,
    until: '2021-02-01T00:00:00Z',
    count: 2,
  };

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2021-01-01T00:00:00Z'));
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  test('no errors on proper request', () => {
    expect(rRuleRequestSchema.validate(basicRequest)).toEqual(basicRequest);
  });

  describe('tzid', () => {
    test('returns an error with invalid values', () => {
      expect(() => rRuleRequestSchema.validate({ ...basicRequest, tzid: 'invalid' })).toThrow();
    });
  });

  describe('interval', () => {
    test('returns an error with invalid values', () => {
      expect(() => rRuleRequestSchema.validate({ ...basicRequest, interval: 'invalid' })).toThrow();
    });

    test('returns an error when it is a number but not an integer', () => {
      expect(() => rRuleRequestSchema.validate({ ...basicRequest, interval: 1.5 })).toThrow();
    });

    test('returns an error when is set to less than one', () => {
      expect(() => rRuleRequestSchema.validate({ ...basicRequest, interval: 0 })).toThrow();
    });
  });

  describe('until', () => {
    test('returns an error with invalid values', () => {
      expect(() => rRuleRequestSchema.validate({ ...basicRequest, until: 'invalid' })).toThrow();
    });

    test('returns an error if the date is in the past', () => {
      expect(() =>
        // one year ago
        rRuleRequestSchema.validate({ ...basicRequest, until: '2020-01-01T00:00:00Z' })
      ).toThrow();
    });
  });

  describe('count', () => {
    test('returns an error with invalid values', () => {
      expect(() => rRuleRequestSchema.validate({ ...basicRequest, count: 'invalid' })).toThrow();
    });

    test('returns an error when it is a number but not an integer', () => {
      expect(() => rRuleRequestSchema.validate({ ...basicRequest, count: 1.5 })).toThrow();
    });

    test('returns an error when is set to less than one', () => {
      expect(() => rRuleRequestSchema.validate({ ...basicRequest, count: 0 })).toThrow();
    });
  });

  describe('byweekday', () => {
    test('returns an error if the are no values', () => {
      expect(() => rRuleRequestSchema.validate({ ...basicRequest, byweekday: [] })).toThrow();
    });

    test('returns an error with invalid values', () => {
      expect(() =>
        rRuleRequestSchema.validate({ ...basicRequest, byweekday: ['invalid'] })
      ).toThrow();
    });

    test('returns an error if the array length is larger than 50', () => {
      expect(() =>
        rRuleRequestSchema.validate({
          ...basicRequest,
          byweekday: Array.from({ length: 51 }, () => 'MO'),
        })
      ).toThrow();
    });
  });

  describe('bymonthday', () => {
    test('returns an error if the are no values', () => {
      expect(() => rRuleRequestSchema.validate({ ...basicRequest, bymonthday: [] })).toThrow();
    });

    test('returns an error with invalid values', () => {
      expect(() =>
        rRuleRequestSchema.validate({ ...basicRequest, bymonthday: ['invalid'] })
      ).toThrow();
    });

    test('returns an error if the values are less than one', () => {
      expect(() => rRuleRequestSchema.validate({ ...basicRequest, bymonthday: [0] })).toThrow();
    });

    test('returns an error if the values are bigger than 31', () => {
      expect(() => rRuleRequestSchema.validate({ ...basicRequest, bymonthday: [32] })).toThrow();
    });

    test('returns an error if the array length is larger than 31', () => {
      expect(() =>
        rRuleRequestSchema.validate({
          ...basicRequest,
          bymonthday: Array.from({ length: 32 }, () => 1),
        })
      ).toThrow();
    });
  });

  describe('bymonth', () => {
    test('returns an error if the are no values', () => {
      expect(() => rRuleRequestSchema.validate({ ...basicRequest, bymonth: [] })).toThrow();
    });

    test('returns an error with invalid values', () => {
      expect(() =>
        rRuleRequestSchema.validate({ ...basicRequest, bymonth: ['invalid'] })
      ).toThrow();
    });

    test('returns an error if the values are less than one', () => {
      expect(() => rRuleRequestSchema.validate({ ...basicRequest, bymonth: [0] })).toThrow();
    });

    test('returns an error if the values are bigger than 12', () => {
      expect(() => rRuleRequestSchema.validate({ ...basicRequest, bymonth: [13] })).toThrow();
    });

    test('returns an error if array length is larger than 12', () => {
      expect(() =>
        rRuleRequestSchema.validate({
          ...basicRequest,
          bymonth: Array.from({ length: 13 }, () => 1),
        })
      ).toThrow();
    });
  });
});

describe('getRRuleRequestSchema', () => {
  const basicRequest = {
    dtstart: '2021-01-01T00:00:00Z',
    tzid: 'UTC',
    freq: 0,
    byweekday: ['MO'],
    bymonthday: [1],
    bymonth: [2],
    interval: 2,
    until: '2021-02-01T00:00:00Z',
    count: 2,
  };

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2021-01-01T00:00:00Z'));
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('byweekday', () => {
    test('uses the max allowed limit (50) if a larger value is provided', () => {
      const schema = getRRuleRequestSchema({ maxByweekday: 100 });
      expect(() =>
        schema.validate({
          ...basicRequest,
          byweekday: Array.from({ length: 51 }, () => 'MO'),
        })
      ).toThrow();
    });
  });

  describe('bymonthday', () => {
    test('uses the max allowed limit (31) if a larger value is provided', () => {
      const schema = getRRuleRequestSchema({ maxBymonthday: 100 });
      expect(() =>
        schema.validate({
          ...basicRequest,
          bymonthday: Array.from({ length: 32 }, () => 1),
        })
      ).toThrow();
    });
  });

  describe('bymonth', () => {
    test('uses the max allowed limit (12) if a larger value is provided', () => {
      const schema = getRRuleRequestSchema({ maxBymonth: 100 });
      expect(() =>
        schema.validate({
          ...basicRequest,
          bymonth: Array.from({ length: 13 }, () => 1),
        })
      ).toThrow();
    });
  });
});
