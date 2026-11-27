/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_FAILURE_BREAKDOWN_ENTRIES, REQUEST_UNIT, STATS_COLUMN } from '../constants';
import { toFailureRate, toItemRate, toPercentage, toRate, toSeries, toValue } from './stats_values';

describe('toSeries', () => {
  const bucketMs = 60_000;

  it('formats the rows as points and totals them', () => {
    const rows = [
      { bucket: '2026-10-20T10:00:00.000Z', sum_items: 270 },
      { bucket: '2026-10-20T10:01:00.000Z', sum_items: 240 },
    ];

    expect(toSeries({ rows, bucketMs })).toEqual({
      series: {
        bucket_ms: bucketMs,
        points: [
          { start: '2026-10-20T10:00:00.000Z', value: 270 },
          { start: '2026-10-20T10:01:00.000Z', value: 240 },
        ],
      },
      total: 510,
    });
  });

  it('keeps the order of the rows', () => {
    const rows = [
      { bucket: 'b2', sum_items: 1 },
      { bucket: 'b1', sum_items: 2 },
    ];

    expect(toSeries({ rows, bucketMs }).series.points.map(({ start }) => start)).toEqual([
      'b2',
      'b1',
    ]);
  });

  it('leaves out a row with no items, and keeps a real zero', () => {
    const rows = [
      { bucket: 'b1', sum_items: null },
      { bucket: 'b2', sum_items: 0 },
    ];

    expect(toSeries({ rows, bucketMs })).toEqual({
      series: { bucket_ms: bucketMs, points: [{ start: 'b2', value: 0 }] },
      total: 0,
    });
  });

  it('has no points and no total for no rows', () => {
    expect(toSeries({ rows: [], bucketMs })).toEqual({
      series: { bucket_ms: bucketMs, points: [] },
      total: null,
    });
  });
});

describe('toValue', () => {
  it('carries the unit with a value', () => {
    expect(toValue(0.107, 's')).toEqual({ value: 0.107, unit: 's' });
  });

  it('keeps the unit with a zero value', () => {
    expect(toValue(0, '{item}')).toEqual({ value: 0, unit: '{item}' });
  });

  it('keeps the unit when there is no value', () => {
    expect(toValue(null, 's')).toEqual({ value: null, unit: 's' });
  });
});

describe('toItemRate', () => {
  it('carries the item unit and the per second time unit', () => {
    expect(toItemRate(0.5)).toEqual({ value: 0.5, unit: '{item}', time_unit: 's' });
  });

  it('keeps both units when there is no value', () => {
    expect(toItemRate(null)).toEqual({ value: null, unit: '{item}', time_unit: 's' });
  });
});

describe('toRate', () => {
  it('carries the given unit and the per second time unit', () => {
    expect(toRate(0.5, REQUEST_UNIT)).toEqual({ value: 0.5, unit: '{request}', time_unit: 's' });
  });

  it('keeps the unit when there is no value', () => {
    expect(toRate(null, REQUEST_UNIT)).toEqual({
      value: null,
      unit: '{request}',
      time_unit: 's',
    });
  });
});

describe('toPercentage', () => {
  it('is the share of the whole that the part is, in percent', () => {
    expect(toPercentage(1, 4)).toEqual({ value: 25, unit: '%' });
    expect(toPercentage(0, 4)).toEqual({ value: 0, unit: '%' });
  });

  it('has no value for no data on either side, and for a whole that is 0', () => {
    expect(toPercentage(null, 4)).toEqual({ value: null, unit: '%' });
    expect(toPercentage(1, null)).toEqual({ value: null, unit: '%' });
    expect(toPercentage(0, 0)).toEqual({ value: null, unit: '%' });
  });

  it('does not cap a part that is larger than its whole', () => {
    expect(toPercentage(5, 4).value).toBe(125);
  });
});

describe('toFailureRate', () => {
  /** Every rate is a share of 100 attempts a second, so a percentage is the rate itself. */
  const pct = (value: number | null) => ({ value, unit: '%' });
  const withAttempts = (
    args: Omit<Parameters<typeof toFailureRate>[0], 'attempts'> & { attempts?: number | null }
  ) => toFailureRate({ attempts: 100, ...args });
  const authorization = STATS_COLUMN.authorizationRate;
  const authentication = STATS_COLUMN.authenticationRate;
  const causeRow = (
    collection: string | number | null,
    reason: string | null,
    rates: { authentication?: number | null; authorization?: number | null }
  ) => ({
    [STATS_COLUMN.collection]: collection,
    [STATS_COLUMN.reason]: reason,
    [authentication]: rates.authentication ?? null,
    [authorization]: rates.authorization ?? null,
  });

  it('has the rate and no breakdown for no rows', () => {
    const failureRate = withAttempts({ rate: 2, breakdownRows: [], column: authorization });

    expect(failureRate).toEqual({ rate: toItemRate(2), percentage: pct(2) });
    expect(failureRate).not.toHaveProperty('breakdown');
  });

  it('keeps a rate of 0, and a null rate as no data', () => {
    expect(withAttempts({ rate: 0, breakdownRows: [], column: authorization })).toEqual({
      rate: toItemRate(0),
      percentage: pct(0),
    });
    expect(withAttempts({ rate: null, breakdownRows: [], column: authorization })).toEqual({
      rate: toItemRate(null),
      percentage: pct(null),
    });
  });

  it('lists each cause of the class, with its collection and its reason', () => {
    const breakdownRows = [
      causeRow('logs-b-default', 'security_exception', { authorization: 0.5 }),
      causeRow('logs-a-default', 'security_exception', { authorization: 1.5 }),
    ];

    expect(withAttempts({ rate: 2, breakdownRows, column: authorization })).toEqual({
      rate: toItemRate(2),
      percentage: pct(2),
      breakdown: [
        {
          collection: 'logs-a-default',
          reason: 'security_exception',
          rate: toItemRate(1.5),
          percentage: pct(1.5),
        },
        {
          collection: 'logs-b-default',
          reason: 'security_exception',
          rate: toItemRate(0.5),
          percentage: pct(0.5),
        },
      ],
    });
  });

  it('lists a collection once for each of its reasons', () => {
    const breakdownRows = [
      causeRow('logs-a-default', 'security_exception', { authorization: 1 }),
      causeRow('logs-a-default', 'index_not_found_exception', { authorization: 0.5 }),
    ];

    const { breakdown } = withAttempts({ rate: 1.5, breakdownRows, column: authorization });

    expect(breakdown?.map(({ collection, reason }) => [collection, reason])).toEqual([
      ['logs-a-default', 'security_exception'],
      ['logs-a-default', 'index_not_found_exception'],
    ]);
  });

  it('keeps a missing collection or reason as null', () => {
    const breakdownRows = [
      causeRow(null, 'AccessDenied', { authorization: 1 }),
      causeRow('logs-a-default', null, { authorization: 0.5 }),
    ];

    expect(withAttempts({ rate: 1.5, breakdownRows, column: authorization }).breakdown).toEqual([
      { collection: null, reason: 'AccessDenied', rate: toItemRate(1), percentage: pct(1) },
      { collection: 'logs-a-default', reason: null, rate: toItemRate(0.5), percentage: pct(0.5) },
    ]);
  });

  it('reads the column that it is given', () => {
    const breakdownRows = [
      causeRow('logs-a-default', 'security_exception', { authentication: 0.4, authorization: 1.5 }),
    ];

    expect(withAttempts({ rate: 0.4, breakdownRows, column: authentication }).breakdown).toEqual([
      {
        collection: 'logs-a-default',
        reason: 'security_exception',
        rate: toItemRate(0.4),
        percentage: pct(0.4),
      },
    ]);
  });

  it('leaves out a cause with a null or zero rate for the class', () => {
    const breakdownRows = [
      causeRow('logs-a-default', 'security_exception', { authorization: 1.5 }),
      causeRow('logs-null-default', 'security_exception', {
        authentication: 0.5,
        authorization: null,
      }),
      causeRow('logs-zero-default', 'security_exception', { authorization: 0 }),
    ];

    const { breakdown } = withAttempts({ rate: 1.5, breakdownRows, column: authorization });

    expect(breakdown?.map(({ collection }) => collection)).toEqual(['logs-a-default']);
  });

  it('has no breakdown when every row is left out', () => {
    const breakdownRows = [causeRow('logs-a-default', 'security_exception', { authorization: 0 })];

    expect(withAttempts({ rate: 0, breakdownRows, column: authorization })).not.toHaveProperty(
      'breakdown'
    );
  });

  it('leaves out a row with neither a collection nor a reason', () => {
    const breakdownRows = [
      causeRow('logs-a-default', null, { authorization: 1 }),
      causeRow(null, null, { authorization: 1 }),
      // Anything but a string counts as missing.
      causeRow(7, null, { authorization: 1 }),
    ];

    const { breakdown } = withAttempts({ rate: 3, breakdownRows, column: authorization });

    expect(breakdown?.map(({ collection }) => collection)).toEqual(['logs-a-default']);
  });

  it('gives the rate and every breakdown entry the unit it is asked for', () => {
    const breakdownRows = [causeRow(null, 'AccessDenied', { authorization: 0.5 })];

    expect(
      withAttempts({ rate: 2, breakdownRows, column: authorization, unit: REQUEST_UNIT })
    ).toEqual({
      rate: toRate(2, REQUEST_UNIT),
      percentage: pct(2),
      breakdown: [
        {
          collection: null,
          reason: 'AccessDenied',
          rate: toRate(0.5, REQUEST_UNIT),
          percentage: pct(0.5),
        },
      ],
    });
  });

  it('keeps the causes with the highest rates, highest first, up to the cap', () => {
    const total = MAX_FAILURE_BREAKDOWN_ENTRIES + 5;
    const breakdownRows = Array.from({ length: total }, (_, index) =>
      causeRow(`logs-c${index + 1}-default`, null, { authorization: index + 1 })
    );

    const { breakdown = [] } = withAttempts({
      rate: 1000,
      breakdownRows,
      column: authorization,
    });

    expect(breakdown).toHaveLength(MAX_FAILURE_BREAKDOWN_ENTRIES);
    expect(breakdown[0].collection).toBe(`logs-c${total}-default`);
    expect(breakdown[breakdown.length - 1].collection).toBe(
      `logs-c${total - MAX_FAILURE_BREAKDOWN_ENTRIES + 1}-default`
    );
  });

  describe('percentages', () => {
    it('are the share of the attempts, for the class and for each cause', () => {
      const breakdownRows = [
        causeRow('logs-a-default', 'security_exception', { authorization: 1 }),
        causeRow(null, 'security_exception', { authorization: 0.5 }),
      ];

      const failureRate = withAttempts({
        rate: 1.5,
        attempts: 6,
        breakdownRows,
        column: authorization,
      });

      expect(failureRate.percentage).toEqual(pct(25));
      expect(failureRate.breakdown?.map(({ percentage }) => percentage)).toEqual([
        pct((1 / 6) * 100),
        pct((0.5 / 6) * 100),
      ]);
    });

    it('are null for no attempts, and for attempts that are 0 or unknown', () => {
      const breakdownRows = [
        causeRow('logs-a-default', 'security_exception', { authorization: 1 }),
      ];

      [0, null].forEach((attempts) => {
        const failureRate = withAttempts({
          rate: 1,
          attempts,
          breakdownRows,
          column: authorization,
        });

        expect(failureRate.percentage).toEqual(pct(null));
        expect(failureRate.breakdown?.[0].percentage).toEqual(pct(null));
      });
    });

    it('are null for a rate with no data, and 0 for a rate of 0', () => {
      expect(
        withAttempts({ rate: null, breakdownRows: [], column: authorization }).percentage
      ).toEqual(pct(null));
      expect(
        withAttempts({ rate: 0, breakdownRows: [], column: authorization }).percentage
      ).toEqual(pct(0));
    });
  });
});
