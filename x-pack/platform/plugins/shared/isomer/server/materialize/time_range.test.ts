/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dateMath from '@kbn/datemath';
import moment from 'moment-timezone';
import { resolveTimeRange, serverTimeZone } from './time_range';

const now = new Date('2026-11-04T03:30:00.000Z');

/**
 * How Kibana's browser resolves a range: core sets moment's default zone to `dateFormat:tz`, and
 * the time filter parses the start rounded down and the end rounded up.
 */
const browserResolve = (from: string, to: string, timeZone: string) => {
  moment.tz.setDefault(timeZone);
  try {
    return {
      from: dateMath.parse(from, { forceNow: now })!.toISOString(),
      to: dateMath.parse(to, { roundUp: true, forceNow: now })!.toISOString(),
    };
  } finally {
    moment.tz.setDefault();
  }
};

describe('resolveTimeRange', () => {
  it.each([
    ['now-7d/d', 'now', 'America/New_York'],
    ['now-7d/d', 'now/d', 'Europe/Paris'],
    ['now/w', 'now/w', 'Asia/Kolkata'],
    ['now-1M/M', 'now-1M/M', 'Australia/Sydney'],
    ['now-15m', 'now', 'Pacific/Chatham'],
    ['2026-11-01T00:00:00', '2026-11-02T00:00:00', 'America/New_York'],
    ['now-1d/d', 'now-1d/d', 'UTC'],
  ])('resolves %s to %s in %s as the browser does', (from, to, timeZone) => {
    expect(resolveTimeRange({ from, to }, { now, timeZone })).toEqual(
      browserResolve(from, to, timeZone)
    );
  });

  it('rounds days in the zone, not in the server zone', () => {
    // 03:30 UTC is still November 3 in New York.
    expect(
      resolveTimeRange({ from: 'now/d', to: 'now/d' }, { now, timeZone: 'America/New_York' })
    ).toEqual({
      from: '2026-11-03T05:00:00.000Z',
      to: '2026-11-04T04:59:59.999Z',
    });
  });

  it('resolves Browser as UTC, as the server formats it', () => {
    expect(serverTimeZone('Browser')).toBe('UTC');
    expect(resolveTimeRange({ from: 'now/d', to: 'now' }, { now, timeZone: 'Browser' })).toEqual(
      browserResolve('now/d', 'now', 'UTC')
    );
  });

  it('keeps absolute times, the mode, and bounds that are not date math', () => {
    // Moment warns when it falls back to `Date` for the bound that isn't a date.
    jest.spyOn(console, 'warn').mockImplementationOnce(() => {});
    expect(
      resolveTimeRange(
        { from: '2026-11-01T00:00:00.000Z', to: 'not a date', mode: 'absolute' },
        { now, timeZone: 'Europe/Paris' }
      )
    ).toEqual({ from: '2026-11-01T00:00:00.000Z', to: 'not a date', mode: 'absolute' });
  });

  it("leaves moment's default zone alone", () => {
    resolveTimeRange({ from: 'now/d', to: 'now' }, { now, timeZone: 'Asia/Tokyo' });
    expect(moment().tz()).toBeUndefined();
  });
});
