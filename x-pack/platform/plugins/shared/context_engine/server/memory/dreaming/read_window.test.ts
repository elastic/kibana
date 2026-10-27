/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { SHORT_TERM_MEMORY_DATA_STREAM } from '../../../common/memory';
import type { StoredMemoryDocument } from '../memory_document';
import { readDreamWindow } from './read_window';

const memory = (id: string, timestamp: string, title = id): StoredMemoryDocument => ({
  '@timestamp': timestamp,
  id,
  type: 'memory.session_fact',
  title,
  description: '',
  content: '',
  updated_at: timestamp,
});

const page = (documents: StoredMemoryDocument[]) => ({
  hits: {
    hits: documents.map((document) => ({
      _index: 'idx',
      _id: `${document.id}-${document['@timestamp']}`,
      _source: document,
      sort: [document['@timestamp'], document.id],
    })),
  },
});

describe('readDreamWindow', () => {
  let esClient: ReturnType<typeof elasticsearchClientMock.createElasticsearchClient>;

  const mockPages = (...pages: StoredMemoryDocument[][]) => {
    for (const documents of pages) {
      esClient.search.mockResolvedValueOnce(
        page(documents) as unknown as Awaited<ReturnType<typeof esClient.search>>
      );
    }
  };

  beforeEach(() => {
    esClient = elasticsearchClientMock.createElasticsearchClient();
  });

  it('reads the window after `from`, oldest first, in the space', async () => {
    mockPages([]);

    await readDreamWindow({
      esClient,
      spaceId: 'team-a',
      from: '2026-10-01T00:00:00.000Z',
      to: '2026-10-02T00:00:00.000Z',
      maxMemories: 10,
    });

    const [request] = esClient.search.mock.calls[0];
    expect(request).toMatchObject({
      index: SHORT_TERM_MEMORY_DATA_STREAM,
      sort: [{ '@timestamp': 'asc' }, { id: 'asc' }],
    });
    expect(JSON.stringify(request)).toContain(
      '{"range":{"@timestamp":{"gt":"2026-10-01T00:00:00.000Z","lte":"2026-10-02T00:00:00.000Z"}}}'
    );
    expect(JSON.stringify(request)).toContain('"team-a"');
  });

  it('reads from the start when there was no previous dream', async () => {
    mockPages([]);

    await readDreamWindow({ esClient, spaceId: 'team-a', to: 'now', maxMemories: 10 });

    expect(JSON.stringify(esClient.search.mock.calls[0][0])).toContain(
      '{"range":{"@timestamp":{"lte":"now"}}}'
    );
  });

  it('keeps the latest revision of each memory', async () => {
    mockPages([
      memory('a', '2026-10-01T01:00:00.000Z', 'first'),
      memory('b', '2026-10-01T02:00:00.000Z'),
      memory('a', '2026-10-01T03:00:00.000Z', 'second'),
    ]);

    const window = await readDreamWindow({ esClient, spaceId: 's', to: 'now', maxMemories: 10 });

    expect(window.truncatedAt).toBeUndefined();
    expect(window.memories.map(({ id, title }) => ({ id, title }))).toEqual([
      { id: 'a', title: 'second' },
      { id: 'b', title: 'b' },
    ]);
  });

  it('stops after maxMemories but finishes the timestamp it stopped on', async () => {
    mockPages([memory('a', 't1'), memory('b', 't2'), memory('c', 't2'), memory('d', 't3')]);

    const window = await readDreamWindow({ esClient, spaceId: 's', to: 'now', maxMemories: 2 });

    expect(window.truncatedAt).toBe('t2');
    expect(window.memories.map(({ id }) => id)).toEqual(['a', 'b', 'c']);
  });

  it('does not report truncation when the limit is reached on the last memories', async () => {
    mockPages([memory('a', 't1'), memory('b', 't2'), memory('c', 't2')]);

    const window = await readDreamWindow({ esClient, spaceId: 's', to: 'now', maxMemories: 2 });

    expect(window.truncatedAt).toBeUndefined();
    expect(window.memories).toHaveLength(3);
  });

  it('pages with search_after until a short page', async () => {
    const first = Array.from({ length: 500 }, (_, i) => memory(`a${i}`, `t${i}`));
    mockPages(first, [memory('z', 'tz')]);

    const window = await readDreamWindow({
      esClient,
      spaceId: 's',
      to: 'now',
      maxMemories: 1000,
    });

    expect(esClient.search).toHaveBeenCalledTimes(2);
    expect(esClient.search.mock.calls[1][0]).toMatchObject({ search_after: ['t499', 'a499'] });
    expect(window.memories).toHaveLength(501);
    expect(window.truncatedAt).toBeUndefined();
  });
});
