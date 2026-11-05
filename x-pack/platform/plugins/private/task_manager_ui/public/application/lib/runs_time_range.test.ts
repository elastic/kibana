/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment-timezone';
import { getRunsTimeRangeError, toRunsWindow } from './runs_time_range';

describe('runs time range', () => {
  beforeAll(() => {
    moment.tz.setDefault('UTC');
    jest.useFakeTimers({ now: new Date('2026-11-04T12:34:56.789Z') });
  });

  afterAll(() => {
    jest.useRealTimers();
    moment.tz.setDefault();
  });

  it('resolves relative bounds against the same current time', () => {
    expect(toRunsWindow({ start: 'now-30d', end: 'now' })).toEqual({
      start: '2026-10-05T12:34:56.789Z',
      end: '2026-11-04T12:34:56.789Z',
    });
  });

  it('rounds the end of a rounded range up', () => {
    expect(toRunsWindow({ start: 'now/d', end: 'now/d' })).toEqual({
      start: '2026-11-04T00:00:00.000Z',
      end: '2026-11-04T23:59:59.999Z',
    });
  });

  it('keeps absolute bounds', () => {
    const window = { start: '2026-11-01T08:00:00.000Z', end: '2026-11-01T09:00:00.000Z' };

    expect(toRunsWindow(window)).toEqual(window);
  });

  it('throws for a bound that is not a date', () => {
    expect(() => toRunsWindow({ start: 'now-3x', end: 'now' })).toThrow(
      'Enter a valid time range.'
    );
  });

  it.each([
    [{ start: 'now-30d', end: 'now' }, undefined],
    [{ start: 'now-31d', end: 'now' }, 'Select a time range of 30 days or less.'],
    [
      { start: '2026-11-01T09:00:00.000Z', end: '2026-11-01T08:00:00.000Z' },
      'The end of the time range must be after its start.',
    ],
    [{ start: 'now-3x', end: 'now' }, 'Enter a valid time range.'],
  ])('validates %j', (timeRange, error) => {
    expect(getRunsTimeRangeError(timeRange)).toBe(error);
  });
});
