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
    ).toEqual('Recurrence every 1d must be longer than the duration 2000m.');
  });

  it('throws error when duration in hours greater than interval', () => {
    expect(
      validateSchedule({
        duration: '169h',
        recurring: { every: '1w' },
      })
    ).toEqual('Recurrence every 1w must be longer than the duration 169h.');
  });

  it('throws error when duration in hours greater than interval in months', () => {
    expect(
      validateSchedule({
        duration: '740h',
        recurring: { every: '1M' },
      })
    ).toEqual('Recurrence every 1M must be longer than the duration 740h.');
  });

  it('throws error when duration in hours greater than interval in years', () => {
    expect(
      validateSchedule({
        duration: '8761h',
        recurring: { every: '1y' },
      })
    ).toEqual('Recurrence every 1y must be longer than the duration 8761h.');
  });

  it('throws error when duration in days and greater than interval', () => {
    expect(
      validateSchedule({
        duration: '2d',
        recurring: { every: '1d' },
      })
    ).toEqual('Recurrence every 1d must be longer than the duration 2d.');
  });

  it('throws error when recurring end and occurrences both are provided', () => {
    expect(
      validateSchedule({
        duration: '5h',
        recurring: { every: '1w', end: '2021-05-10T00:00:00.000Z', occurrences: 5 },
      })
    ).toEqual(`Only one of 'end' or 'occurrences' can be set for recurring schedules.`);
  });
});
