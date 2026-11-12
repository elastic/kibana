/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_FAILURE_COLLECTIONS, STATS_COLUMN } from '../constants';
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
  const collectionRow = (
    collection: string | number | null,
    rates: { authentication?: number | null; authorization?: number | null }
  ) => ({
    [STATS_COLUMN.collection]: collection,
    [authentication]: rates.authentication ?? null,
    [authorization]: rates.authorization ?? null,
  });

  it('has the rate and no collections for no rows', () => {
    const failureRate = toFailureRate({ rate: 2, collectionRows: [], column: authorization });

    expect(failureRate).toEqual({ rate: toItemRate(2) });
    expect(failureRate).not.toHaveProperty('collections');
  });

  it('keeps a rate of 0, and a null rate as no data', () => {
    expect(toFailureRate({ rate: 0, collectionRows: [], column: authorization })).toEqual({
      rate: toItemRate(0),
    });
    expect(toFailureRate({ rate: null, collectionRows: [], column: authorization })).toEqual({
      rate: toItemRate(null),
    });
  });

  it('lists each collection with failures of the status, keyed by its name', () => {
    const collectionRows = [
      collectionRow('logs-a-default', { authorization: 1.5 }),
      collectionRow('logs-b-default', { authorization: 0.5 }),
    ];

    expect(toFailureRate({ rate: 2, collectionRows, column: authorization })).toEqual({
      rate: toItemRate(2),
      collections: {
        'logs-a-default': { rate: toItemRate(1.5) },
        'logs-b-default': { rate: toItemRate(0.5) },
      },
    });
  });

  it('reads the column that it is given', () => {
    const collectionRows = [
      collectionRow('logs-a-default', { authentication: 0.4, authorization: 1.5 }),
    ];

    expect(
      toFailureRate({ rate: 0.4, collectionRows, column: authentication }).collections
    ).toEqual({ 'logs-a-default': { rate: toItemRate(0.4) } });
  });

  it('leaves out a collection with a null or zero rate for the status', () => {
    const collectionRows = [
      collectionRow('logs-a-default', { authorization: 1.5 }),
      collectionRow('logs-null-default', { authentication: 0.5, authorization: null }),
      collectionRow('logs-zero-default', { authorization: 0 }),
    ];

    const { collections } = toFailureRate({ rate: 1.5, collectionRows, column: authorization });

    expect(Object.keys(collections ?? {})).toEqual(['logs-a-default']);
  });

  it('has no collections when every row is left out', () => {
    const collectionRows = [collectionRow('logs-a-default', { authorization: 0 })];

    expect(toFailureRate({ rate: 0, collectionRows, column: authorization })).not.toHaveProperty(
      'collections'
    );
  });

  it('skips a row with no collection name', () => {
    const collectionRows = [
      collectionRow('logs-a-default', { authorization: 1 }),
      collectionRow(null, { authorization: 1 }),
      collectionRow(7, { authorization: 1 }),
    ];

    const { collections } = toFailureRate({ rate: 3, collectionRows, column: authorization });

    expect(Object.keys(collections ?? {})).toEqual(['logs-a-default']);
  });

  it('keeps the collections with the highest rates, highest first, up to the cap', () => {
    const total = MAX_FAILURE_COLLECTIONS + 5;
    const collectionRows = Array.from({ length: total }, (_, index) =>
      collectionRow(`logs-c${index + 1}-default`, { authorization: index + 1 })
    );

    const { collections } = toFailureRate({ rate: 1000, collectionRows, column: authorization });
    const names = Object.keys(collections ?? {});

    expect(names).toHaveLength(MAX_FAILURE_COLLECTIONS);
    expect(names[0]).toBe(`logs-c${total}-default`);
    expect(names[names.length - 1]).toBe(`logs-c${total - MAX_FAILURE_COLLECTIONS + 1}-default`);
  });

  it('keeps a collection named like a prototype key as its own key', () => {
    const collectionRows = [collectionRow('__proto__', { authorization: 1 })];

    const { collections } = toFailureRate({ rate: 1, collectionRows, column: authorization });

    expect(Object.getOwnPropertyNames(collections)).toEqual(['__proto__']);
    expect(Object.getPrototypeOf(collections)).toBe(Object.prototype);
  });
});
