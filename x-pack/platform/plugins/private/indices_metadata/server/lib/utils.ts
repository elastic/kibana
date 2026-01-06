/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Utility class to accumulate and manage weighted chunks of items.
 *
 * @template T The type of elements being chunked.
 */
export class Chunked<T> {
  public weight: number = 0;

  constructor(public chunks: T[][] = [], public current: T[] = []) {}

  /**
   * Finalizes the current chunk (if not empty), adds it to `chunks`, and returns all non-empty chunks.
   */
  public flush(): T[][] {
    if (this.current.length !== 0) {
      this.chunks.push(this.current);
      this.current = [];
    }
    return this.chunks.filter((chunk) => chunk.length > 0);
  }
}

/**
 * Splits a list of items into weighted chunks, where the sum of weights in each chunk does not exceed the specified size.
 *
 * @template T The type of elements in the list.
 * @param list The array of items to be chunked.
 * @param size The maximum allowed sum of weights in a chunk.
 * @param weight A function returning the weight of each item.
 * @returns An array of chunks, each chunk being an array of items.
 *
 * Iterates through the list, accumulating items into a chunk as long as the total weight does not exceed `size`.
 * If adding an item would exceed the limit, the current chunk is finalized and a new chunk is started.
 * Uses the Chunked class internally to manage chunk state.
 */
export function chunkedBy<T>(list: T[], size: number, weight: (v: T) => number): T[][] {
  function chunk(acc: Chunked<T>, value: T): Chunked<T> {
    const currentWeight = weight(value);
    if (acc.weight + currentWeight <= size) {
      acc.current.push(value);
      acc.weight += currentWeight;
    } else {
      acc.chunks.push(acc.current);
      acc.current = [value];
      acc.weight = currentWeight;
    }
    return acc;
  }

  return list.reduce(chunk, new Chunked<T>()).flush();
}
