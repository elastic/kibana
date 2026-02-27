/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { validateRecurrenceByWeekday } from './v1';

describe('validateRecurrenceByWeekday', () => {
  it('validates empty array', () => {
    expect(validateRecurrenceByWeekday([])).toEqual('rRule byweekday cannot be empty');
  });

  it('validates properly formed byweekday strings', () => {
    const weekdays = ['+1MO', '+2TU', '+3WE', '+4TH', '-4FR', '-3SA', '-2SU', '-1MO'];

    expect(validateRecurrenceByWeekday(weekdays)).toBeUndefined();
  });

  it('validates improperly formed byweekday strings', () => {
    expect(validateRecurrenceByWeekday(['+1MO', 'FOO', '+3WE', 'BAR', '-4FR'])).toEqual(
      'invalid byweekday values in rRule byweekday: FOO,BAR'
    );
  });

  it('validates byweekday strings without recurrence', () => {
    expect(validateRecurrenceByWeekday(['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'])).toBeUndefined();
  });
});
