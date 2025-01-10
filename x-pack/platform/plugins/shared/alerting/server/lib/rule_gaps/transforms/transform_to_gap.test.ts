/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryEventsBySavedObjectResult } from '@kbn/event-log-plugin/server';
import { transformToGap } from './transform_to_gap';
import { Gap } from '../gap';

describe('transformToGap', () => {
  const timestamp = '2023-01-01T00:00:00.000Z';
  const validInterval = {
    gte: '2023-01-01T00:00:00.000Z',
    lte: '2023-01-01T01:00:00.000Z',
  };

  const createMockEvent = (overrides = {}): QueryEventsBySavedObjectResult => ({
    total: 1,
    data: [
      {
        '@timestamp': timestamp,
        _id: 'test-id',
        _index: 'test-index',
        _seq_no: 1,
        _primary_term: 1,
        kibana: {
          alert: {
            rule: {
              gap: {
                range: validInterval,
                filled_intervals: [validInterval],
                in_progress_intervals: [validInterval],
              },
            },
          },
        },
        ...overrides,
      },
    ],
    page: 1,
    per_page: 10,
  });

  it('transforms valid event to Gap object', () => {
    const events = createMockEvent();
    const result = transformToGap(events);

    expect(result).toHaveLength(1);
    expect(result[0]).toBeInstanceOf(Gap);
    expect(result[0]).toEqual(
      new Gap({
        timestamp,
        range: validInterval,
        filledIntervals: [validInterval],
        inProgressIntervals: [validInterval],
        internalFields: {
          _id: 'test-id',
          _index: 'test-index',
          _seq_no: 1,
          _primary_term: 1,
        },
      })
    );
  });

  it('filters out invalid gaps (missing range)', () => {
    const events = createMockEvent({
      kibana: {
        alert: {
          rule: {
            gap: {
              range: undefined,
            },
          },
        },
      },
    });
    const result = transformToGap(events);
    expect(result).toHaveLength(0);
  });

  it('filters out invalid gaps (invalid range)', () => {
    const events = createMockEvent({
      kibana: {
        alert: {
          rule: {
            gap: {
              range: { gte: undefined, lte: '2023-01-01T01:00:00.000Z' },
            },
          },
        },
      },
    });
    const result = transformToGap(events);
    expect(result).toHaveLength(0);
  });

  it('handles missing timestamp', () => {
    const events = createMockEvent({
      '@timestamp': undefined,
    });
    const result = transformToGap(events);
    expect(result).toHaveLength(0);
  });

  it('handles missing intervals', () => {
    const events = createMockEvent({
      kibana: {
        alert: {
          rule: {
            gap: {
              range: validInterval,
              filled_intervals: undefined,
              in_progress_intervals: undefined,
            },
          },
        },
      },
    });
    const result = transformToGap(events);

    expect(result).toHaveLength(1);
    expect(result[0].filledIntervals).toEqual([]);
    expect(result[0].inProgressIntervals).toEqual([]);
  });

  it('filters out invalid intervals while keeping valid ones', () => {
    const events = createMockEvent({
      kibana: {
        alert: {
          rule: {
            gap: {
              range: validInterval,
              filled_intervals: [
                validInterval,
                { gte: undefined, lte: '2023-01-01T01:00:00.000Z' },
              ],
              in_progress_intervals: [
                validInterval,
                { gte: '2023-01-01T00:00:00.000Z', lte: undefined },
              ],
            },
          },
        },
      },
    });
    const result = transformToGap(events);

    expect(result).toHaveLength(1);
    expect(result[0].filledIntervals).toHaveLength(1);
    expect(result[0].inProgressIntervals).toHaveLength(1);
  });
});
