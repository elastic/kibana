/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getPreviousPeriod, resolveKpiRange } from './period';

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

describe('resolveKpiRange', () => {
  it('resolves date math in UTC from one instant', () => {
    expect(resolveKpiRange({ from: 'now-30d', to: 'now' }, now)).toEqual({
      from: '2026-10-18T12:00:00.000Z',
      to: '2026-11-17T12:00:00.000Z',
    });
  });

  it('rounds the start down and the end up', () => {
    expect(resolveKpiRange({ from: 'now/d', to: 'now/d' }, now)).toEqual({
      from: '2026-11-17T00:00:00.000Z',
      to: '2026-11-17T23:59:59.999Z',
    });
  });

  it('keeps an absolute date as it is', () => {
    const range = { from: '2026-11-10T00:00:00.000Z', to: '2026-11-17T00:00:00.000Z' };

    expect(resolveKpiRange(range, now)).toEqual(range);
  });

  it('keeps a missing date missing', () => {
    expect(resolveKpiRange({ from: 'now-1d' }, now)).toEqual({ from: '2026-11-16T12:00:00.000Z' });
    expect(resolveKpiRange({}, now)).toEqual({});
  });

  it('keeps a date math string that does not parse', () => {
    expect(resolveKpiRange({ from: 'now-abc', to: 'now' }, now)).toEqual({
      from: 'now-abc',
      to: '2026-11-17T12:00:00.000Z',
    });
  });
});

describe('the previous period across a daylight saving change', () => {
  // The Europe/Madrid clocks change on 2026-03-29 and on 2026-10-25.
  it.each([
    ['now-30d', '2026-11-17T12:00:00.000Z', 'autumn'],
    ['now-7d', '2026-11-01T12:00:00.000Z', 'autumn'],
    ['now-30d', '2026-04-15T12:00:00.000Z', 'spring'],
    ['now-7d', '2026-04-03T12:00:00.000Z', 'spring'],
  ])('ends 1 ms before the current range starts for %s (%s, %s)', (from, instant) => {
    const fixedNow = new Date(instant);
    const range = resolveKpiRange({ from, to: 'now' }, fixedNow);
    const previous = getPreviousPeriod(range, fixedNow);
    const lengthMs = Date.parse(range.to ?? '') - Date.parse(range.from ?? '');

    expect(previous).toBeDefined();
    expect(Date.parse(previous?.to ?? '') + 1).toBe(Date.parse(range.from ?? ''));
    expect(Date.parse(previous?.to ?? '') + 1 - Date.parse(previous?.from ?? '')).toBe(lengthMs);
  });

  it('uses a start of 30 whole days before now in UTC', () => {
    const fixedNow = new Date('2026-11-17T14:37:00.000Z');
    const range = resolveKpiRange({ from: 'now-30d', to: 'now' }, fixedNow);

    expect(range.from).toBe('2026-10-18T14:37:00.000Z');
    expect(getPreviousPeriod(range, fixedNow)).toEqual({
      from: '2026-09-18T14:37:00.000Z',
      to: '2026-10-18T14:36:59.999Z',
    });
  });

  it('gives the same previous period for date math and for the resolved range', () => {
    const fixedNow = new Date('2026-11-17T14:37:00.000Z');
    const range = resolveKpiRange({ from: 'now-30d', to: 'now' }, fixedNow);

    expect(getPreviousPeriod({ from: 'now-30d', to: 'now' }, fixedNow)).toEqual(
      getPreviousPeriod(range, fixedNow)
    );
  });
});
