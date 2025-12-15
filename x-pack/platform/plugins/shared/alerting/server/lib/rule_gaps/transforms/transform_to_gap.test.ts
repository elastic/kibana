/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryEventsBySavedObjectResult } from '@kbn/event-log-plugin/server';
import { transformToGap } from './transform_to_gap';
import { Gap } from '../gap';

describe('transformToGap', () => {
  const timestamp = '2023-01-01T00:00:00.000Z';
  const mockNow = '2025-01-01T02:03:04.000Z';
  const validInterval = {
    gte: '2023-01-01T00:00:00.000Z',
    lte: '2023-01-01T01:00:00.000Z',
  };

  const validAlertObject = {
    rule: {
      gap: {
        range: validInterval,
        filled_intervals: [validInterval],
        in_progress_intervals: [validInterval],
      },
    },
  };

  const ruleId = 'some-rule-id';

  type ResultData = NonNullable<QueryEventsBySavedObjectResult['data'][0]['kibana']>;
  const createMockEvent = (
    overrides: {
      alert?: ResultData['alert'];
      ruleId?: string;
      '@timestamp'?: string;
    } = {}
  ): QueryEventsBySavedObjectResult => ({
    total: 1,
    data: [
      {
        '@timestamp': Object.prototype.hasOwnProperty.call(overrides, '@timestamp')
          ? overrides['@timestamp']
          : timestamp,
        _id: 'test-id',
        _index: 'test-index',
        _seq_no: 1,
        _primary_term: 1,
        kibana: {
          alert: Object.prototype.hasOwnProperty.call(overrides, 'alert')
            ? overrides.alert
            : validAlertObject,
        },
        rule: {
          id: Object.prototype.hasOwnProperty.call(overrides, 'ruleId') ? overrides.ruleId : ruleId,
        },
      },
    ],
    page: 1,
    per_page: 10,
  });

  it('transforms valid event to Gap object', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(mockNow));

    const events = createMockEvent();
    const result = transformToGap(events);

    expect(result).toHaveLength(1);
    expect(result[0]).toBeInstanceOf(Gap);
    expect(result[0].toObject()).toEqual(
      expect.objectContaining({
        range: validInterval,
        filled_intervals: [validInterval],
        in_progress_intervals: [validInterval],
        unfilled_intervals: [],
        status: 'partially_filled',
        total_gap_duration_ms: 3600000,
        filled_duration_ms: 3600000,
        unfilled_duration_ms: 0,
        in_progress_duration_ms: 3600000,
        updated_at: mockNow,
      })
    );

    expect(result[0].internalFields).toEqual({
      _id: 'test-id',
      _index: 'test-index',
      _seq_no: 1,
      _primary_term: 1,
    });

    jest.useRealTimers();
  });

  it('filters out invalid gaps (missing range)', () => {
    const events = createMockEvent({
      alert: {
        rule: {
          gap: {
            range: undefined,
          },
        },
      },
    });
    const result = transformToGap(events);
    expect(result).toHaveLength(0);
  });

  it('filters out invalid gaps (invalid range)', () => {
    const events = createMockEvent({
      alert: {
        rule: {
          gap: {
            range: { gte: undefined, lte: '2023-01-01T01:00:00.000Z' },
          },
        },
      },
    });
    const result = transformToGap(events);
    expect(result).toHaveLength(0);
  });

  it('filters out invalid gaps (missing rule id)', () => {
    const events = createMockEvent({
      alert: {
        rule: {
          gap: {
            range: validInterval,
            filled_intervals: [validInterval],
            in_progress_intervals: [validInterval],
          },
        },
      },
      ruleId: undefined,
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
      alert: {
        rule: {
          gap: {
            range: validInterval,
            filled_intervals: undefined,
            in_progress_intervals: undefined,
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
      alert: {
        rule: {
          gap: {
            range: validInterval,
            filled_intervals: [validInterval, { gte: undefined, lte: '2023-01-01T01:00:00.000Z' }],
            in_progress_intervals: [
              validInterval,
              { gte: '2023-01-01T00:00:00.000Z', lte: undefined },
            ],
          },
        },
      },
    });
    const result = transformToGap(events);

    expect(result).toHaveLength(1);
    expect(result[0].filledIntervals).toHaveLength(1);
    expect(result[0].inProgressIntervals).toHaveLength(1);
  });

  it('should filter out soft deleted gaps', () => {
    const events = createMockEvent({
      alert: {
        rule: {
          gap: {
            range: validInterval,
            filled_intervals: [validInterval, { gte: undefined, lte: '2023-01-01T01:00:00.000Z' }],
            in_progress_intervals: [
              validInterval,
              { gte: '2023-01-01T00:00:00.000Z', lte: undefined },
            ],
            deleted: true,
          },
        },
      },
    });
    const result = transformToGap(events);
    expect(result).toHaveLength(0);
  });

  describe('failed_auto_fill_attempts', () => {
    it('should set failedAutoFillAttempts to 0 when gap field is not present', () => {
      const events = createMockEvent({
        alert: {
          rule: {
            gap: {
              range: validInterval,
              filled_intervals: [validInterval],
              in_progress_intervals: [validInterval],
            },
          },
        },
      });
      const result = transformToGap(events);

      expect(result).toHaveLength(1);
      expect(result[0].failedAutoFillAttempts).toBe(0);
    });

    it('should correctly set failedAutoFillAttempts when gap field is 0', () => {
      const events = createMockEvent({
        alert: {
          rule: {
            gap: {
              range: validInterval,
              filled_intervals: [validInterval],
              in_progress_intervals: [validInterval],
              failed_auto_fill_attempts: 0,
            },
          },
        },
      });
      const result = transformToGap(events);

      expect(result[0].failedAutoFillAttempts).toBe(0);
    });

    it('should correctly set failedAutoFillAttempts when value is positive', () => {
      const events = createMockEvent({
        alert: {
          rule: {
            gap: {
              range: validInterval,
              filled_intervals: [validInterval],
              in_progress_intervals: [validInterval],
              failed_auto_fill_attempts: 5,
            },
          },
        },
      });
      const result = transformToGap(events);

      expect(result[0].failedAutoFillAttempts).toBe(5);
    });

    it('should default to 0 when failed_auto_fill_attempts is not a number', () => {
      const events = createMockEvent({
        alert: {
          rule: {
            gap: {
              range: validInterval,
              filled_intervals: [validInterval],
              in_progress_intervals: [validInterval],
              failed_auto_fill_attempts: '5', // invalid type
            },
          },
        },
      });
      const result = transformToGap(events);

      expect(result[0].failedAutoFillAttempts).toBe(0);
    });
  });
});
