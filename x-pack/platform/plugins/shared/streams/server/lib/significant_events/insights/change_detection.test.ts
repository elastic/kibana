/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { SignificantEventsResponse } from '@kbn/streams-schema';
import {
  computePercentageChange,
  filterChangedQueries,
  groupByStream,
  deriveBucketSize,
} from './change_detection';

describe('change_detection', () => {
  describe('computePercentageChange', () => {
    it('returns 0 for empty occurrences', () => {
      expect(computePercentageChange([], 0)).toBe(0);
    });

    it('returns 0 for negative change point index', () => {
      const occurrences = [
        { date: '2024-01-01T00:00:00Z', count: 10 },
        { date: '2024-01-01T01:00:00Z', count: 20 },
      ];
      expect(computePercentageChange(occurrences, -1)).toBe(0);
    });

    it('returns 0 for change point index out of bounds', () => {
      const occurrences = [
        { date: '2024-01-01T00:00:00Z', count: 10 },
        { date: '2024-01-01T01:00:00Z', count: 20 },
      ];
      expect(computePercentageChange(occurrences, 5)).toBe(0);
    });

    it('returns 0 when both before and after are 0', () => {
      const occurrences = [
        { date: '2024-01-01T00:00:00Z', count: 0 },
        { date: '2024-01-01T01:00:00Z', count: 0 },
        { date: '2024-01-01T02:00:00Z', count: 0 },
      ];
      expect(computePercentageChange(occurrences, 1)).toBe(0);
    });

    it('returns 100% for spike from nothing (0 to any)', () => {
      const occurrences = [
        { date: '2024-01-01T00:00:00Z', count: 0 },
        { date: '2024-01-01T01:00:00Z', count: 0 },
        { date: '2024-01-01T02:00:00Z', count: 10 },
        { date: '2024-01-01T03:00:00Z', count: 5 },
      ];
      // Change point at index 2: before=[0,0]=0, after=[10,5]=15
      expect(computePercentageChange(occurrences, 2)).toBe(100);
    });

    it('calculates positive percentage change (increase/spike)', () => {
      const occurrences = [
        { date: '2024-01-01T00:00:00Z', count: 100 },
        { date: '2024-01-01T01:00:00Z', count: 100 },
        { date: '2024-01-01T02:00:00Z', count: 200 },
        { date: '2024-01-01T03:00:00Z', count: 200 },
      ];
      // Change point at index 2: before=[100,100]=200, after=[200,200]=400
      // (400-200)/200 * 100 = 100%
      expect(computePercentageChange(occurrences, 2)).toBe(100);
    });

    it('calculates negative percentage change (decrease/dip)', () => {
      const occurrences = [
        { date: '2024-01-01T00:00:00Z', count: 100 },
        { date: '2024-01-01T01:00:00Z', count: 100 },
        { date: '2024-01-01T02:00:00Z', count: 50 },
        { date: '2024-01-01T03:00:00Z', count: 50 },
      ];
      // Change point at index 2: before=[100,100]=200, after=[50,50]=100
      // (100-200)/200 * 100 = -50%
      expect(computePercentageChange(occurrences, 2)).toBe(-50);
    });

    it('calculates small percentage change (~1%)', () => {
      const occurrences = [
        { date: '2024-01-01T00:00:00Z', count: 1000 },
        { date: '2024-01-01T01:00:00Z', count: 1000 },
        { date: '2024-01-01T02:00:00Z', count: 1010 },
        { date: '2024-01-01T03:00:00Z', count: 1010 },
      ];
      // Change point at index 2: before=[1000,1000]=2000, after=[1010,1010]=2020
      // (2020-2000)/2000 * 100 = 1%
      expect(computePercentageChange(occurrences, 2)).toBe(1);
    });

    it('handles change point at the start (index 0)', () => {
      const occurrences = [
        { date: '2024-01-01T00:00:00Z', count: 100 },
        { date: '2024-01-01T01:00:00Z', count: 100 },
      ];
      // Change point at index 0: before=[], after=[100,100]=200
      // before=0, so returns 100%
      expect(computePercentageChange(occurrences, 0)).toBe(100);
    });

    it('handles change point at the end', () => {
      const occurrences = [
        { date: '2024-01-01T00:00:00Z', count: 100 },
        { date: '2024-01-01T01:00:00Z', count: 100 },
        { date: '2024-01-01T02:00:00Z', count: 50 },
      ];
      // Change point at index 2: before=[100,100]=200, after=[50]=50
      // (50-200)/200 * 100 = -75%
      expect(computePercentageChange(occurrences, 2)).toBe(-75);
    });
  });

  describe('filterChangedQueries', () => {
    const createMockEvent = (
      id: string,
      streamName: string,
      changeType: string,
      changePointIndex: number,
      occurrences: Array<{ date: string; count: number }>
    ): SignificantEventsResponse => ({
      id,
      stream_name: streamName,
      title: `Query ${id}`,
      kql: { query: `field:${id}` },
      feature: undefined,
      severity_score: 50,
      evidence: undefined,
      occurrences,
      change_points: {
        type: {
          [changeType]: {
            p_value: 0.01,
            change_point: changePointIndex,
          },
        },
      },
    });

    it('returns empty array for empty input', () => {
      const result = filterChangedQueries([]);
      expect(result).toEqual([]);
    });

    it('filters out stationary events', () => {
      const events: SignificantEventsResponse[] = [
        createMockEvent('q1', 'stream1', 'stationary', 2, [
          { date: '2024-01-01T00:00:00Z', count: 100 },
          { date: '2024-01-01T01:00:00Z', count: 100 },
          { date: '2024-01-01T02:00:00Z', count: 200 },
          { date: '2024-01-01T03:00:00Z', count: 200 },
        ]),
      ];

      const result = filterChangedQueries(events);
      expect(result).toEqual([]);
    });

    it('filters out non_stationary events', () => {
      const events: SignificantEventsResponse[] = [
        createMockEvent('q1', 'stream1', 'non_stationary', 2, [
          { date: '2024-01-01T00:00:00Z', count: 100 },
          { date: '2024-01-01T01:00:00Z', count: 100 },
          { date: '2024-01-01T02:00:00Z', count: 200 },
          { date: '2024-01-01T03:00:00Z', count: 200 },
        ]),
      ];

      const result = filterChangedQueries(events);
      expect(result).toEqual([]);
    });

    it('includes spike events above threshold', () => {
      const events: SignificantEventsResponse[] = [
        createMockEvent('q1', 'stream1', 'spike', 2, [
          { date: '2024-01-01T00:00:00Z', count: 100 },
          { date: '2024-01-01T01:00:00Z', count: 100 },
          { date: '2024-01-01T02:00:00Z', count: 200 },
          { date: '2024-01-01T03:00:00Z', count: 200 },
        ]),
      ];

      const result = filterChangedQueries(events, { changeThreshold: 20 });

      expect(result).toHaveLength(1);
      expect(result[0].event.id).toBe('q1');
      expect(result[0].percentageChange).toBe(100);
      expect(result[0].absoluteChange).toBe(100);
      expect(result[0].changeType).toBe('spike');
    });

    it('includes dip events above threshold', () => {
      const events: SignificantEventsResponse[] = [
        createMockEvent('q1', 'stream1', 'dip', 2, [
          { date: '2024-01-01T00:00:00Z', count: 100 },
          { date: '2024-01-01T01:00:00Z', count: 100 },
          { date: '2024-01-01T02:00:00Z', count: 50 },
          { date: '2024-01-01T03:00:00Z', count: 50 },
        ]),
      ];

      const result = filterChangedQueries(events, { changeThreshold: 20 });

      expect(result).toHaveLength(1);
      expect(result[0].percentageChange).toBe(-50);
      expect(result[0].absoluteChange).toBe(50);
      expect(result[0].changeType).toBe('dip');
    });

    it('filters out events below threshold', () => {
      const events: SignificantEventsResponse[] = [
        createMockEvent('q1', 'stream1', 'spike', 2, [
          { date: '2024-01-01T00:00:00Z', count: 100 },
          { date: '2024-01-01T01:00:00Z', count: 100 },
          { date: '2024-01-01T02:00:00Z', count: 105 },
          { date: '2024-01-01T03:00:00Z', count: 105 },
        ]),
      ];

      // 5% change is below 20% threshold
      const result = filterChangedQueries(events, { changeThreshold: 20 });
      expect(result).toEqual([]);
    });

    it('sorts results by absolute impact (highest first)', () => {
      const events: SignificantEventsResponse[] = [
        createMockEvent('q1', 'stream1', 'spike', 2, [
          { date: '2024-01-01T00:00:00Z', count: 100 },
          { date: '2024-01-01T01:00:00Z', count: 100 },
          { date: '2024-01-01T02:00:00Z', count: 150 },
          { date: '2024-01-01T03:00:00Z', count: 150 },
        ]), // 50% change
        createMockEvent('q2', 'stream1', 'spike', 2, [
          { date: '2024-01-01T00:00:00Z', count: 100 },
          { date: '2024-01-01T01:00:00Z', count: 100 },
          { date: '2024-01-01T02:00:00Z', count: 300 },
          { date: '2024-01-01T03:00:00Z', count: 300 },
        ]), // 200% change
        createMockEvent('q3', 'stream1', 'dip', 2, [
          { date: '2024-01-01T00:00:00Z', count: 100 },
          { date: '2024-01-01T01:00:00Z', count: 100 },
          { date: '2024-01-01T02:00:00Z', count: 25 },
          { date: '2024-01-01T03:00:00Z', count: 25 },
        ]), // -75% change
      ];

      const result = filterChangedQueries(events, { changeThreshold: 20 });

      expect(result).toHaveLength(3);
      expect(result[0].event.id).toBe('q2'); // 200% (highest)
      expect(result[1].event.id).toBe('q3'); // 75% absolute (second)
      expect(result[2].event.id).toBe('q1'); // 50% (lowest)
    });

    it('applies maxQueries limit and logs when limit is applied', () => {
      const loggerMock = loggingSystemMock.createLogger();

      const events: SignificantEventsResponse[] = [
        createMockEvent('q1', 'stream1', 'spike', 2, [
          { date: '2024-01-01T00:00:00Z', count: 10 },
          { date: '2024-01-01T01:00:00Z', count: 10 },
          { date: '2024-01-01T02:00:00Z', count: 50 },
          { date: '2024-01-01T03:00:00Z', count: 50 },
        ]),
        createMockEvent('q2', 'stream2', 'spike', 2, [
          { date: '2024-01-01T00:00:00Z', count: 10 },
          { date: '2024-01-01T01:00:00Z', count: 10 },
          { date: '2024-01-01T02:00:00Z', count: 40 },
          { date: '2024-01-01T03:00:00Z', count: 40 },
        ]),
        createMockEvent('q3', 'stream3', 'spike', 2, [
          { date: '2024-01-01T00:00:00Z', count: 10 },
          { date: '2024-01-01T01:00:00Z', count: 10 },
          { date: '2024-01-01T02:00:00Z', count: 30 },
          { date: '2024-01-01T03:00:00Z', count: 30 },
        ]),
      ];

      const result = filterChangedQueries(events, {
        changeThreshold: 20,
        maxQueries: 2,
        logger: loggerMock,
      });

      expect(result).toHaveLength(2);
      expect(loggerMock.info).toHaveBeenCalledWith(
        expect.stringContaining('Change filter limit applied: 3 queries matched threshold')
      );
      expect(loggerMock.info).toHaveBeenCalledWith(
        expect.stringContaining('returning top 2 by impact')
      );
    });

    it('logs debug when queries match but no limit applied', () => {
      const loggerMock = loggingSystemMock.createLogger();

      const events: SignificantEventsResponse[] = [
        createMockEvent('q1', 'stream1', 'spike', 2, [
          { date: '2024-01-01T00:00:00Z', count: 10 },
          { date: '2024-01-01T01:00:00Z', count: 10 },
          { date: '2024-01-01T02:00:00Z', count: 50 },
          { date: '2024-01-01T03:00:00Z', count: 50 },
        ]),
      ];

      filterChangedQueries(events, {
        changeThreshold: 20,
        maxQueries: 100,
        logger: loggerMock,
      });

      expect(loggerMock.debug).toHaveBeenCalledWith(
        expect.stringContaining('Change filter: 1 queries matched threshold')
      );
    });

    it('handles events with step_change type', () => {
      const events: SignificantEventsResponse[] = [
        createMockEvent('q1', 'stream1', 'step_change', 2, [
          { date: '2024-01-01T00:00:00Z', count: 100 },
          { date: '2024-01-01T01:00:00Z', count: 100 },
          { date: '2024-01-01T02:00:00Z', count: 200 },
          { date: '2024-01-01T03:00:00Z', count: 200 },
        ]),
      ];

      const result = filterChangedQueries(events);

      expect(result).toHaveLength(1);
      expect(result[0].changeType).toBe('step_change');
    });

    it('handles events with trend_change type', () => {
      const events: SignificantEventsResponse[] = [
        createMockEvent('q1', 'stream1', 'trend_change', 2, [
          { date: '2024-01-01T00:00:00Z', count: 100 },
          { date: '2024-01-01T01:00:00Z', count: 100 },
          { date: '2024-01-01T02:00:00Z', count: 200 },
          { date: '2024-01-01T03:00:00Z', count: 200 },
        ]),
      ];

      const result = filterChangedQueries(events);

      expect(result).toHaveLength(1);
      expect(result[0].changeType).toBe('trend_change');
    });

    it('handles events with distribution_change type', () => {
      const events: SignificantEventsResponse[] = [
        createMockEvent('q1', 'stream1', 'distribution_change', 2, [
          { date: '2024-01-01T00:00:00Z', count: 100 },
          { date: '2024-01-01T01:00:00Z', count: 100 },
          { date: '2024-01-01T02:00:00Z', count: 200 },
          { date: '2024-01-01T03:00:00Z', count: 200 },
        ]),
      ];

      const result = filterChangedQueries(events);

      expect(result).toHaveLength(1);
      expect(result[0].changeType).toBe('distribution_change');
    });

    it('handles events with empty change_points type', () => {
      const event: SignificantEventsResponse = {
        id: 'q1',
        stream_name: 'stream1',
        title: 'Query q1',
        kql: { query: 'field:q1' },
        feature: undefined,
        severity_score: 50,
        evidence: undefined,
        occurrences: [
          { date: '2024-01-01T00:00:00Z', count: 100 },
          { date: '2024-01-01T01:00:00Z', count: 200 },
        ],
        change_points: { type: {} },
      };

      const result = filterChangedQueries([event]);
      expect(result).toEqual([]);
    });

    it('uses default threshold of 20%', () => {
      const events: SignificantEventsResponse[] = [
        createMockEvent('q1', 'stream1', 'spike', 2, [
          { date: '2024-01-01T00:00:00Z', count: 100 },
          { date: '2024-01-01T01:00:00Z', count: 100 },
          { date: '2024-01-01T02:00:00Z', count: 115 },
          { date: '2024-01-01T03:00:00Z', count: 115 },
        ]), // 15% - below default
        createMockEvent('q2', 'stream1', 'spike', 2, [
          { date: '2024-01-01T00:00:00Z', count: 100 },
          { date: '2024-01-01T01:00:00Z', count: 100 },
          { date: '2024-01-01T02:00:00Z', count: 125 },
          { date: '2024-01-01T03:00:00Z', count: 125 },
        ]), // 25% - above default
      ];

      const result = filterChangedQueries(events); // No options = defaults

      expect(result).toHaveLength(1);
      expect(result[0].event.id).toBe('q2');
    });
  });

  describe('groupByStream', () => {
    const createChangedQuery = (
      id: string,
      streamName: string
    ): ReturnType<typeof filterChangedQueries>[0] => ({
      event: {
        id,
        stream_name: streamName,
        title: `Query ${id}`,
        kql: { query: `field:${id}` },
        feature: undefined,
        severity_score: 50,
        evidence: undefined,
        occurrences: [],
        change_points: { type: { spike: { p_value: 0.01, change_point: 0 } } },
      },
      percentageChange: 50,
      absoluteChange: 50,
      changeType: 'spike',
    });

    it('returns empty map for empty input', () => {
      const result = groupByStream([]);
      expect(result.size).toBe(0);
    });

    it('groups queries by stream name', () => {
      const queries = [
        createChangedQuery('q1', 'stream1'),
        createChangedQuery('q2', 'stream1'),
        createChangedQuery('q3', 'stream2'),
      ];

      const result = groupByStream(queries);

      expect(result.size).toBe(2);
      expect(result.get('stream1')).toHaveLength(2);
      expect(result.get('stream2')).toHaveLength(1);
    });

    it('preserves query order within streams', () => {
      const queries = [
        createChangedQuery('q1', 'stream1'),
        createChangedQuery('q2', 'stream1'),
        createChangedQuery('q3', 'stream1'),
      ];

      const result = groupByStream(queries);
      const stream1Queries = result.get('stream1')!;

      expect(stream1Queries[0].event.id).toBe('q1');
      expect(stream1Queries[1].event.id).toBe('q2');
      expect(stream1Queries[2].event.id).toBe('q3');
    });
  });

  describe('deriveBucketSize', () => {
    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;

    it('returns explicit bucket size when provided', () => {
      const now = Date.now();
      expect(deriveBucketSize(now - hour, now, '5m')).toBe('5m');
      expect(deriveBucketSize(now - day, now, '30m')).toBe('30m');
    });

    it('returns 2m for time ranges up to 1 hour', () => {
      const now = Date.now();
      expect(deriveBucketSize(now - 30 * minute, now)).toBe('2m');
      expect(deriveBucketSize(now - 60 * minute, now)).toBe('2m');
    });

    it('returns 10m for time ranges up to 6 hours', () => {
      const now = Date.now();
      expect(deriveBucketSize(now - 2 * hour, now)).toBe('10m');
      expect(deriveBucketSize(now - 6 * hour, now)).toBe('10m');
    });

    it('returns 30m for time ranges up to 24 hours', () => {
      const now = Date.now();
      expect(deriveBucketSize(now - 12 * hour, now)).toBe('30m');
      expect(deriveBucketSize(now - 24 * hour, now)).toBe('30m');
    });

    it('returns 4h for time ranges up to 7 days', () => {
      const now = Date.now();
      expect(deriveBucketSize(now - 3 * day, now)).toBe('4h');
      expect(deriveBucketSize(now - 7 * day, now)).toBe('4h');
    });

    it('returns 12h for time ranges longer than 7 days', () => {
      const now = Date.now();
      expect(deriveBucketSize(now - 14 * day, now)).toBe('12h');
      expect(deriveBucketSize(now - 30 * day, now)).toBe('12h');
    });
  });
});
