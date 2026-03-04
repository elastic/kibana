/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseSchedule } from './parse_schedule';

describe('parseSchedule', () => {
  it('should parse a redurring schedule object correctly', () => {
    const schedule = {
      frequency: '1',
      customFrequency: '2',
      interval: '3',
      count: '4',
    };
    // @ts-expect-error See comment in parseSchedule about form-lib string conversion
    expect(parseSchedule(schedule)).toEqual({
      frequency: 1,
      customFrequency: 2,
      interval: 3,
      count: 4,
    });
  });

  it('should not overwrite fields containing unparseable ints', () => {
    const schedule = {
      frequency: 'invalidNumber',
      customFrequency: '2',
      interval: '3',
      count: '4',
    };
    // @ts-expect-error See comment in parseSchedule about form-lib string conversion
    expect(parseSchedule(schedule).frequency).toEqual('invalidNumber');
  });

  it('should return undefined for undefined schedules', () => {
    expect(parseSchedule(undefined)).toBeUndefined();
  });
});
