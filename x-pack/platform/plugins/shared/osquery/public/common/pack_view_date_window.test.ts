/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getPackViewDateWindow } from './pack_view_date_window';

describe('getPackViewDateWindow', () => {
  const timestamp = '2026-08-10T09:00:00.000Z';
  const lastResultTime = ['2026-08-10T09:48:47.000Z'];
  const now = '2026-08-10T10:00:00.000Z';

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date(now));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('scheduled execution', () => {
    it('returns an hour either side of the execution timestamp', () => {
      expect(getPackViewDateWindow({ isScheduled: true, timestamp, interval: 3600 })).toEqual({
        startDate: '2026-08-10T08:00:00.000Z',
        endDate: '2026-08-10T10:00:00.000Z',
        mode: 'absolute',
      });
    });

    it('returns an unset window when the execution timestamp is missing', () => {
      expect(getPackViewDateWindow({ isScheduled: true, interval: 3600 })).toEqual({
        startDate: undefined,
        endDate: undefined,
        mode: undefined,
      });
    });
  });

  describe('live query', () => {
    // A single live query carries no `interval`, so the window has to be anchored
    // on the action's own timestamp. Deriving it from `interval` collapsed the
    // range to a single instant and Discover found nothing.
    // https://github.com/elastic/sdh-security-team/issues/1779
    it('spans from the action timestamp to the last result when there is no interval', () => {
      const { startDate, endDate, mode } = getPackViewDateWindow({
        isScheduled: false,
        timestamp,
        lastResultTime,
      });

      expect({ startDate, endDate, mode }).toEqual({
        startDate: '2026-08-10T09:00:00.000Z',
        endDate: '2026-08-10T09:48:47.000Z',
        mode: 'absolute',
      });
      expect(startDate).not.toEqual(endDate);
    });

    it('leaves the window open when no results have been indexed yet', () => {
      expect(getPackViewDateWindow({ isScheduled: false, timestamp })).toEqual({
        startDate: '2026-08-10T09:00:00.000Z',
        endDate: 'now',
        // `mode` describes the pair of bounds, so an open-ended window stays
        // relative even though it starts at a fixed instant.
        mode: 'relative',
      });
    });

    it('prefers the action timestamp over the interval', () => {
      expect(
        getPackViewDateWindow({ isScheduled: false, timestamp, lastResultTime, interval: 60 })
      ).toEqual({
        startDate: '2026-08-10T09:00:00.000Z',
        endDate: '2026-08-10T09:48:47.000Z',
        mode: 'absolute',
      });
    });

    it('returns an unset window when neither an action timestamp nor an interval is available', () => {
      // Callers apply their own default relative range. Returning `now-undefineds`
      // here left Discover with an unparseable bound.
      expect(getPackViewDateWindow({ isScheduled: false, lastResultTime })).toEqual({
        startDate: undefined,
        endDate: undefined,
        mode: undefined,
      });
    });
  });

  describe('expiration bound', () => {
    // The toolbar "View in Discover" button ends its window at the action's
    // expiration, so the row action has to respect the same bound for the two
    // entry points to agree. https://github.com/elastic/kibana/issues/249984
    it('clamps the end to the action expiration', () => {
      expect(
        getPackViewDateWindow({
          isScheduled: false,
          timestamp,
          lastResultTime,
          expirationDate: '2026-08-10T09:05:00.000Z',
        })
      ).toEqual({
        startDate: '2026-08-10T09:00:00.000Z',
        endDate: '2026-08-10T09:05:00.000Z',
        mode: 'absolute',
      });
    });

    it('keeps the last result when it falls inside the expiration window', () => {
      expect(
        getPackViewDateWindow({
          isScheduled: false,
          timestamp,
          lastResultTime,
          expirationDate: '2026-08-10T09:55:00.000Z',
        })
      ).toEqual({
        startDate: '2026-08-10T09:00:00.000Z',
        endDate: '2026-08-10T09:48:47.000Z',
        mode: 'absolute',
      });
    });

    it('ends at now while the action is still running and no results have landed', () => {
      expect(
        getPackViewDateWindow({
          isScheduled: false,
          timestamp,
          expirationDate: '2026-08-10T10:30:00.000Z',
        })
      ).toEqual({
        startDate: '2026-08-10T09:00:00.000Z',
        endDate: now,
        mode: 'absolute',
      });
    });

    it('ends at the expiration once the action has expired without results', () => {
      expect(
        getPackViewDateWindow({
          isScheduled: false,
          timestamp,
          expirationDate: '2026-08-10T09:05:00.000Z',
        })
      ).toEqual({
        startDate: '2026-08-10T09:00:00.000Z',
        endDate: '2026-08-10T09:05:00.000Z',
        mode: 'absolute',
      });
    });
  });

  describe('clock skew', () => {
    // `timestamp` is stamped by Kibana, the end bound by the agent's documents.
    // An inverted range makes Elasticsearch return zero hits with no error.
    it('orders the bounds when the last result predates the action timestamp', () => {
      const { startDate, endDate, mode } = getPackViewDateWindow({
        isScheduled: false,
        timestamp,
        lastResultTime: ['2026-08-10T08:59:30.000Z'],
      });

      expect({ startDate, endDate, mode }).toEqual({
        startDate: '2026-08-10T08:59:30.000Z',
        endDate: '2026-08-10T09:00:00.000Z',
        mode: 'absolute',
      });
      expect(new Date(startDate!).getTime()).toBeLessThan(new Date(endDate!).getTime());
    });

    it('orders the bounds when the expiration predates the action timestamp', () => {
      const { startDate, endDate } = getPackViewDateWindow({
        isScheduled: false,
        timestamp,
        lastResultTime,
        expirationDate: '2026-08-10T08:58:00.000Z',
      });

      expect(new Date(startDate!).getTime()).toBeLessThan(new Date(endDate!).getTime());
    });
  });

  describe('pack query without an action timestamp', () => {
    it('spans one interval back from the last result', () => {
      expect(getPackViewDateWindow({ isScheduled: false, lastResultTime, interval: 3600 })).toEqual(
        {
          startDate: '2026-08-10T08:48:47.000Z',
          endDate: '2026-08-10T09:48:47.000Z',
          mode: 'absolute',
        }
      );
    });

    it('falls back to a relative window when there are no results', () => {
      expect(getPackViewDateWindow({ isScheduled: false, interval: 3600 })).toEqual({
        startDate: 'now-3600s',
        endDate: 'now',
        mode: 'relative',
      });
    });
  });
});
