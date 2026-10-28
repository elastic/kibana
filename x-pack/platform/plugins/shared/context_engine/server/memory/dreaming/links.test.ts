/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { LONG_TERM_MEMORY_INDEX } from '../../../common/memory';
import type { StoredMemoryDocument } from '../memory_document';
import { MAX_LINK_UPDATE_ROUNDS, updateLinksOfEnd } from './links';

const NOW = '2026-10-02T00:00:00.000Z';
const writer = { uri: 'task://contextEngine:memoryDreaming', metadata: {} };

const memory = (id: string, type: string, title: string): StoredMemoryDocument => ({
  '@timestamp': NOW,
  id,
  type,
  title,
  content: '',
  updated_at: NOW,
});

const link = (id: string, fromId: string, toId: string): StoredMemoryDocument => ({
  ...memory(id, 'memory.relationship', `${fromId} owns ${toId}`),
  attributes: { 'relationship.relation': 'owns' },
  references: [
    { uri: `ki://long-term-memory/${fromId}`, relation: 'relates_to', description: 'from' },
    { uri: `ki://long-term-memory/${toId}`, relation: 'relates_to', description: 'to' },
  ],
});

const hit = (document: StoredMemoryDocument) => ({
  _index: LONG_TERM_MEMORY_INDEX,
  _id: document.id,
  _seq_no: 1,
  _primary_term: 1,
  _source: document,
});

describe('updateLinksOfEnd', () => {
  let esClient: ReturnType<typeof elasticsearchClientMock.createElasticsearchClient>;
  const logger = loggerMock.create();

  const mockRounds = (...rounds: StoredMemoryDocument[][]) => {
    for (const round of rounds) {
      esClient.search.mockResolvedValueOnce({
        hits: { hits: round.map(hit) },
      } as unknown as Awaited<ReturnType<typeof esClient.search>>);
    }
    esClient.search.mockResolvedValue({ hits: { hits: [] } } as unknown as Awaited<
      ReturnType<typeof esClient.search>
    >);
  };

  const update = (params: { replacement?: StoredMemoryDocument; live?: StoredMemoryDocument[] }) =>
    updateLinksOfEnd({
      esClient,
      spaceId: 'team-a',
      endId: 'old',
      replacement: params.replacement,
      getLiveMemory: async (id) => params.live?.find((candidate) => candidate.id === id),
      context: { now: NOW, writer },
      logger,
    });

  const indexed = () =>
    esClient.index.mock.calls.map(([request]) => request.document as StoredMemoryDocument);

  beforeEach(() => {
    esClient = elasticsearchClientMock.createElasticsearchClient();
  });

  it('outdates a link whose other end is gone instead of moving it', async () => {
    mockRounds([link('l1', 'old', 'gone')]);

    const updated = await update({ replacement: memory('new', 'memory.entity', 'New') });

    expect(updated).toBe(1);
    expect(indexed()[0]).toMatchObject({ id: 'l1', expires_at: NOW });
  });

  it('retries a link that changed while it was being moved', async () => {
    const other = memory('other', 'memory.fact', 'Other');
    mockRounds([link('l1', 'other', 'old')], [link('l1', 'other', 'old')]);
    esClient.index.mockRejectedValueOnce(
      new errors.ResponseError(
        elasticsearchClientMock.createApiResponse({ statusCode: 409, body: {} })
      )
    );

    const updated = await update({
      replacement: memory('new', 'memory.entity', 'New'),
      live: [other],
    });

    expect(updated).toBe(1);
    expect(esClient.search).toHaveBeenCalledTimes(2);
    expect(indexed()[1]).toMatchObject({
      attributes: { 'memory.key': 'other|owns|new' },
      references: [
        { uri: 'ki://long-term-memory/other', relation: 'relates_to', description: 'from' },
        { uri: 'ki://long-term-memory/new', relation: 'relates_to', description: 'to' },
      ],
    });
  });

  it('finds the links of an end by its reference uri', async () => {
    mockRounds();

    await update({});

    expect(esClient.search.mock.calls[0][0]?.query?.bool?.filter).toContainEqual({
      terms: { 'references.uri': ['ki://long-term-memory/old'] },
    });
  });

  it('stops after the maximum number of rounds', async () => {
    const full = Array.from({ length: 100 }, (_, index) => link(`l${index}`, 'old', 'x'));
    esClient.search.mockResolvedValue({ hits: { hits: full.map(hit) } } as unknown as Awaited<
      ReturnType<typeof esClient.search>
    >);

    await update({});

    expect(esClient.search).toHaveBeenCalledTimes(MAX_LINK_UPDATE_ROUNDS);
    expect(logger.warn).toHaveBeenCalled();
  });
});
