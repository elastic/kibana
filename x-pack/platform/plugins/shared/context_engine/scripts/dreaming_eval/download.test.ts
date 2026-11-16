/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { streamJsonArray } from './download';

const collect = async <T>(chunks: string[]): Promise<T[]> => {
  async function* source() {
    yield* chunks;
  }
  const items: T[] = [];
  for await (const item of streamJsonArray<T>(source())) {
    items.push(item);
  }
  return items;
};

describe('streamJsonArray', () => {
  const records = [
    { id: 'a', text: 'braces } and { and ] in a "quoted" string\\', turns: [{ role: 'user' }] },
    { id: 'b', nested: { list: [1, [2, { three: 3 }]] }, unicode: 'Montréal — ✓' },
    { id: 'c', empty: {} },
  ];
  const json = JSON.stringify(records, null, 2);

  it('reads each element of the top-level array', async () => {
    await expect(collect([json])).resolves.toEqual(records);
  });

  it('reads elements that span chunks, however the file is cut', async () => {
    for (const size of [1, 3, 7, 50]) {
      const chunks = Array.from({ length: Math.ceil(json.length / size) }, (_, i) =>
        json.slice(i * size, (i + 1) * size)
      );
      await expect(collect(chunks)).resolves.toEqual(records);
    }
  });

  it('reads nothing from an empty array', async () => {
    await expect(collect(['[ ]'])).resolves.toEqual([]);
  });
});
