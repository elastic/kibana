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
  assertPocIndexSearchable,
  deletePocIndex,
  isPocIndexPresent,
  loadHistoryIntoPocIndex,
  toHistoryDocuments,
  toTurnDocuments,
  turnDocumentId,
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

const mockEsClient = ({
  bulkErrors = false,
  count = 1,
  esqlResponse = { columns: [{ name: 'text' }], values: [['user: I painted my bike red']] },
}: {
  bulkErrors?: boolean;
  count?: number;
  esqlResponse?: { columns: Array<{ name: string }>; values: unknown[][] };
} = {}) => {
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
    esql: { query: jest.fn().mockResolvedValue(esqlResponse) },
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

describe('toTurnDocuments', () => {
  const session = (messages: LongMemEvalHistory['sessions'][number]['messages']) => ({
    ...history.sessions[0],
    messages,
  });

  it('turns a user message and its reply into one document with session fields', () => {
    expect(toTurnDocuments(history.sessions[0])).toEqual([
      {
        benchmark: 'longmemeval-s',
        index_schema_version: 'turn-per-document-v1',
        session_id: 'session-0000',
        session_order: 0,
        session_date: '2023/05/22 (Mon) 21:18',
        session_timestamp: '2023-05-22T21:18',
        turn_index: 0,
        turn_count: 1,
        message_count: 2,
        text: 'user: I painted my bike red\nassistant: Nice colour.',
      },
    ]);
  });

  it('starts a new turn at each user message and keeps every reply with its turn', () => {
    const docs = toTurnDocuments(
      session([
        { role: 'user', content: 'a' },
        { role: 'assistant', content: 'b' },
        { role: 'assistant', content: 'c' },
        { role: 'user', content: 'd' },
        { role: 'user', content: 'e' },
        { role: 'assistant', content: 'f' },
      ])
    );

    expect(
      docs.map(({ turn_index, turn_count, message_count }) => [
        turn_index,
        turn_count,
        message_count,
      ])
    ).toEqual([
      [0, 3, 3],
      [1, 3, 1],
      [2, 3, 2],
    ]);
    expect(docs.map(({ text }) => text)).toEqual([
      'user: a\nassistant: b\nassistant: c',
      'user: d',
      'user: e\nassistant: f',
    ]);
  });

  it('gives an assistant message before any user message its own turn', () => {
    const docs = toTurnDocuments(
      session([
        { role: 'assistant', content: 'hello' },
        { role: 'user', content: 'hi' },
      ])
    );

    expect(docs.map(({ text }) => text)).toEqual(['assistant: hello', 'user: hi']);
  });

  it('creates no documents for an empty session and flattens a history in order', () => {
    expect(toTurnDocuments(session([]))).toEqual([]);
    expect(toHistoryDocuments(history).map(({ session_id }) => session_id)).toEqual([
      'session-0000',
    ]);
  });

  it('builds stable, opaque document IDs', () => {
    expect(turnDocumentId('session-0007', 3)).toBe('session-0007-turn-0003');
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
      index: { _index: POC_INDEX, _id: 'session-0000-turn-0000' },
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

describe('assertPocIndexSearchable', () => {
  it('runs a full-text ES|QL query over the loaded index and then deletes it', async () => {
    const { client, esClient } = mockEsClient();
    await expect(assertPocIndexSearchable(esClient, history)).resolves.toBeUndefined();

    const { query } = client.esql.query.mock.calls[0][0];
    expect(query).toContain(`FROM ${POC_INDEX}`);
    expect(query).toContain('MATCH(text, "painted")');
    // Once to clear the index before loading, once in the finally.
    expect(client.indices.delete).toHaveBeenCalledTimes(2);
  });

  it('fails when the query returns no turn text, still deleting the index', async () => {
    const { client, esClient } = mockEsClient({
      esqlResponse: { columns: [{ name: 'text' }], values: [[null]] },
    });
    await expect(assertPocIndexSearchable(esClient, history)).rejects.toThrow(/no turn text/);
    expect(client.indices.delete).toHaveBeenCalledTimes(2);
  });

  it('fails before touching Elasticsearch when no search term can be chosen', async () => {
    const { client, esClient } = mockEsClient();
    const shortWords: LongMemEvalHistory = {
      sessions: [{ ...history.sessions[0], messages: [{ role: 'user', content: 'hi me' }] }],
    };
    await expect(assertPocIndexSearchable(esClient, shortWords)).rejects.toThrow(
      /Cannot pick a search term/
    );
    expect(client.indices.create).not.toHaveBeenCalled();
  });
});

describe('isPocIndexPresent', () => {
  it('checks the POC index and refuses any other name', async () => {
    const { client, esClient } = mockEsClient();
    client.indices.exists.mockResolvedValue(true);
    await expect(isPocIndexPresent(esClient)).resolves.toBe(true);
    expect(client.indices.exists).toHaveBeenCalledWith({ index: POC_INDEX });
    await expect(isPocIndexPresent(esClient, 'other-index')).rejects.toThrow(/Refusing/);
  });
});
