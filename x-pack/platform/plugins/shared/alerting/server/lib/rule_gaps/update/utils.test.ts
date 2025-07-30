/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Gap } from '../gap';
import type { ScheduledItem } from './utils';
import { findOverlappingIntervals } from './utils';

const getGap = (start: string, end: string) =>
  ({ range: { gte: new Date(start), lte: new Date(end) } } as Gap);
const getScheduledItem = (start: string, end: string) =>
  ({ from: new Date(start), to: new Date(end), status: 'pending' } as ScheduledItem);

describe('findOverlappingIntervals', () => {
  // 1 hour worth of scheduled items
  const scheduledItems = [
    getScheduledItem('2025-01-02T00:00:00Z', '2025-01-02T00:15:00Z'),
    getScheduledItem('2025-01-02T00:15:00Z', '2025-01-02T00:30:00Z'),
    getScheduledItem('2025-01-02T00:40:00Z', '2025-01-02T00:45:00Z'),
    getScheduledItem('2025-01-02T00:45:00Z', '2025-01-02T01:00:00Z'),
  ];

  const cases = [
    {
      description: 'when the gap is before of the scheduled items range',
      gap: getGap('2025-01-01T23:00:00Z', '2025-01-01T23:40:00Z'),
      expectedOverlapping: [],
    },
    {
      description: 'when the gap ends right at the scheduling start date',
      gap: getGap('2025-01-01T23:00:00Z', '2025-01-02T00:00:00Z'),
      expectedOverlapping: [],
    },
    {
      description: 'when the gap starts outside the scheduling range and ends inside',
      gap: getGap('2025-01-01T23:50:00Z', '2025-01-02T00:10:00Z'),
      expectedOverlapping: [getScheduledItem('2025-01-02T00:00:00Z', '2025-01-02T00:10:00Z')],
    },
    {
      description:
        'when the gap starts outside the scheduling range and ends inside at the start of a scheduled item',
      gap: getGap('2025-01-01T23:50:00Z', '2025-01-02T00:40:00Z'),
      expectedOverlapping: [
        getScheduledItem('2025-01-02T00:00:00Z', '2025-01-02T00:15:00Z'),
        getScheduledItem('2025-01-02T00:15:00Z', '2025-01-02T00:30:00Z'),
      ],
    },
    {
      description:
        'when the gap starts outside the scheduling range and ends inside at the end of a scheduled item',
      gap: getGap('2025-01-01T23:50:00Z', '2025-01-02T00:45:00Z'),
      expectedOverlapping: [
        getScheduledItem('2025-01-02T00:00:00Z', '2025-01-02T00:15:00Z'),
        getScheduledItem('2025-01-02T00:15:00Z', '2025-01-02T00:30:00Z'),
        getScheduledItem('2025-01-02T00:40:00Z', '2025-01-02T00:45:00Z'),
      ],
    },
    {
      description: 'when the gap starts right at the start of the scheduling range and ends inside',
      gap: getGap('2025-01-02T00:00:00Z', '2025-01-02T00:10:00Z'),
      expectedOverlapping: [getScheduledItem('2025-01-02T00:00:00Z', '2025-01-02T00:10:00Z')],
    },
    {
      description: 'when the gap covers the entire sheduling range',
      gap: getGap('2025-01-02T00:00:00Z', '2025-01-02T01:00:00Z'),
      expectedOverlapping: scheduledItems,
    },
    {
      description: 'when the gap starts inside the scheduling range and ends inside',
      gap: getGap('2025-01-02T00:10:00Z', '2025-01-02T00:41:00Z'),
      expectedOverlapping: [
        getScheduledItem('2025-01-02T00:10:00Z', '2025-01-02T00:15:00Z'),
        getScheduledItem('2025-01-02T00:15:00Z', '2025-01-02T00:30:00Z'),
        getScheduledItem('2025-01-02T00:40:00Z', '2025-01-02T00:41:00Z'),
      ],
    },
    {
      description: 'when the gap starts inside the scheduling range and ends outside of it',
      gap: getGap('2025-01-02T00:41:00Z', '2025-01-02T01:10:00Z'),
      expectedOverlapping: [
        getScheduledItem('2025-01-02T00:41:00Z', '2025-01-02T00:45:00Z'),
        getScheduledItem('2025-01-02T00:45:00Z', '2025-01-02T01:00:00Z'),
      ],
    },
    {
      description: 'when the gap starts at the end of the scheduling range',
      gap: getGap('2025-01-02T01:00:00Z', '2025-01-02T01:30:00Z'),
      expectedOverlapping: [],
    },
    {
      description: 'when the gap starts after the scheduling range',
      gap: getGap('2025-01-02T01:10:00Z', '2025-01-02T01:30:00Z'),
      expectedOverlapping: [],
    },
  ];

  const results = findOverlappingIntervals(
    cases.map(({ gap }) => gap),
    scheduledItems
  );

  cases.forEach(({ description, gap, expectedOverlapping }, idx) => {
    describe(description, () => {
      it('should return the right scheduled items', () => {
        expect(results[idx]).toEqual({ gap, scheduled: expectedOverlapping });
      });
    });
  });
});
