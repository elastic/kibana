/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { getKi, kiIdQuery } from './ki_get';
import { KiNotFoundError } from './errors';

const DEST_VALUE = 'ai-index-idx-sample*';
const BACKING_INDEX = 'ai-index-idx-sample';

describe('kiIdQuery', () => {
  it('matches by _id only for documents without an id field', () => {
    expect(kiIdQuery('ki-1')).toEqual({
      bool: {
        should: [
          { term: { id: 'ki-1' } },
          {
            bool: {
              filter: [{ ids: { values: ['ki-1'] } }],
              must_not: [{ exists: { field: 'id' } }],
            },
          },
        ],
        minimum_should_match: 1,
      },
    });
  });
});

describe('ki_get', () => {
  const search = jest.fn();
  const esClient = { search } as unknown as ElasticsearchClient;

  beforeEach(() => {
    search.mockReset();
  });

  it('returns the KI id and stored document scoped to the AI index dest', async () => {
    search.mockResolvedValue({
      hits: {
        hits: [
          {
            _id: 'ki-1',
            _index: BACKING_INDEX,
            _source: {
              type: 'playbook',
              title: 'Refund playbook',
              content: 'Verify the order first.',
            },
          },
        ],
      },
    });

    await expect(
      getKi(esClient, {
        aiIndexId: 'sample',
        dest: { type: 'index', value: DEST_VALUE },
        index: BACKING_INDEX,
        kiId: 'ki-1',
      })
    ).resolves.toEqual({
      id: 'ki-1',
      document: {
        type: 'playbook',
        title: 'Refund playbook',
        content: 'Verify the order first.',
      },
    });

    expect(search).toHaveBeenCalledWith({
      index: DEST_VALUE,
      ignore_unavailable: true,
      allow_no_indices: true,
      query: {
        bool: {
          filter: [kiIdQuery('ki-1'), { term: { _index: BACKING_INDEX } }],
        },
      },
      sort: [{ '@timestamp': { order: 'desc', unmapped_type: 'date' } }],
      size: 1,
    });
  });

  it('breaks an equal-timestamp tie on a data stream by the greatest _id', async () => {
    search.mockResolvedValue({
      hits: {
        hits: [
          {
            _id: 'rev-a',
            _index: '.ds-ai-index-ds-sample-000001',
            _source: { id: 'ki-1', '@timestamp': '2026-01-01T00:00:00.000Z', title: 'A' },
            sort: [1767225600000],
          },
          {
            _id: 'rev-b',
            _index: '.ds-ai-index-ds-sample-000001',
            _source: { id: 'ki-1', '@timestamp': '2026-01-01T00:00:00Z', title: 'B' },
            sort: [1767225600000],
          },
          {
            _id: 'rev-z',
            _index: '.ds-ai-index-ds-sample-000001',
            _source: { id: 'ki-1', '@timestamp': '2025-12-31T00:00:00.000Z', title: 'older' },
            sort: [1767139200000],
          },
        ],
      },
    });

    await expect(
      getKi(esClient, {
        aiIndexId: 'sample',
        dest: { type: 'data_stream', value: 'ai-index-ds-sample' },
        index: '.ds-ai-index-ds-sample-000001',
        kiId: 'ki-1',
      })
    ).resolves.toEqual({
      id: 'ki-1',
      document: { id: 'ki-1', '@timestamp': '2026-01-01T00:00:00Z', title: 'B' },
    });
    expect(search).toHaveBeenCalledWith(expect.objectContaining({ size: 10 }));
  });

  it('throws KiNotFoundError when the current revision is deleted', async () => {
    search.mockResolvedValue({
      hits: {
        hits: [
          {
            _id: 'generated-es-id',
            _index: '.ds-ai-index-ds-sample-000001',
            _source: {
              id: 'ki-1',
              type: 'playbook',
              governance: { lifecycle: { status: 'deleted' } },
            },
          },
        ],
      },
    });

    await expect(
      getKi(esClient, {
        aiIndexId: 'sample',
        dest: { type: 'data_stream', value: 'ai-index-ds-sample' },
        index: '.ds-ai-index-ds-sample-000001',
        kiId: 'ki-1',
      })
    ).rejects.toThrow(new KiNotFoundError('sample', 'ki-1'));
  });

  it('resolves a data stream KI by its id field and returns that id', async () => {
    search.mockResolvedValue({
      hits: {
        hits: [
          {
            _id: 'generated-es-id',
            _index: '.ds-ai-index-ds-sample-000001',
            _source: { id: 'ki-1', type: 'playbook', title: 'Latest revision' },
          },
        ],
      },
    });

    await expect(
      getKi(esClient, {
        aiIndexId: 'sample',
        dest: { type: 'data_stream', value: 'ai-index-ds-sample' },
        index: '.ds-ai-index-ds-sample-000001',
        kiId: 'ki-1',
      })
    ).resolves.toEqual({
      id: 'ki-1',
      document: { id: 'ki-1', type: 'playbook', title: 'Latest revision' },
    });
    expect(search).toHaveBeenCalledWith(
      expect.objectContaining({
        index: 'ai-index-ds-sample',
        query: { bool: { filter: [kiIdQuery('ki-1')] } },
      })
    );
  });

  it('throws KiNotFoundError when the document is missing', async () => {
    search.mockResolvedValue({
      hits: {
        hits: [],
      },
    });

    await expect(
      getKi(esClient, {
        aiIndexId: 'sample',
        dest: { type: 'index', value: DEST_VALUE },
        index: BACKING_INDEX,
        kiId: 'missing',
      })
    ).rejects.toThrow(new KiNotFoundError('sample', 'missing'));
  });

  it('throws KiNotFoundError when the index is outside the AI index dest', async () => {
    search.mockResolvedValue({
      hits: {
        hits: [],
      },
    });

    await expect(
      getKi(esClient, {
        aiIndexId: 'sample',
        dest: { type: 'index', value: DEST_VALUE },
        index: 'other-index',
        kiId: 'ki-1',
      })
    ).rejects.toThrow(new KiNotFoundError('sample', 'ki-1'));
  });

  it('disambiguates the same id across backing indices within the dest', async () => {
    search.mockResolvedValue({
      hits: {
        hits: [
          {
            _id: 'ki-1',
            _index: 'idx-b',
            _source: { type: 'playbook', title: 'B' },
          },
        ],
      },
    });

    await expect(
      getKi(esClient, {
        aiIndexId: 'sample',
        dest: { type: 'index', value: 'ai-index-idx-*' },
        index: 'idx-b',
        kiId: 'ki-1',
      })
    ).resolves.toEqual({
      id: 'ki-1',
      document: { type: 'playbook', title: 'B' },
    });

    expect(search).toHaveBeenCalledWith(
      expect.objectContaining({
        index: 'ai-index-idx-*',
        query: {
          bool: {
            filter: [kiIdQuery('ki-1'), { term: { _index: 'idx-b' } }],
          },
        },
      })
    );
  });
});
