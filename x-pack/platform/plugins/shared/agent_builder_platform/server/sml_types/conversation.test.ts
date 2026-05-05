/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { SmlListItem } from '@kbn/agent-context-layer-plugin/server';
import { conversationSmlType } from './conversation';

const collect = async (iter: AsyncIterable<SmlListItem[]>): Promise<SmlListItem[]> => {
  const out: SmlListItem[] = [];
  for await (const page of iter) out.push(...page);
  return out;
};

const createEsClient = () =>
  ({
    openPointInTime: jest.fn().mockResolvedValue({ id: 'pit-1' }),
    closePointInTime: jest.fn().mockResolvedValue({ succeeded: true }),
    search: jest.fn(),
    get: jest.fn(),
  } as unknown as { [key: string]: jest.Mock });

const createContext = (esClient: ReturnType<typeof createEsClient>) => ({
  esClient: esClient as unknown as never,
  savedObjectsClient: {} as unknown as never,
  logger: loggingSystemMock.createLogger(),
});

describe('conversationSmlType', () => {
  it('id is "conversation" and fetchFrequency is 5m', () => {
    expect(conversationSmlType.id).toBe('conversation');
    expect(conversationSmlType.fetchFrequency?.()).toBe('5m');
  });

  describe('list', () => {
    it('opens a PIT, paginates, and yields items keyed by conversation id', async () => {
      const es = createEsClient();
      es.search.mockResolvedValueOnce({
        hits: {
          hits: [
            {
              _id: 'c1',
              _source: { user_name: 'alice', space: 'default', updated_at: '2024-01-02' },
              sort: ['2024-01-02', 1],
            },
            {
              _id: 'c2',
              _source: { user_name: 'bob', space: 'team-a', updated_at: '2024-01-01' },
              sort: ['2024-01-01', 2],
            },
          ],
        },
      });
      es.search.mockResolvedValueOnce({ hits: { hits: [] } });

      const items = await collect(conversationSmlType.list(createContext(es)));

      expect(es.openPointInTime).toHaveBeenCalledWith(
        expect.objectContaining({
          index: '.chat-conversations',
          ignore_unavailable: true,
        })
      );
      expect(items).toEqual([
        { id: 'c1', updatedAt: '2024-01-02', spaces: ['default'] },
        { id: 'c2', updatedAt: '2024-01-01', spaces: ['team-a'] },
      ]);
      expect(es.closePointInTime).toHaveBeenCalledWith({ id: 'pit-1' });
    });

    it('falls back to default space when the conversation has no space field', async () => {
      const es = createEsClient();
      es.search.mockResolvedValueOnce({
        hits: {
          hits: [
            {
              _id: 'c1',
              _source: { user_name: 'alice' },
              sort: ['2024-01-02', 1],
            },
          ],
        },
      });

      const items = await collect(conversationSmlType.list(createContext(es)));
      expect(items[0].spaces).toEqual(['default']);
    });

    it('returns nothing when the conversations index does not exist', async () => {
      const es = createEsClient();
      es.openPointInTime.mockRejectedValueOnce(
        Object.assign(new Error('not found'), { statusCode: 404 })
      );

      const items = await collect(conversationSmlType.list(createContext(es)));
      expect(items).toEqual([]);
      expect(es.search).not.toHaveBeenCalled();
    });
  });

  describe('getSmlData', () => {
    it('returns one chunk per round with createdAt from started_at and userId from user_name', async () => {
      const es = createEsClient();
      es.get.mockResolvedValueOnce({
        _source: {
          user_name: 'alice',
          title: 'My chat',
          conversation_rounds: [
            {
              started_at: '2024-03-01T10:00:00.000Z',
              input: { message: 'how does X work?' },
              response: { message: 'X works like this.' },
              steps: [],
            },
            {
              started_at: '2024-03-01T10:05:00.000Z',
              input: { message: 'and what about Y?' },
              response: { message: 'Y is similar.' },
              steps: [
                { type: 'tool_call', tool_id: 'search' },
                { type: 'tool_call', tool_id: 'search' },
                { type: 'reasoning', reasoning: 'comparing X and Y' },
              ],
            },
          ],
        },
      });

      const result = await conversationSmlType.getSmlData('conv-1', createContext(es));
      expect(result?.chunks).toHaveLength(2);

      expect(result!.chunks[0]).toEqual(
        expect.objectContaining({
          type: 'conversation',
          title: 'My chat — turn 1',
          createdAt: '2024-03-01T10:00:00.000Z',
          userId: 'alice',
          permissions: [],
        })
      );
      expect(result!.chunks[0].content).toContain('User: how does X work?');
      expect(result!.chunks[0].content).toContain('Assistant: X works like this.');

      expect(result!.chunks[1].title).toBe('My chat — turn 2');
      // Tool ids should be deduplicated.
      expect(result!.chunks[1].content).toContain('Tools used: search');
      expect(result!.chunks[1].content).toContain('Reasoning: comparing X and Y');
    });

    it('skips rounds with no user message and no assistant response', async () => {
      const es = createEsClient();
      es.get.mockResolvedValueOnce({
        _source: {
          user_name: 'alice',
          title: 'partial',
          conversation_rounds: [
            { started_at: '2024-03-01', input: {}, response: {}, steps: [] },
            {
              started_at: '2024-03-02',
              input: { message: 'hi' },
              response: { message: 'hello' },
              steps: [],
            },
          ],
        },
      });

      const result = await conversationSmlType.getSmlData('conv-2', createContext(es));
      expect(result?.chunks).toHaveLength(1);
      expect(result!.chunks[0].title).toBe('partial — turn 2');
    });

    it('reads from legacy "rounds" field when "conversation_rounds" is absent', async () => {
      const es = createEsClient();
      es.get.mockResolvedValueOnce({
        _source: {
          user_name: 'alice',
          title: 'legacy',
          rounds: [
            {
              started_at: '2024-03-01',
              input: { message: 'hi' },
              response: { message: 'hello' },
              steps: [],
            },
          ],
        },
      });

      const result = await conversationSmlType.getSmlData('conv-3', createContext(es));
      expect(result?.chunks).toHaveLength(1);
    });

    it('returns undefined when the conversation document does not exist', async () => {
      const es = createEsClient();
      es.get.mockRejectedValueOnce(Object.assign(new Error('not found'), { statusCode: 404 }));

      const result = await conversationSmlType.getSmlData('missing', createContext(es));
      expect(result).toBeUndefined();
    });

    it('returns empty chunks when the conversation has no rounds', async () => {
      const es = createEsClient();
      es.get.mockResolvedValueOnce({
        _source: { user_name: 'alice', title: 'empty', conversation_rounds: [] },
      });

      const result = await conversationSmlType.getSmlData('conv-4', createContext(es));
      expect(result).toEqual({ chunks: [] });
    });
  });

  describe('toAttachment', () => {
    it('always returns undefined (conversations are search-only)', async () => {
      const result = await conversationSmlType.toAttachment(
        {
          id: 'chunk-1',
          type: 'conversation',
          title: 't',
          origin_id: 'conv-1',
          content: '',
          created_at: '',
          updated_at: '',
          spaces: ['default'],
          permissions: [],
        },
        {} as never
      );
      expect(result).toBeUndefined();
    });
  });
});
