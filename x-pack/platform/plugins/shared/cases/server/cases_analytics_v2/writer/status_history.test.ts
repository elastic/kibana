/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CaseStatuses } from '../../../common/types/domain';
import { calculateStatusHistoryFields } from './status_history';

const HOUR_MS = 60 * 60 * 1000;
const createdAt = '2026-11-01T00:00:00.000Z';

const at = (offsetMs: number): string => new Date(Date.parse(createdAt) + offsetMs).toISOString();

describe('calculateStatusHistoryFields', () => {
  it('AC21: sums the open stretches and counts the reopen', () => {
    const result = calculateStatusHistoryFields({
      createdAt,
      statusChanges: [
        { status: CaseStatuses.closed, timestamp: at(2 * HOUR_MS) },
        { status: CaseStatuses.open, timestamp: at(2 * HOUR_MS + 72 * HOUR_MS) },
        { status: CaseStatuses.closed, timestamp: at(3 * HOUR_MS + 72 * HOUR_MS) },
      ],
      now: new Date(at(200 * HOUR_MS)),
    });

    expect(result).toEqual({ active_time_open: 10800, time_to_pickup: null, reopen_count: 1 });
  });

  it('AC22: gives an empty pickup for a case closed directly from open', () => {
    const result = calculateStatusHistoryFields({
      createdAt,
      statusChanges: [{ status: CaseStatuses.closed, timestamp: at(HOUR_MS) }],
    });

    expect(result.time_to_pickup).toBeNull();
    expect(result.reopen_count).toBe(0);
    expect(result.active_time_open).toBe(3600);
  });

  it('AC22: gives 1800 for a case moved to in progress after 30 minutes', () => {
    const result = calculateStatusHistoryFields({
      createdAt,
      statusChanges: [
        { status: CaseStatuses['in-progress'], timestamp: at(HOUR_MS / 2) },
        { status: CaseStatuses.closed, timestamp: at(2 * HOUR_MS) },
      ],
    });

    expect(result).toEqual({ active_time_open: 7200, time_to_pickup: 1800, reopen_count: 0 });
  });

  it('counts the in progress stretches as active time', () => {
    const result = calculateStatusHistoryFields({
      createdAt,
      statusChanges: [
        { status: CaseStatuses['in-progress'], timestamp: at(HOUR_MS) },
        { status: CaseStatuses.open, timestamp: at(2 * HOUR_MS) },
        { status: CaseStatuses.closed, timestamp: at(4 * HOUR_MS) },
      ],
    });

    expect(result.active_time_open).toBe(4 * 3600);
  });

  it('runs the last stretch until now for a case that is not closed', () => {
    const result = calculateStatusHistoryFields({
      createdAt,
      statusChanges: [],
      now: new Date(at(5 * HOUR_MS)),
    });

    expect(result).toEqual({ active_time_open: 5 * 3600, time_to_pickup: null, reopen_count: 0 });
  });

  it('keeps the first pickup when the case goes to in progress again', () => {
    const result = calculateStatusHistoryFields({
      createdAt,
      statusChanges: [
        { status: CaseStatuses['in-progress'], timestamp: at(HOUR_MS) },
        { status: CaseStatuses.closed, timestamp: at(2 * HOUR_MS) },
        { status: CaseStatuses['in-progress'], timestamp: at(10 * HOUR_MS) },
        { status: CaseStatuses.closed, timestamp: at(11 * HOUR_MS) },
      ],
    });

    expect(result).toEqual({ active_time_open: 3 * 3600, time_to_pickup: 3600, reopen_count: 1 });
  });

  it('sorts the changes and skips the invalid ones', () => {
    const result = calculateStatusHistoryFields({
      createdAt,
      statusChanges: [
        { status: CaseStatuses.closed, timestamp: at(2 * HOUR_MS) },
        { status: CaseStatuses['in-progress'], timestamp: at(HOUR_MS) },
        { status: CaseStatuses.open, timestamp: 'not a date' },
      ],
    });

    expect(result).toEqual({ active_time_open: 7200, time_to_pickup: 3600, reopen_count: 0 });
  });
});
