/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rRuleRequestSchema } from './v1';

describe('rRuleRequestSchema', () => {
  const basicRequest = {
    dtstart: '2021-01-01T00:00:00Z',
    tzid: 'UTC',
    freq: 0,
    byweekday: ['MO'],
    bymonthday: [1],
    bymonth: [2],
  };

  test('no errors on proper request', () => {
    expect(rRuleRequestSchema.validate(basicRequest)).toEqual(basicRequest);
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
  });
});
