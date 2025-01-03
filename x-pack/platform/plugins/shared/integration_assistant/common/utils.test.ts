/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { partialShuffleArray } from './utils';

describe('partialShuffleArray', () => {
  const fixture = [1, 2, 3, 4, 5, 6, 7];

  it('should shuffle the array in reproducible manner when shuffling the whole array', () => {
    const arr = fixture.slice();
    partialShuffleArray(arr, 0, 7);
    expect(arr).toEqual([4, 5, 1, 3, 7, 6, 2]);
  });

  it('can sometimes keep the array the same by sheer coincidence', () => {
    const arr = [1, 2, 3, 4, 5];
    partialShuffleArray(arr, 1, 5, '1337');
    expect(arr).toEqual([1, 2, 3, 4, 5]);
  });

  it('should mostly return a different array', () => {
    const original = [1, 2, 3, 4, 5];
    let countSameArray = 0;
    let countDifferentArray = 0;

    for (let start = 0; start < original.length; start++) {
      for (let end = start + 1; end <= original.length; end++) {
        const arr = original.slice();
        partialShuffleArray(arr, start, end);
        countSameArray += arr.every((v, i) => v === original[i]) ? 1 : 0;
        countDifferentArray += arr.some((v, i) => v !== original[i]) ? 1 : 0;
      }
    }
    expect(countSameArray).toBeTruthy();
    expect(countSameArray).toBeLessThan(countDifferentArray);
  });

  it('should shuffle the array in reproducible manner when providing a non-default seed', () => {
    const arr = fixture.slice();
    partialShuffleArray(arr, 0, 7, '1337');
    expect(arr).toEqual([3, 5, 1, 7, 2, 6, 4]);
  });

  it('should partially shuffle the array in reproducible manner when shuffling a subarray', () => {
    const arr = fixture.slice();
    partialShuffleArray(arr, 2, 5);
    expect(arr).toEqual([1, 2, 7, 5, 3, 6, 4]);
  });

  it('should do nothing if start is at the end of the array', () => {
    const arr = fixture.slice();
    partialShuffleArray(arr, arr.length, arr.length);
    expect(arr).toEqual(fixture);
  });

  it('should do nothing if start is the same as end', () => {
    const arr = fixture.slice();
    const size = arr.length;
    partialShuffleArray(arr, size / 2, size / 2);
    expect(arr).toEqual(fixture);
  });

  it('should throw an error for invalid start index', () => {
    const arr = fixture.slice();
    expect(() => partialShuffleArray(arr, arr.length + 1, 4)).toThrow('Invalid start index');
    expect(() => partialShuffleArray(arr, -1, 4)).toThrow('Invalid start index');
  });

  it('should throw an error for invalid end index', () => {
    const arr = fixture.slice();
    expect(() => partialShuffleArray(arr, 1, 0)).toThrow('Invalid end index');
    expect(() => partialShuffleArray(arr, 1, arr.length + 1)).toThrow('Invalid end index');
  });

  it('should handle large arrays', () => {
    const size = 100000;
    const original = Array.from({ length: size }, (_, i) => i);
    const arr = original.slice();

    partialShuffleArray(arr, 2, 200);

    expect(arr).toHaveLength(size);
    expect(arr[0]).toEqual(0);
    expect(arr[1]).toEqual(1);
    expect(arr === original).toBe(false);
    expect(new Set(arr)).toEqual(new Set(original));
  });
});
