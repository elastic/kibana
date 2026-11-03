/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { BrowserToolCallStatus } from '@kbn/agent-builder-common';
import { browserToolCallIndexName } from './browser_tool_call_storage';
import {
  browserToolCallDocId,
  createBrowserToolCallClient,
  type BrowserToolCallClient,
} from './browser_tool_call_client';

const mockStorageClient = { index: jest.fn() };

jest.mock('./browser_tool_call_storage', () => ({
  ...jest.requireActual('./browser_tool_call_storage'),
  createBrowserToolCallStorage: () => ({ getClient: () => mockStorageClient }),
}));

const notFound = () => Object.assign(new Error('not found'), { meta: { statusCode: 404 } });

describe('BrowserToolCallClient', () => {
  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
  let client: BrowserToolCallClient;

  beforeEach(() => {
    mockStorageClient.index.mockReset().mockResolvedValue({});
    esClient = elasticsearchServiceMock.createElasticsearchClient();
    client = createBrowserToolCallClient({ logger: loggerMock.create(), esClient });
  });

  it('create writes a pending document with op_type create', async () => {
    await client.create({
      executionId: 'exec-1',
      toolCallId: 'call-1',
      clientId: 'client-1',
      spaceId: 'default',
      toolId: 'my_tool',
      expiresAt: '2026-01-01T00:00:00.000Z',
    });

    expect(mockStorageClient.index).toHaveBeenCalledTimes(1);
    expect(mockStorageClient.index).toHaveBeenCalledWith(
      expect.objectContaining({
        id: browserToolCallDocId('exec-1', 'call-1'),
        op_type: 'create',
        refresh: false,
        document: expect.objectContaining({
          execution_id: 'exec-1',
          tool_call_id: 'call-1',
          client_id: 'client-1',
          space_id: 'default',
          tool_id: 'my_tool',
          status: BrowserToolCallStatus.pending,
          expires_at: '2026-01-01T00:00:00.000Z',
        }),
      })
    );
  });

  it('create stores a normalised expires_at when given a date without offset', async () => {
    await client.create({
      executionId: 'exec-1',
      toolCallId: 'call-1',
      spaceId: 'default',
      toolId: 'my_tool',
      expiresAt: '2026-01-01T00:00:00',
    });
    const [{ document }] = mockStorageClient.index.mock.calls[0];
    expect(document.expires_at).toBe(new Date('2026-01-01T00:00:00').toISOString());
    expect(document.expires_at).toMatch(/Z$/);
  });

  it('get returns undefined on 404', async () => {
    esClient.get.mockRejectedValue(notFound());
    await expect(client.get('exec-1', 'call-1')).resolves.toBeUndefined();
    expect(esClient.get).toHaveBeenCalledWith({
      index: browserToolCallIndexName,
      id: 'exec-1:call-1',
    });
  });

  it("answer returns 'accepted' when the update result is 'updated'", async () => {
    esClient.update.mockResolvedValue({ result: 'updated' } as any);
    const now = new Date('2026-01-01T00:00:00.000Z');

    const outcome = await client.answer({
      executionId: 'exec-1',
      toolCallId: 'call-1',
      clientId: 'client-1',
      result: { status: 'ok', content: 'done' },
      now,
    });

    expect(outcome).toBe('accepted');
    expect(esClient.update).toHaveBeenCalledWith(
      expect.objectContaining({
        index: browserToolCallIndexName,
        id: 'exec-1:call-1',
        refresh: false,
        script: expect.objectContaining({
          lang: 'painless',
          params: expect.objectContaining({
            client_id: 'client-1',
            now_ms: now.getTime(),
            result: { status: 'ok', content: 'done' },
          }),
        }),
      })
    );
  });

  it('answer retries on conflict and sends a null client_id when none is given', async () => {
    esClient.update.mockResolvedValue({ result: 'updated' } as any);
    await client.answer({ executionId: 'exec-1', toolCallId: 'call-1', result: { status: 'ok' } });
    expect(esClient.update).toHaveBeenCalledWith(
      expect.objectContaining({
        retry_on_conflict: 3,
        script: expect.objectContaining({ params: expect.objectContaining({ client_id: null }) }),
      })
    );
  });

  it("answer returns 'rejected' when the update result is 'noop'", async () => {
    esClient.update.mockResolvedValue({ result: 'noop' } as any);
    await expect(
      client.answer({
        executionId: 'exec-1',
        toolCallId: 'call-1',
        result: { status: 'error', message: 'boom' },
      })
    ).resolves.toBe('rejected');
  });

  it("answer returns 'not_found' on 404", async () => {
    esClient.update.mockRejectedValue(notFound());
    await expect(
      client.answer({
        executionId: 'exec-1',
        toolCallId: 'call-1',
        result: { status: 'ok' },
      })
    ).resolves.toBe('not_found');
  });

  it('setStatus runs a conditional scripted update with retry on conflict', async () => {
    esClient.update.mockResolvedValue({ result: 'updated' } as any);
    await expect(
      client.setStatus('exec-1', 'call-1', BrowserToolCallStatus.consumed)
    ).resolves.toBe('applied');
    expect(esClient.update).toHaveBeenCalledWith({
      index: browserToolCallIndexName,
      id: 'exec-1:call-1',
      retry_on_conflict: 3,
      script: expect.objectContaining({
        lang: 'painless',
        source: expect.stringContaining("ctx.op = 'noop'"),
        params: { status: 'consumed' },
      }),
    });
  });

  it("setStatus returns 'skipped' when the update result is 'noop'", async () => {
    esClient.update.mockResolvedValue({ result: 'noop' } as any);
    await expect(client.setStatus('exec-1', 'call-1', BrowserToolCallStatus.expired)).resolves.toBe(
      'skipped'
    );
  });

  it('deleteOlderThan issues delete_by_query with a created_at range', async () => {
    esClient.deleteByQuery.mockResolvedValue({ deleted: 4 } as any);

    await expect(client.deleteOlderThan({ hours: 24 })).resolves.toBe(4);
    expect(esClient.deleteByQuery).toHaveBeenCalledWith({
      index: browserToolCallIndexName,
      query: { range: { created_at: { lt: 'now-24h' } } },
      conflicts: 'proceed',
      ignore_unavailable: true,
      refresh: false,
    });
  });
});
