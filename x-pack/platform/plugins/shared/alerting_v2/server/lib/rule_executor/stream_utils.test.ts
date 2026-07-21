/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { withAtLeastOne } from './stream_utils';

describe('withAtLeastOne', () => {
  const drain = async <T>(source: AsyncIterable<T>): Promise<T[]> => {
    const items: T[] = [];
    for await (const item of source) {
      items.push(item);
    }
    return items;
  };

  it('yields every element from a non-empty source and does not emit the fallback', async () => {
    const source = (async function* () {
      yield 1;
      yield 2;
      yield 3;
    })();

    expect(await drain(withAtLeastOne(source, 0))).toEqual([1, 2, 3]);
  });

  it('yields the fallback exactly once when the source is empty', async () => {
    const source = (async function* () {})();

    expect(await drain(withAtLeastOne(source, 42))).toEqual([42]);
  });

  it('propagates errors from the source without emitting the fallback', async () => {
    const source = (async function* () {
      yield 1;
      throw new Error('boom');
    })();

    const iterator = withAtLeastOne(source, 999)[Symbol.asyncIterator]();

    await expect(iterator.next()).resolves.toEqual({ value: 1, done: false });
    await expect(iterator.next()).rejects.toThrow('boom');
  });
});
