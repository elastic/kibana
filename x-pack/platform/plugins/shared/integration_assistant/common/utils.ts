/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import seedrandom from 'seedrandom';

const DEFAULT_PARTIAL_SHUFFLE_SEED = 'seed';

/**
 * Partially shuffles an array using the modified Fisher-Yates algorithm.
 *
 * The array is partially shuffled in place, meaning that:
 *   - the first `start` elements are kept in their place;
 *   - the slice from `start` to `end` is filled with the sample from the remaining element;
 *   - the sample is guaranteed to be reasonably unbiased (any bias only come from the random function).
 * We do not make any guarantees regarding the order of elements after `end`.
 *
 * Reproducibility:
 *   - the result is deterministic for the given random seed.
 *
 * Performance:
 *   - we perform exactly `end-start` operations, each including:
 *     - a random number generation; and
 *     - possibly an array element swap; also
 *   - we use constant extra memory.
 *
 * Implementation notes:
 * 1. A naïve implementation would be to shuffle the whole array starting from `start`. We
 *    simply modify the modern version of Fisher-Yates algorithm doing it to stop once we reach
 *    the `end`, so the results returned on the slice from `start` to `end` are statistically
 *    indistinguishable from the results returned by the naïve implementation.
 * 2. Thus due to the properties of the original Fisher-Yates shuffle, the sampling would be
 *    unbiased, meaning that the probability of any given shuffle order is the same as that of
 *    any other, provided the random function has no bias itself, that is, is uniform.
 * 3. The actual pseudorandom function we use (from `seedrandom`), plus the modulo operation,
 *    are not perfectly uniform, but are good enough, so the bias are negligible for our purposes.
 *
 * Reference:
 *   - https://en.wikipedia.org/wiki/Fisher%E2%80%93Yates_shuffle, especially bias description.
 *
 * Examples:
 *   - shuffle the whole array: partialShuffleArray(arr)
 *   - shuffle the first 5 elements: partialShuffleArray(arr, 0, 5)
 *   - keep the first element, shuffle the rest: partialShuffleArray(arr, 1)
 *   - shuffle the last 5 elements: partialShuffleArray(arr, arr.length - 5)
 *
 * @param arr - The array to be partially shuffled.
 * @param start - The number of elements in the beginning of the array to keep in place.
 * @param end - The number of elements to be shuffled.
 */

export function partialShuffleArray<T>(
  arr: T[],
  start: number = 0,
  end: number = arr.length,
  seed: string = DEFAULT_PARTIAL_SHUFFLE_SEED
) {
  const rng = seedrandom(seed);

  if (start < 0 || start > arr.length) {
    throw new RangeError('Invalid start index');
  }

  if (end < start || end > arr.length) {
    throw new RangeError('Invalid end index');
  }

  const len = arr.length;

  for (let index = start; index < end; index++) {
    const randValue = rng.int32();
    const hop = Math.abs(randValue) % (len - index);
    if (hop) {
      [arr[index], arr[index + hop]] = [arr[index + hop], arr[index]];
    }
  }
}
