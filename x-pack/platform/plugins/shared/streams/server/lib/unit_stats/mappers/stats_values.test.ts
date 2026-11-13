/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_FAILURE_BREAKDOWN_ENTRIES, STATS_COLUMN } from '../constants';
import { toFailureRate, toItemRate, toSeries, toValue } from './stats_values';

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

describe('toFailureRate', () => {
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
    const failureRate = toFailureRate({ rate: 2, breakdownRows: [], column: authorization });

    expect(failureRate).toEqual({ rate: toItemRate(2) });
    expect(failureRate).not.toHaveProperty('breakdown');
  });

  it('keeps a rate of 0, and a null rate as no data', () => {
    expect(toFailureRate({ rate: 0, breakdownRows: [], column: authorization })).toEqual({
      rate: toItemRate(0),
    });
    expect(toFailureRate({ rate: null, breakdownRows: [], column: authorization })).toEqual({
      rate: toItemRate(null),
    });
  });

  it('lists each cause of the class, with its collection and its reason', () => {
    const breakdownRows = [
      causeRow('logs-b-default', 'security_exception', { authorization: 0.5 }),
      causeRow('logs-a-default', 'security_exception', { authorization: 1.5 }),
    ];

    expect(toFailureRate({ rate: 2, breakdownRows, column: authorization })).toEqual({
      rate: toItemRate(2),
      breakdown: [
        { collection: 'logs-a-default', reason: 'security_exception', rate: toItemRate(1.5) },
        { collection: 'logs-b-default', reason: 'security_exception', rate: toItemRate(0.5) },
      ],
    });
  });

  it('lists a collection once for each of its reasons', () => {
    const breakdownRows = [
      causeRow('logs-a-default', 'security_exception', { authorization: 1 }),
      causeRow('logs-a-default', 'index_not_found_exception', { authorization: 0.5 }),
    ];

    const { breakdown } = toFailureRate({ rate: 1.5, breakdownRows, column: authorization });

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

    expect(toFailureRate({ rate: 1.5, breakdownRows, column: authorization }).breakdown).toEqual([
      { collection: null, reason: 'AccessDenied', rate: toItemRate(1) },
      { collection: 'logs-a-default', reason: null, rate: toItemRate(0.5) },
    ]);
  });

  it('reads the column that it is given', () => {
    const breakdownRows = [
      causeRow('logs-a-default', 'security_exception', { authentication: 0.4, authorization: 1.5 }),
    ];

    expect(toFailureRate({ rate: 0.4, breakdownRows, column: authentication }).breakdown).toEqual([
      { collection: 'logs-a-default', reason: 'security_exception', rate: toItemRate(0.4) },
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

    const { breakdown } = toFailureRate({ rate: 1.5, breakdownRows, column: authorization });

    expect(breakdown?.map(({ collection }) => collection)).toEqual(['logs-a-default']);
  });

  it('has no breakdown when every row is left out', () => {
    const breakdownRows = [causeRow('logs-a-default', 'security_exception', { authorization: 0 })];

    expect(toFailureRate({ rate: 0, breakdownRows, column: authorization })).not.toHaveProperty(
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

    const { breakdown } = toFailureRate({ rate: 3, breakdownRows, column: authorization });

    expect(breakdown?.map(({ collection }) => collection)).toEqual(['logs-a-default']);
  });

  it('keeps the causes with the highest rates, highest first, up to the cap', () => {
    const total = MAX_FAILURE_BREAKDOWN_ENTRIES + 5;
    const breakdownRows = Array.from({ length: total }, (_, index) =>
      causeRow(`logs-c${index + 1}-default`, null, { authorization: index + 1 })
    );

    const { breakdown = [] } = toFailureRate({
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
});
