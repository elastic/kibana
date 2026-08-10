/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import type { Signal } from '../../common/http_api/signals';
import { SignalsService } from './service';
import { createSignalsStorageClient } from './storage';

jest.mock('./storage');

const createSignalsStorageClientMock = createSignalsStorageClient as jest.MockedFunction<
  typeof createSignalsStorageClient
>;

const makeToolCallSignal = (overrides: Partial<Signal> = {}): Signal => ({
  signal_id: 'trace-1:span-1',
  '@timestamp': '2026-01-01T00:00:00.000Z',
  trace_ids: ['trace-1'],
  signal_type: 'tool_call',
  tags: [],
  data: {
    tool: 'platform.core.execute_esql',
    query_kind: 'ki_retrieval',
    target_index: '.ai-index-idx-sml-data',
    status: 'Ok',
    looped: false,
    fell_back_to_raw: false,
    producer: 'trace_tool',
    span_id: 'span-1',
    agent: { id: 'a1', name: 'A1', class: 'user' },
    returned: { columns: ['x'], row_count: 3 },
    duration_ms: 12,
    round_signals: { esql_count: 1, raw_query_count: 0, ki_retrieval_count: 1 },
  },
  ...overrides,
});

describe('SignalsService', () => {
  const storageClient = {
    bulk: jest.fn(),
    search: jest.fn(),
    reconcileMappings: jest.fn(),
  } as unknown as ReturnType<typeof createSignalsStorageClient>;

  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  const logger = loggerMock.create();

  let service: SignalsService;

  beforeEach(() => {
    jest.clearAllMocks();
    createSignalsStorageClientMock.mockReturnValue(storageClient);
    service = new SignalsService({ esClient, logger });
  });

  it('creates the storage client with the provided es client and logger', () => {
    expect(createSignalsStorageClientMock).toHaveBeenCalledWith({ esClient, logger });
  });

  describe('ensureIndex', () => {
    it('reconciles the index mappings', async () => {
      (storageClient.reconcileMappings as jest.Mock).mockResolvedValue(undefined);
      await service.ensureIndex();
      expect(storageClient.reconcileMappings).toHaveBeenCalledTimes(1);
    });
  });

  describe('write', () => {
    it('is a no-op for an empty batch', async () => {
      await service.write([]);
      expect(storageClient.bulk).not.toHaveBeenCalled();
    });

    it('bulk-indexes each signal off the refresh path, with throwOnFail', async () => {
      (storageClient.bulk as jest.Mock).mockResolvedValue({ errors: false, items: [] });
      const signal = makeToolCallSignal();

      await service.write([signal]);

      expect(storageClient.bulk).toHaveBeenCalledWith({
        operations: [{ index: { _id: signal.signal_id, document: signal } }],
        refresh: false,
        throwOnFail: true,
      });
    });

    it('uses signal_id as the document _id (so a re-processed span overwrites)', async () => {
      (storageClient.bulk as jest.Mock).mockResolvedValue({ errors: false, items: [] });
      const signal = makeToolCallSignal();

      await service.write([signal]);
      await service.write([signal]);

      for (const call of (storageClient.bulk as jest.Mock).mock.calls) {
        expect(call[0].operations[0].index._id).toBe(signal.signal_id);
      }
    });

    it('rejects when the storage client rejects (so the producer can retry)', async () => {
      (storageClient.bulk as jest.Mock).mockRejectedValue(new Error('bulk failed'));
      await expect(service.write([makeToolCallSignal()])).rejects.toThrow('bulk failed');
    });
  });

  describe('list', () => {
    const searchResponse = (sources: Signal[]) => ({
      hits: { hits: sources.map((_source) => ({ _source })) },
    });

    it('searches newest-first with no query when unfiltered', async () => {
      const signal = makeToolCallSignal();
      (storageClient.search as jest.Mock).mockResolvedValue(searchResponse([signal]));

      const result = await service.list();

      expect(storageClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          size: 1000,
          track_total_hits: false,
          sort: [{ '@timestamp': { order: 'desc' } }],
        })
      );
      expect((storageClient.search as jest.Mock).mock.calls[0][0].query).toBeUndefined();
      expect(result).toEqual([signal]);
    });

    it('filters by signal_type', async () => {
      (storageClient.search as jest.Mock).mockResolvedValue(searchResponse([]));

      await service.list({ signalType: 'tool_call', size: 50 });

      const request = (storageClient.search as jest.Mock).mock.calls[0][0];
      expect(request.size).toBe(50);
      expect(request.query.bool.filter).toEqual([{ term: { signal_type: 'tool_call' } }]);
    });

    it('clamps size to the max', async () => {
      (storageClient.search as jest.Mock).mockResolvedValue(searchResponse([]));
      await service.list({ size: 1_000_000 });
      expect((storageClient.search as jest.Mock).mock.calls[0][0].size).toBe(10_000);
    });
  });
});
