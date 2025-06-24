/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { validateOnWeekDay } from './v1';

describe('validateOnWeekDay', () => {
  it('validates empty array', () => {
    expect(validateOnWeekDay([])).toEqual('OnWeekDay cannot be empty');
  });

  it('validates properly formed onWeekDay strings', () => {
    const weekdays = [
      '+1MO',
      '+2TU',
      '+3WE',
      '+4TH',
      '+5FR',
      '-5SA',
      '-4SU',
      '-3MO',
      '-2TU',
      '-1WE',
    ];

    expect(validateOnWeekDay(weekdays)).toBeUndefined();
  });

  it('validates improperly formed onWeekDay strings', () => {
    expect(validateOnWeekDay(['+1MO', 'FOO', '+3WE', 'BAR', '-4FR'])).toEqual(
      'Invalid onWeekDay values in recurring schedule: FOO,BAR'
    );
  });

  it('validates invalid week numbers in onWeekDay strings', () => {
    expect(validateOnWeekDay(['+15MO', '+3WE', '-7FR'])).toEqual(
      'Invalid onWeekDay values in recurring schedule: +15MO,-7FR'
    );
  });

  it('validates onWeekDay strings without recurrence', () => {
    expect(validateOnWeekDay(['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'])).toBeUndefined();
  });
});
