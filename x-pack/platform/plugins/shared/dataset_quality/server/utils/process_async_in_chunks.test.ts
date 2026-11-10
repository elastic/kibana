/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { processAsyncInChunks } from './process_async_in_chunks';

interface DataStreamLike {
  name: string;
  indices: Array<{ index_name: string }>;
}

const makeNames = (count: number): string[] =>
  Array.from({ length: count }, (_, i) => `logs-app-${String(i).padStart(5, '0')}.child`);

const makeDataStream = (name: string, indexCount: number): DataStreamLike => ({
  name,
  indices: Array.from({ length: indexCount }, (_, j) => ({
    index_name: `.ds-${name}-${String(j).padStart(6, '0')}`,
  })),
});

describe('processAsyncInChunks', () => {
  it('calls the executor once with an empty chunk when the list is empty', async () => {
    const executor = jest.fn(async () => ({ data_streams: [] }));

    await expect(processAsyncInChunks([], executor)).resolves.toEqual({ data_streams: [] });
    expect(executor).toHaveBeenCalledTimes(1);
    expect(executor).toHaveBeenCalledWith([], 0);
  });

  it('concatenates arrays from every chunk in chunk order', async () => {
    const names = makeNames(400);

    const result = await processAsyncInChunks(names, async (chunk) => ({
      data_streams: chunk.map((name) => makeDataStream(name, 1)),
    }));

    expect(result.data_streams.map(({ name }) => name)).toEqual(names);
  });

  it('merges records keyed by index name across chunks', async () => {
    const names = makeNames(400);

    const result = await processAsyncInChunks<Record<string, { settings: { index: string } }>>(
      names,
      async (chunk) =>
        Object.fromEntries(chunk.map((name) => [name, { settings: { index: name } }]))
    );

    expect(Object.keys(result)).toEqual(names);
    expect(result[names[399]]).toEqual({ settings: { index: names[399] } });
  });

  it('deep merges objects that share a key and lets later chunks win for scalars', async () => {
    const names = makeNames(400);
    let chunkNumber = 0;

    const result = await processAsyncInChunks<{
      shared: { tags: string[]; last: number; [chunkKey: string]: unknown };
    }>(names, async () => {
      chunkNumber += 1;
      return {
        shared: { tags: [`chunk-${chunkNumber}`], last: chunkNumber, [`c${chunkNumber}`]: true },
      };
    });

    expect(chunkNumber).toBeGreaterThan(1);
    expect(result.shared.last).toBe(chunkNumber);
    expect(result.shared.tags).toEqual(
      Array.from({ length: chunkNumber }, (_, i) => `chunk-${i + 1}`)
    );
    expect(result.shared.c1).toBe(true);
    expect(result.shared[`c${chunkNumber}`]).toBe(true);
  });

  it('adds one copy per chunk when every chunk returns the same object', async () => {
    const shared = { data_streams: [makeDataStream('logs-shared', 1)] };
    const executor = jest.fn(async () => shared);

    const result = await processAsyncInChunks(makeNames(400), executor);

    expect(executor.mock.calls.length).toBeGreaterThan(1);
    expect(result.data_streams).toHaveLength(executor.mock.calls.length);
    expect(shared.data_streams).toHaveLength(1);
  });

  it('does not merge __proto__ keys into Object.prototype', async () => {
    try {
      const result = await processAsyncInChunks<Record<string, object>>(makeNames(400), async () =>
        JSON.parse('{"settings":{"__proto__":{"polluted":true}}}')
      );

      expect(Object.prototype).not.toHaveProperty('polluted');
      expect(result.settings).not.toHaveProperty('polluted');
    } finally {
      delete (Object.prototype as Record<string, unknown>).polluted;
    }
  });

  it('merges 8,000 data streams in linear time', async () => {
    // Merging by copying the accumulated result for every chunk takes seconds at this size.
    const names = makeNames(8000);
    const responsesByFirstName = new Map<string, { data_streams: DataStreamLike[] }>();

    const startedAt = performance.now();
    const result = await processAsyncInChunks(names, async (chunk) => {
      const response = responsesByFirstName.get(chunk[0]) ?? {
        data_streams: chunk.map((name) => makeDataStream(name, 14)),
      };
      responsesByFirstName.set(chunk[0], response);
      return response;
    });
    const elapsedMs = performance.now() - startedAt;

    expect(result.data_streams).toHaveLength(8000);
    expect(elapsedMs).toBeLessThan(1000);
  }, 30000);
});
