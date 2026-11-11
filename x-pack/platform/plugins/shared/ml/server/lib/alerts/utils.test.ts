/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildAnomalyAlertTimeFilter, chunkIdsForRequestPath } from './utils';

describe('buildAnomalyAlertTimeFilter', () => {
  const lookbackInterval = '32m';

  const startedAt = new Date('2024-06-01T12:01:00.000Z');

  test('uses timestamp lookback when lastRunTime is null', () => {
    expect(
      buildAnomalyAlertTimeFilter({
        lastRunTime: null,
        startedAt,
        lookbackInterval,
      })
    ).toEqual({
      range: {
        timestamp: {
          gte: 'now-32m',
          lte: 'now',
        },
      },
    });
  });

  test('prefers event.ingested since lastRunTime with timestamp lookback backup', () => {
    const lastRunTime = new Date('2024-06-01T12:00:00.000Z');

    expect(
      buildAnomalyAlertTimeFilter({
        lastRunTime,
        startedAt,
        lookbackInterval,
      })
    ).toEqual({
      bool: {
        should: [
          {
            bool: {
              filter: [
                { exists: { field: 'event.ingested' } },
                {
                  range: {
                    'event.ingested': {
                      gte: '2024-06-01T12:00:00.000Z',
                      lt: '2024-06-01T12:01:00.000Z',
                    },
                  },
                },
              ],
            },
          },
          {
            bool: {
              must_not: { exists: { field: 'event.ingested' } },
              filter: {
                range: {
                  timestamp: {
                    gte: 'now-32m',
                    lte: 'now',
                  },
                },
              },
            },
          },
        ],
        minimum_should_match: 1,
      },
    });
  });
});

describe('chunkIdsForRequestPath', () => {
  test('returns no batches for no ids', () => {
    expect(chunkIdsForRequestPath([])).toEqual([]);
  });

  test('returns a single batch when the ids fit', () => {
    expect(chunkIdsForRequestPath(['job_a', 'job_b', 'job_c'])).toEqual(['job_a,job_b,job_c']);
  });

  test('accounts for the URL-encoded separator when splitting', () => {
    // 'aaaa%2Cbbbb' is 11 characters, 'aaaa%2Cbbbb%2Ccccc' is 18
    expect(chunkIdsForRequestPath(['aaaa', 'bbbb', 'cccc'], 11)).toEqual(['aaaa,bbbb', 'cccc']);
    expect(chunkIdsForRequestPath(['aaaa', 'bbbb', 'cccc'], 10)).toEqual(['aaaa', 'bbbb', 'cccc']);
  });

  test('keeps every id in order and each batch within the default limit', () => {
    const ids = Array.from({ length: 1000 }, (_, i) => `datafeed-test_job_${i}`);
    const batches = chunkIdsForRequestPath(ids);

    expect(batches.length).toBeGreaterThan(1);
    batches.forEach((batch) => expect(encodeURIComponent(batch).length).toBeLessThanOrEqual(3500));
    expect(batches.flatMap((batch) => batch.split(','))).toEqual(ids);
  });
});
