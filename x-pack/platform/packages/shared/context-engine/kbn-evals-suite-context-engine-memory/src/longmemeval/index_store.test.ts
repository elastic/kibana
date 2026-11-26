/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { POC_INDEX } from './constants';
import type { LongMemEvalHistory } from './dataset';
import {
  assertPocIndex,
  deletePocIndex,
  loadHistoryIntoPocIndex,
  toSessionDocument,
} from './index_store';

const history: LongMemEvalHistory = {
  sessions: [
    {
      sourceIndex: 0,
      sessionId: 'session-0000',
      occurredAtRaw: '2023/05/22 (Mon) 21:18',
      occurredAt: '2023-05-22T21:18',
      messages: [
        { role: 'user', content: 'I painted my bike red' },
        { role: 'assistant', content: 'Nice colour.' },
      ],
    },
  ],
};

const mockEsClient = ({ bulkErrors = false, count = 1 } = {}) => {
  const client = {
    indices: {
      delete: jest.fn().mockResolvedValue({}),
      create: jest.fn().mockResolvedValue({}),
      exists: jest.fn().mockResolvedValue(false),
    },
    bulk: jest.fn().mockResolvedValue({
      errors: bulkErrors,
      items: bulkErrors ? [{ index: { error: { type: 'mapper_parsing_exception' } } }] : [],
    }),
    count: jest.fn().mockResolvedValue({ count }),
  };
  return { client, esClient: client as unknown as Client };
};

describe('assertPocIndex', () => {
  it('only accepts the exact POC index name', () => {
    expect(() => assertPocIndex(POC_INDEX)).not.toThrow();
    expect(() => assertPocIndex(`${POC_INDEX}*`)).toThrow(/Refusing/);
    expect(() => assertPocIndex('*')).toThrow(/Refusing/);
  });

  it('guards the delete helper too', async () => {
    const { client, esClient } = mockEsClient();
    await expect(deletePocIndex(esClient, 'other-index')).rejects.toThrow(/Refusing/);
    expect(client.indices.delete).not.toHaveBeenCalled();
  });
});

describe('toSessionDocument', () => {
  it('flattens messages in order and keeps dates', () => {
    expect(toSessionDocument(history.sessions[0])).toEqual({
      benchmark: 'longmemeval-s',
      index_schema_version: 'session-per-document-v1',
      session_id: 'session-0000',
      session_order: 0,
      session_date: '2023/05/22 (Mon) 21:18',
      session_timestamp: '2023-05-22T21:18',
      message_count: 2,
      conversation: 'user: I painted my bike red\nassistant: Nice colour.',
    });
  });
});

describe('loadHistoryIntoPocIndex', () => {
  it('recreates the index, bulk-loads sessions by opaque ID and verifies the count', async () => {
    const { client, esClient } = mockEsClient();
    await expect(loadHistoryIntoPocIndex(esClient, history)).resolves.toMatchObject({
      documentCount: 1,
    });
    expect(client.indices.delete).toHaveBeenCalledWith({
      index: POC_INDEX,
      ignore_unavailable: true,
    });
    expect(client.bulk.mock.calls[0][0].operations[0]).toEqual({
      index: { _index: POC_INDEX, _id: 'session-0000' },
    });
  });

  it('fails on bulk item errors and count mismatches', async () => {
    await expect(
      loadHistoryIntoPocIndex(mockEsClient({ bulkErrors: true }).esClient, history)
    ).rejects.toThrow(/Bulk indexing/);
    await expect(
      loadHistoryIntoPocIndex(mockEsClient({ count: 0 }).esClient, history)
    ).rejects.toThrow(/Expected 1 documents/);
  });
});
