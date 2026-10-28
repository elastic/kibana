/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';
import { MAX_RECALL_SIZE } from '../../common/memory';
import { findLinks } from './dreaming/links';
import type { StoredMemoryDocument } from './memory_document';
import { MAX_RECALLED_CONTENT_LENGTH, recallMemories } from './recall';

jest.mock('./dreaming/links', () => ({ findLinks: jest.fn() }));

const findLinksMock = jest.mocked(findLinks);

const NOW = '2026-10-02T00:00:00.000Z';

const memory = (
  id: string,
  type: string,
  attributes: StoredMemoryDocument['attributes'] = {},
  content = `${id} content`
): StoredMemoryDocument => ({
  '@timestamp': NOW,
  id,
  type,
  title: id,
  description: `${id} description`,
  content,
  updated_at: NOW,
  attributes,
});

const link = (id: string, fromId: string, relation: string, toId: string) => ({
  id,
  seqNo: 1,
  primaryTerm: 1,
  document: {
    ...memory(id, 'memory.relationship', { 'relationship.relation': relation }),
    references: [
      { uri: `ki://long-term-memory/${fromId}`, relation: 'relates_to', description: 'from' },
      { uri: `ki://long-term-memory/${toId}`, relation: 'relates_to', description: 'to' },
    ],
  },
});

const hits = (...documents: StoredMemoryDocument[]) => ({
  hits: { hits: documents.map((document) => ({ _source: document })) },
});

describe('recallMemories', () => {
  let msearch: jest.Mock;
  let search: jest.Mock;

  const recall = (request: { query: string; size?: number; types?: ['memory.entity'] }) =>
    recallMemories({
      esClient: { msearch, search } as unknown as ElasticsearchClient,
      spaceId: 'team-a',
      now: NOW,
      logger: loggerMock.create(),
      ...request,
    });

  beforeEach(() => {
    msearch = jest.fn();
    search = jest.fn().mockResolvedValue(hits());
    findLinksMock.mockReset().mockResolvedValue([]);
  });

  it('merges the lexical and semantic matches, then adds their links and linked memories', async () => {
    const team = memory('team', 'memory.entity', {
      'entity.kind': 'team',
      'entity.aliases': ['infra'],
    });
    msearch.mockResolvedValue({
      responses: [
        hits(team, memory('fact', 'memory.fact')),
        hits(memory('fact', 'memory.fact'), team),
      ],
    });
    findLinksMock.mockResolvedValue([
      link('link-1', 'team', 'owns', 'service'),
      link('link-2', 'fact', 'about', 'team'),
      link('link-3', 'team', 'uses', 'gone'),
    ]);
    search.mockResolvedValue(
      hits(memory('service', 'memory.entity', { 'entity.kind': 'service' }))
    );

    const result = await recall({ query: 'perf-canary' });

    expect(result.memories).toEqual([
      expect.objectContaining({
        id: 'team',
        kind: 'team',
        aliases: ['infra'],
        content: 'team content',
      }),
      expect.objectContaining({ id: 'fact', content: 'fact content' }),
    ]);
    expect(result.linked_memories).toEqual([
      {
        id: 'service',
        type: 'memory.entity',
        title: 'service',
        description: 'service description',
        kind: 'service',
        updated_at: NOW,
      },
    ]);
    expect(result.links).toEqual([
      {
        id: 'link-1',
        from_id: 'team',
        relation: 'owns',
        to_id: 'service',
        description: 'link-1 description',
      },
      {
        id: 'link-2',
        from_id: 'fact',
        relation: 'about',
        to_id: 'team',
        description: 'link-2 description',
      },
    ]);
    expect(findLinksMock).toHaveBeenCalledWith(expect.objectContaining({ ids: ['team', 'fact'] }));
    expect(search.mock.calls[0][0].query.bool.filter).toContainEqual({
      terms: { id: ['service', 'gone'] },
    });
  });

  it('uses the lexical matches when the semantic search fails', async () => {
    msearch.mockResolvedValue({
      responses: [
        hits(memory('fact', 'memory.fact')),
        { error: { type: 'x', reason: 'no model' } },
      ],
    });

    const result = await recall({ query: 'perf-canary' });

    expect(result.memories.map(({ id }) => id)).toEqual(['fact']);
  });

  it('fails when the lexical search fails', async () => {
    msearch.mockResolvedValue({
      responses: [{ error: { type: 'security_exception', reason: 'unauthorized' } }, hits()],
    });

    await expect(recall({ query: 'perf-canary' })).rejects.toThrow('unauthorized');
  });

  it('returns nothing, and looks up no links, when nothing matches', async () => {
    msearch.mockResolvedValue({ responses: [hits(), hits()] });

    expect(await recall({ query: 'perf-canary' })).toEqual({
      memories: [],
      linked_memories: [],
      links: [],
    });
    expect(findLinksMock).not.toHaveBeenCalled();
  });

  it('caps the size, filters by type and truncates long content', async () => {
    msearch.mockResolvedValue({
      responses: [hits(memory('long', 'memory.entity', {}, 'x'.repeat(5000))), hits()],
    });

    const result = await recall({ query: 'perf-canary', size: 500, types: ['memory.entity'] });

    const { searches } = msearch.mock.calls[0][0];
    expect(searches[1].size).toBe(MAX_RECALL_SIZE);
    expect(searches[1].query.bool.filter).toContainEqual({ terms: { type: ['memory.entity'] } });
    expect(searches[3].query.bool.must).toEqual([
      { semantic: { field: 'content.semantic', query: 'perf-canary' } },
    ]);
    expect(result.memories[0].content).toHaveLength(MAX_RECALLED_CONTENT_LENGTH + 1);
  });
});
