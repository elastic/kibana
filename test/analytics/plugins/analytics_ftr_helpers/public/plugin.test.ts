/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ReplaySubject } from 'rxjs';
import type { AnalyticsServiceSetup, Event } from '@kbn/core/public';
import { coreMock } from '@kbn/core/public/mocks';

// Importing types to have the window properties defined
import './types';
import { AnalyticsFTRHelpers } from './plugin';
import { withTimeout } from '@kbn/std';

describe('AnalyticsFTRHelpers', () => {
  let plugin: AnalyticsFTRHelpers;
  let events$: ReplaySubject<Event>;
  let analyticsMock: jest.Mocked<AnalyticsServiceSetup>;

  beforeEach(() => {
    plugin = new AnalyticsFTRHelpers();
    // eslint-disable-next-line dot-notation
    events$ = plugin['events$'];
    const coreSetup = coreMock.createSetup();
    analyticsMock = coreSetup.analytics;
    plugin.setup(coreSetup);
  });

  describe('setOptIn', () => {
    test.each([true, false])('sets optIn value to %p', (optInValue) => {
      window.__analytics_ftr_helpers__.setOptIn(optInValue);
      expect(analyticsMock.optIn).toHaveBeenCalledWith({ global: { enabled: optInValue } });
    });
  });

  describe('getEvents', () => {
    const event: Event = {
      timestamp: new Date().toISOString(),
      event_type: 'test-event',
      context: {},
      properties: {},
    };

    test('should return any previously enqueued events as long as they match the required number of events', async () => {
      // 3 enqueued events
      const events = new Array(3).fill(event);
      events.forEach((ev) => events$.next(ev));

      await expect(window.__analytics_ftr_helpers__.getEvents(3)).resolves.toEqual(events);
    });

    test('should await until it matches the required number of events', async () => {
      // 3 enqueued events
      const events = new Array(3).fill(event);
      events.forEach((ev) => events$.next(ev));

      const getEventsPromise = window.__analytics_ftr_helpers__.getEvents(4);

      await expect(withTimeout({ promise: getEventsPromise, timeoutMs: 1000 })).resolves.toEqual({
        timedout: true,
      });

      // we are not filtering in the call by event type, so it should resolve as well
      const anotherEvent = { ...event, event_type: 'another-test-event' };
      events$.next(anotherEvent);

      await expect(getEventsPromise).resolves.toEqual([...events, anotherEvent]);
    });

    test('should await until it times out', async () => {
      // 3 enqueued events
      const events = new Array(3).fill(event);
      events.forEach((ev) => events$.next(ev));

      // expecting 4 with timeout of 1.5s
      const getEventsPromise = window.__analytics_ftr_helpers__.getEvents(4, {
        withTimeoutMs: 1500,
      });

      // after 1 second it still doesn't emit
      await expect(withTimeout({ promise: getEventsPromise, timeoutMs: 1000 })).resolves.toEqual({
        timedout: true,
      });

      // it emits 3 events at some point
      await expect(getEventsPromise).resolves.toEqual(events);
    });

    test('should filter by event-types when provided', async () => {
      // 3 enqueued events
      const events = [
        { ...event, event_type: 'one-test-event' },
        { ...event, event_type: 'another-test-event' },
        { ...event, event_type: 'skipped-test-event' },
        { ...event, event_type: 'another-test-event' },
      ];
      events.forEach((ev) => events$.next(ev));

      await expect(
        window.__analytics_ftr_helpers__.getEvents(3, {
          eventTypes: ['one-test-event', 'another-test-event'],
        })
      ).resolves.toEqual([
        { ...event, event_type: 'one-test-event' },
        { ...event, event_type: 'another-test-event' },
        { ...event, event_type: 'another-test-event' },
      ]);
    });

    test('should filter by timestamp when provided', async () => {
      // 3 enqueued events
      const events = [
        { ...event, timestamp: '2022-01-10T00:00:00.000Z' },
        { ...event, timestamp: '2022-03-10T00:00:00.000Z' },
        { ...event, timestamp: '2022-06-10T00:00:00.000Z' },
      ];
      events.forEach((ev) => events$.next(ev));

      await expect(
        window.__analytics_ftr_helpers__.getEvents(2, {
          eventTypes: [event.event_type],
          fromTimestamp: '2022-03-10T00:00:00.000Z',
          withTimeoutMs: 1,
        })
      ).resolves.toEqual([{ ...event, timestamp: '2022-06-10T00:00:00.000Z' }]);
    });

    test('should filter by `filters` when provided', async () => {
      // 3 enqueued events
      const events = [
        { ...event, timestamp: '2022-01-10T00:00:00.000Z' },
        { ...event, timestamp: '2022-03-10T00:00:00.000Z', properties: { my_property: 20 } },
        { ...event, timestamp: '2022-06-10T00:00:00.000Z' },
      ];
      events.forEach((ev) => events$.next(ev));

      await expect(
        window.__analytics_ftr_helpers__.getEvents(1, {
          eventTypes: [event.event_type],
          filters: {
            'properties.my_property': {
              eq: 20,
              gte: 20,
              lte: 20,
              gt: 10,
              lt: 30,
            },
          },
        })
      ).resolves.toEqual([
        { ...event, timestamp: '2022-03-10T00:00:00.000Z', properties: { my_property: 20 } },
      ]);
    });
  });
});
