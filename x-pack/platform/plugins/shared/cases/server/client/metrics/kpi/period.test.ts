/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getPreviousPeriod } from './period';

const now = new Date('2026-11-17T12:00:00.000Z');

describe('getPreviousPeriod', () => {
  it('returns the 7 days before a relative 7 day range', () => {
    expect(getPreviousPeriod({ from: 'now-7d', to: 'now' }, now)).toEqual({
      from: '2026-11-03T12:00:00.000Z',
      to: '2026-11-10T11:59:59.999Z',
    });
  });

  it('returns the period before an absolute range', () => {
    expect(
      getPreviousPeriod({ from: '2026-11-10T00:00:00.000Z', to: '2026-11-17T00:00:00.000Z' }, now)
    ).toEqual({
      from: '2026-11-03T00:00:00.000Z',
      to: '2026-11-09T23:59:59.999Z',
    });
  });

  it('uses now when the range has no end', () => {
    expect(getPreviousPeriod({ from: 'now-1d' }, now)).toEqual({
      from: '2026-11-15T12:00:00.000Z',
      to: '2026-11-16T11:59:59.999Z',
    });
  });

  it('returns undefined when the range has no start', () => {
    expect(getPreviousPeriod({ to: 'now' }, now)).toBeUndefined();
  });

  it('returns undefined for the all time range', () => {
    expect(getPreviousPeriod({ from: '1970-01-01T00:00:00.000Z', to: 'now' }, now)).toBeUndefined();
  });

  it('returns undefined for a date that does not parse', () => {
    expect(getPreviousPeriod({ from: 'not a date', to: 'now' }, now)).toBeUndefined();
  });

  it('returns undefined when the end is before the start', () => {
    expect(getPreviousPeriod({ from: 'now', to: 'now-1d' }, now)).toBeUndefined();
  });
});
