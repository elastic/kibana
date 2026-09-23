/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { getKi } from './ki_get';
import { KiNotFoundError } from './errors';

const DEST_VALUE = 'ai-index-idx-sample*';
const BACKING_INDEX = 'ai-index-idx-sample';

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
        destValue: DEST_VALUE,
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
          filter: [{ ids: { values: ['ki-1'] } }, { term: { _index: BACKING_INDEX } }],
        },
      },
      size: 1,
    });
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
        destValue: DEST_VALUE,
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
        destValue: DEST_VALUE,
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
        destValue: 'ai-index-idx-*',
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
            filter: [{ ids: { values: ['ki-1'] } }, { term: { _index: 'idx-b' } }],
          },
        },
      })
    );
  });
});
