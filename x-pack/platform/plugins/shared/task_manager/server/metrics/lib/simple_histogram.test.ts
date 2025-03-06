/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SimpleHistogram } from './simple_histogram';

describe('SimpleHistogram', () => {
  test('should throw error when bucketSize is greater than range', () => {
    expect(() => {
      new SimpleHistogram(10, 100);
    }).toThrowErrorMatchingInlineSnapshot(`"bucket size cannot be greater than value range"`);
  });

  test('should correctly initialize when bucketSize evenly divides range', () => {
    const histogram = new SimpleHistogram(100, 10);
    expect(histogram.get()).toEqual([
      { value: 10, count: 0 },
      { value: 20, count: 0 },
      { value: 30, count: 0 },
      { value: 40, count: 0 },
      { value: 50, count: 0 },
      { value: 60, count: 0 },
      { value: 70, count: 0 },
      { value: 80, count: 0 },
      { value: 90, count: 0 },
      { value: 100, count: 0 },
    ]);
    expect(histogram.getAllValues()).toEqual([]);
  });

  test('should correctly initialize when bucketSize does not evenly divides range', () => {
    const histogram = new SimpleHistogram(100, 7);
    expect(histogram.get()).toEqual([
      { value: 7, count: 0 },
      { value: 14, count: 0 },
      { value: 21, count: 0 },
      { value: 28, count: 0 },
      { value: 35, count: 0 },
      { value: 42, count: 0 },
      { value: 49, count: 0 },
      { value: 56, count: 0 },
      { value: 63, count: 0 },
      { value: 70, count: 0 },
      { value: 77, count: 0 },
      { value: 84, count: 0 },
      { value: 91, count: 0 },
      { value: 98, count: 0 },
      { value: 105, count: 0 },
    ]);
    expect(histogram.getAllValues()).toEqual([]);
  });

  test('should correctly record values', () => {
    const histogram = new SimpleHistogram(100, 10);
    histogram.record(0);
    histogram.record(10);
    histogram.record(23);
    histogram.record(34);
    histogram.record(21);
    histogram.record(56);
    histogram.record(78);
    histogram.record(33);
    histogram.record(99);
    histogram.record(1);
    histogram.record(2);

    expect(histogram.get()).toEqual([
      { value: 10, count: 3 },
      { value: 20, count: 1 },
      { value: 30, count: 2 },
      { value: 40, count: 2 },
      { value: 50, count: 0 },
      { value: 60, count: 1 },
      { value: 70, count: 0 },
      { value: 80, count: 1 },
      { value: 90, count: 0 },
      { value: 100, count: 1 },
    ]);
    expect(histogram.getAllValues()).toEqual([0, 10, 23, 34, 21, 56, 78, 33, 99, 1, 2]);
  });

  test('should correctly record values with specific increment', () => {
    const histogram = new SimpleHistogram(100, 10);
    histogram.record(0);
    histogram.record(23, 2);
    histogram.record(34);
    histogram.record(21);
    histogram.record(56);
    histogram.record(78);
    histogram.record(33, 4);
    histogram.record(99, 5);
    histogram.record(1);
    histogram.record(2);

    expect(histogram.get()).toEqual([
      { value: 10, count: 3 },
      { value: 20, count: 0 },
      { value: 30, count: 3 },
      { value: 40, count: 5 },
      { value: 50, count: 0 },
      { value: 60, count: 1 },
      { value: 70, count: 0 },
      { value: 80, count: 1 },
      { value: 90, count: 0 },
      { value: 100, count: 5 },
    ]);
    expect(histogram.getAllValues()).toEqual([
      0, 23, 23, 34, 21, 56, 78, 33, 33, 33, 33, 99, 99, 99, 99, 99, 1, 2,
    ]);
  });

  test('should ignore values less than 0 and greater than max', () => {
    const histogram = new SimpleHistogram(100, 10);
    histogram.record(23);
    histogram.record(34);
    histogram.record(21);
    histogram.record(56);
    histogram.record(78);
    histogram.record(33);
    histogram.record(99);
    histogram.record(1);
    histogram.record(2);

    const hist1 = histogram.get();
    const hist1AllValues = histogram.getAllValues();

    histogram.record(-1);
    histogram.record(200);

    expect(histogram.get()).toEqual(hist1);
    expect(histogram.getAllValues()).toEqual(hist1AllValues);
  });

  test('should correctly reset values', () => {
    const histogram = new SimpleHistogram(100, 10);
    histogram.record(23);
    histogram.record(34);
    histogram.record(21);
    histogram.record(56);
    histogram.record(78);
    histogram.record(33);
    histogram.record(99);
    histogram.record(1);
    histogram.record(2);

    expect(histogram.get()).toEqual([
      { value: 10, count: 2 },
      { value: 20, count: 0 },
      { value: 30, count: 2 },
      { value: 40, count: 2 },
      { value: 50, count: 0 },
      { value: 60, count: 1 },
      { value: 70, count: 0 },
      { value: 80, count: 1 },
      { value: 90, count: 0 },
      { value: 100, count: 1 },
    ]);
    expect(histogram.getAllValues()).toEqual([23, 34, 21, 56, 78, 33, 99, 1, 2]);

    histogram.reset();

    expect(histogram.get()).toEqual([
      { value: 10, count: 0 },
      { value: 20, count: 0 },
      { value: 30, count: 0 },
      { value: 40, count: 0 },
      { value: 50, count: 0 },
      { value: 60, count: 0 },
      { value: 70, count: 0 },
      { value: 80, count: 0 },
      { value: 90, count: 0 },
      { value: 100, count: 0 },
    ]);
    expect(histogram.getAllValues()).toEqual([]);
  });

  test('should correctly truncate zero values', () => {
    const histogram = new SimpleHistogram(100, 10);
    histogram.record(23);
    histogram.record(34);
    histogram.record(21);
    histogram.record(56);
    histogram.record(33);
    histogram.record(1);
    histogram.record(2);

    expect(histogram.get()).toEqual([
      { value: 10, count: 2 },
      { value: 20, count: 0 },
      { value: 30, count: 2 },
      { value: 40, count: 2 },
      { value: 50, count: 0 },
      { value: 60, count: 1 },
      { value: 70, count: 0 },
      { value: 80, count: 0 },
      { value: 90, count: 0 },
      { value: 100, count: 0 },
    ]);
    expect(histogram.getAllValues()).toEqual([23, 34, 21, 56, 33, 1, 2]);

    expect(histogram.get(true)).toEqual([
      { value: 10, count: 2 },
      { value: 20, count: 0 },
      { value: 30, count: 2 },
      { value: 40, count: 2 },
      { value: 50, count: 0 },
      { value: 60, count: 1 },
    ]);
  });

  test('should correctly truncate zero values when all values are zero', () => {
    const histogram = new SimpleHistogram(100, 10);

    expect(histogram.get(true)).toEqual([]);
    expect(histogram.getAllValues()).toEqual([]);
  });

  test('should correctly serialize histogram data', () => {
    const histogram = new SimpleHistogram(100, 10);
    histogram.record(23);
    histogram.record(34);
    histogram.record(21);
    histogram.record(56);
    histogram.record(78);
    histogram.record(33);
    histogram.record(99);
    histogram.record(1);
    histogram.record(2);
    expect(histogram.serialize()).toEqual({
      counts: [2, 0, 2, 2, 0, 1, 0, 1, 0, 1],
      values: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
    });
  });
});
