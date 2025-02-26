/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { validateSchedule } from './v1';

describe('validateSchedule', () => {
  beforeEach(() => jest.clearAllMocks());

  it('validates duration and every correctly', () => {
    expect(
      validateSchedule({
        duration: '1h',
        recurring: { every: '2w' },
      })
    ).toBeUndefined();
  });

  it('throws error when duration in minutes and greater than interval', () => {
    expect(
      validateSchedule({
        duration: '2000m',
        recurring: { every: '1d' },
      })
    ).toEqual('Recurrence every 1d must be longer than the snooze duration 2000m');
  });

  it('throws error when duration in hours greater than interval', () => {
    expect(
      validateSchedule({
        duration: '700h',
        recurring: { every: '1w' },
      })
    ).toEqual('Recurrence every 1w must be longer than the snooze duration 700h');
  });

  it('throws error when recurring schedule provided with indefinite duration', () => {
    expect(
      validateSchedule({
        duration: '-1',
        recurring: { every: '1M' },
      })
    ).toEqual(
      'The duration of -1 snoozes the rule indefinitely. Recurring schedules cannot be set when the duration is -1.'
    );
  });
});
