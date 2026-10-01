/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';
import { resolveClosedIndexAdjustments } from './resolve_closed_indices';

const makeEsClient = (resolveIndexImpl: jest.Mock) =>
  ({
    indices: { resolveIndex: resolveIndexImpl },
  } as unknown as ElasticsearchClient);

const emptyResolve = { indices: [], aliases: [], data_streams: [] };

describe('resolveClosedIndexAdjustments', () => {
  const logger = loggerMock.create();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns empty result when includePatterns is empty', async () => {
    const resolveIndex = jest.fn();
    const result = await resolveClosedIndexAdjustments(makeEsClient(resolveIndex), [], logger);

    expect(result).toEqual({ openBackingIndices: [], negations: [] });
    expect(resolveIndex).not.toHaveBeenCalled();
  });

  it('returns empty result when all patterns are negations', async () => {
    const resolveIndex = jest.fn();
    const result = await resolveClosedIndexAdjustments(
      makeEsClient(resolveIndex),
      ['-logs-proxy-*', '-metrics-debug'],
      logger
    );

    expect(result).toEqual({ openBackingIndices: [], negations: [] });
    expect(resolveIndex).not.toHaveBeenCalled();
  });

  it('filters out negations before calling resolveIndex', async () => {
    const resolveIndex = jest.fn().mockResolvedValue(emptyResolve);

    await resolveClosedIndexAdjustments(
      makeEsClient(resolveIndex),
      ['logs-*', '-logs-proxy-*', 'metrics-*'],
      logger
    );

    expect(resolveIndex).toHaveBeenCalledWith(
      expect.objectContaining({ name: ['logs-*', 'metrics-*'] })
    );
  });

  it('returns negation for a closed standalone index', async () => {
    const resolveIndex = jest.fn().mockResolvedValue({
      indices: [
        { name: 'standalone-closed-index', attributes: ['closed'] },
        { name: 'standalone-open-index', attributes: ['open'] },
      ],
      aliases: [],
      data_streams: [],
    });

    const result = await resolveClosedIndexAdjustments(
      makeEsClient(resolveIndex),
      ['standalone-*'],
      logger
    );

    expect(result.negations).toContain('-standalone-closed-index');
    expect(result.negations).not.toContain('-standalone-open-index');
    expect(result.openBackingIndices).toEqual([]);
  });

  it('negates the data stream name (not backing index) and adds open backing indices back', async () => {
    const resolveIndex = jest
      .fn()
      // First call: pattern resolves to a data stream
      .mockResolvedValueOnce({
        indices: [],
        aliases: [],
        data_streams: [
          {
            name: 'logs-simulate-close-test',
            backing_indices: [
              '.ds-logs-simulate-close-test-000001',
              '.ds-logs-simulate-close-test-000002',
            ],
            timestamp_field: '@timestamp',
          },
        ],
      })
      // Second call: concrete backing index names — first is closed, second is open
      .mockResolvedValueOnce({
        indices: [
          { name: '.ds-logs-simulate-close-test-000001', attributes: ['closed'] },
          { name: '.ds-logs-simulate-close-test-000002', attributes: ['open'] },
        ],
        aliases: [],
        data_streams: [],
      });

    const result = await resolveClosedIndexAdjustments(
      makeEsClient(resolveIndex),
      ['logs-simulate-close-test'],
      logger
    );

    // Data stream name negated — not the individual backing index name
    expect(result.negations).toContain('-logs-simulate-close-test');
    expect(result.negations).not.toContain('-.ds-logs-simulate-close-test-000001');
    // Open backing index added back as a positive inclusion
    expect(result.openBackingIndices).toContain('.ds-logs-simulate-close-test-000002');
    // Closed backing index NOT added to openBackingIndices
    expect(result.openBackingIndices).not.toContain('.ds-logs-simulate-close-test-000001');
  });

  it('does not add negation for data stream with no closed backing indices', async () => {
    const resolveIndex = jest
      .fn()
      .mockResolvedValueOnce({
        indices: [],
        aliases: [],
        data_streams: [
          {
            name: 'logs-healthy',
            backing_indices: ['.ds-logs-healthy-000001', '.ds-logs-healthy-000002'],
            timestamp_field: '@timestamp',
          },
        ],
      })
      .mockResolvedValueOnce({
        indices: [
          { name: '.ds-logs-healthy-000001', attributes: ['open'] },
          { name: '.ds-logs-healthy-000002', attributes: ['open'] },
        ],
        aliases: [],
        data_streams: [],
      });

    const result = await resolveClosedIndexAdjustments(
      makeEsClient(resolveIndex),
      ['logs-healthy'],
      logger
    );

    expect(result).toEqual({ openBackingIndices: [], negations: [] });
  });

  it('does not make a second resolveIndex call when data_streams is empty', async () => {
    const resolveIndex = jest.fn().mockResolvedValue(emptyResolve);

    await resolveClosedIndexAdjustments(makeEsClient(resolveIndex), ['logs-*'], logger);

    expect(resolveIndex).toHaveBeenCalledTimes(1);
  });

  it('batches backing index names into a single resolveIndex call when small enough to fit', async () => {
    const resolveIndex = jest
      .fn()
      .mockResolvedValueOnce({
        indices: [],
        aliases: [],
        data_streams: [
          {
            name: 'logs-foo',
            backing_indices: ['.ds-logs-foo-000001', '.ds-logs-foo-000002'],
            timestamp_field: '@timestamp',
          },
        ],
      })
      .mockResolvedValueOnce(emptyResolve);

    await resolveClosedIndexAdjustments(makeEsClient(resolveIndex), ['logs-*'], logger);

    expect(resolveIndex).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        name: ['.ds-logs-foo-000001', '.ds-logs-foo-000002'],
      })
    );
  });

  it('splits backing index names across multiple batches when URL length would be exceeded', async () => {
    // 300 names × ~21 bytes each exceeds 3500 bytes per batch, guaranteeing multiple batches
    const allBackingIndices = Array.from(
      { length: 300 },
      (_, i) => `.ds-logs-batch-${String(i).padStart(6, '0')}`
    );

    const resolveIndex = jest
      .fn()
      .mockResolvedValueOnce({
        indices: [],
        aliases: [],
        data_streams: [
          {
            name: 'logs-batch',
            backing_indices: allBackingIndices,
            timestamp_field: '@timestamp',
          },
        ],
      })
      .mockResolvedValue(emptyResolve);

    await resolveClosedIndexAdjustments(makeEsClient(resolveIndex), ['logs-batch'], logger);

    // More than 2 calls means batching occurred (call 1 = pattern resolve, calls 2+ = batches)
    expect(resolveIndex.mock.calls.length).toBeGreaterThan(2);

    // Every backing index name must appear in exactly one batch call
    const batchCalls = resolveIndex.mock.calls.slice(1);
    const allNamesFromBatches = batchCalls.flatMap((args) => (args[0] as { name: string[] }).name);
    expect(allNamesFromBatches).toEqual(allBackingIndices);
  });

  it('merges closed backing index results across all batches', async () => {
    const allBackingIndices = Array.from(
      { length: 300 },
      (_, i) => `.ds-logs-merge-${String(i).padStart(6, '0')}`
    );
    // Mark the first and last index as closed so they are guaranteed to be in different batches
    const closedSet = new Set([
      allBackingIndices[0],
      allBackingIndices[allBackingIndices.length - 1],
    ]);

    const resolveIndex = jest
      .fn()
      .mockResolvedValueOnce({
        indices: [],
        aliases: [],
        data_streams: [
          {
            name: 'logs-merge',
            backing_indices: allBackingIndices,
            timestamp_field: '@timestamp',
          },
        ],
      })
      .mockImplementation(({ name }: { name: string[] }) =>
        Promise.resolve({
          indices: name.map((n) => ({
            name: n,
            attributes: [closedSet.has(n) ? 'closed' : 'open'],
          })),
          aliases: [],
          data_streams: [],
        })
      );

    const result = await resolveClosedIndexAdjustments(
      makeEsClient(resolveIndex),
      ['logs-merge'],
      logger
    );

    expect(result.negations).toContain('-logs-merge');
    expect(result.openBackingIndices).toHaveLength(allBackingIndices.length - closedSet.size);
    for (const closed of closedSet) {
      expect(result.openBackingIndices).not.toContain(closed);
    }
  });

  it('returns empty result and logs a warning if a batch resolveIndex call fails', async () => {
    const backingIndices = ['.ds-logs-foo-000001', '.ds-logs-foo-000002'];
    const resolveIndex = jest
      .fn()
      .mockResolvedValueOnce({
        indices: [],
        aliases: [],
        data_streams: [
          { name: 'logs-foo', backing_indices: backingIndices, timestamp_field: '@timestamp' },
        ],
      })
      .mockRejectedValue(new Error('batch resolve failed'));

    const result = await resolveClosedIndexAdjustments(
      makeEsClient(resolveIndex),
      ['logs-foo'],
      logger
    );

    expect(result).toEqual({ openBackingIndices: [], negations: [] });
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Failed to resolve closed indices')
    );
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('batch resolve failed'));
  });

  it('calls resolveIndex with correct expand_wildcards and ignore options', async () => {
    const resolveIndex = jest.fn().mockResolvedValue(emptyResolve);

    await resolveClosedIndexAdjustments(makeEsClient(resolveIndex), ['logs-*'], logger);

    expect(resolveIndex).toHaveBeenCalledWith({
      name: ['logs-*'],
      expand_wildcards: ['open', 'closed', 'hidden'],
      ignore_unavailable: true,
      allow_no_indices: true,
    });
  });

  it('limits concurrent batch resolveIndex calls to 30 at a time', async () => {
    // Long names (~183 chars) keep each URL chunk to ~18 indices.
    // 800 names → ~45 chunks, well above the 30 concurrency cap.
    const longPrefix = '.ds-logs-climit-' + 'a'.repeat(160);
    const allBackingIndices = Array.from(
      { length: 800 },
      (_, i) => `${longPrefix}-${String(i).padStart(6, '0')}`
    );

    let activeCalls = 0;
    let peakActiveCalls = 0;
    const pendingResolvers: Array<() => void> = [];

    const resolveIndex = jest
      .fn()
      .mockResolvedValueOnce({
        indices: [],
        aliases: [],
        data_streams: [
          {
            name: 'logs-climit',
            backing_indices: allBackingIndices,
            timestamp_field: '@timestamp',
          },
        ],
      })
      .mockImplementation(
        () =>
          new Promise((resolve) => {
            activeCalls++;
            peakActiveCalls = Math.max(peakActiveCalls, activeCalls);
            pendingResolvers.push(() => {
              activeCalls--;
              resolve(emptyResolve);
            });
          })
      );

    const resultPromise = resolveClosedIndexAdjustments(
      makeEsClient(resolveIndex),
      ['logs-climit'],
      logger
    );

    // Flush all microtasks so pLimit fills up to its concurrency cap before we inspect.
    await new Promise<void>((resolve) => setImmediate(resolve));

    expect(peakActiveCalls).toBe(30);
    expect(activeCalls).toBe(30);

    // Drain in rounds: resolving a batch lets pLimit start the next queued chunks.
    while (pendingResolvers.length > 0) {
      pendingResolvers.splice(0).forEach((r) => r());
      await new Promise<void>((resolve) => setImmediate(resolve));
    }

    await resultPromise;

    // Sanity check: there were more than 30 chunks, so the cap was actually exercised.
    expect(resolveIndex.mock.calls.length - 1).toBeGreaterThan(30);
  });

  it('returns empty result and logs a warning on resolveIndex failure', async () => {
    const resolveIndex = jest.fn().mockRejectedValue(new Error('connection refused'));

    const result = await resolveClosedIndexAdjustments(
      makeEsClient(resolveIndex),
      ['logs-*'],
      logger
    );

    expect(result).toEqual({ openBackingIndices: [], negations: [] });
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Failed to resolve closed indices')
    );
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('connection refused'));
  });

  it('logs a warning when closed indices are detected', async () => {
    const resolveIndex = jest
      .fn()
      .mockResolvedValueOnce({
        indices: [],
        aliases: [],
        data_streams: [
          {
            name: 'logs-closed-ds',
            backing_indices: ['.ds-logs-closed-ds-000001'],
            timestamp_field: '@timestamp',
          },
        ],
      })
      .mockResolvedValueOnce({
        indices: [{ name: '.ds-logs-closed-ds-000001', attributes: ['closed'] }],
        aliases: [],
        data_streams: [],
      });

    await resolveClosedIndexAdjustments(makeEsClient(resolveIndex), ['logs-*'], logger);

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('-logs-closed-ds'));
  });
});
