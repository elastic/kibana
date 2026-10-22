/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { AiIndexDest } from '../../common/http_api/ai_indices';
import { appendKiRevision, writeKiRevision, type KiRevision, type StoredKi } from './ki_revision';
import { mockKiWriter } from '../step_types/test_utils';

const dest: AiIndexDest = { type: 'data_stream', value: 'ai-index-ds-my-ai-index' };
const aiIndexId = 'my-ai-index';
const kiId = 'ki-1';
const backingIndex = '.ds-ai-index-ds-my-ai-index-000001';

const storedKi: StoredKi = {
  type: 'index_metadata',
  title: 'logs-* index profile',
  id: kiId,
};

const changes = {
  updated_at: '2026-03-20T12:00:00.000Z',
  governance: { provenance: { updated_by: mockKiWriter } },
};

describe('appendKiRevision', () => {
  it('indexes with wait_for refresh when refresh is true', async () => {
    const esClient = {
      index: jest.fn().mockResolvedValue({ _id: 'written-rev' }),
    } as unknown as ElasticsearchClient;

    await appendKiRevision({
      esClient,
      destValue: dest.value,
      kiId,
      source: storedKi,
      changes,
      refresh: true,
    });

    expect(esClient.index).toHaveBeenCalledWith(
      expect.objectContaining({
        index: dest.value,
        op_type: 'create',
        refresh: 'wait_for',
        document: expect.objectContaining({
          id: kiId,
          '@timestamp': changes.updated_at,
        }),
      }),
      { signal: undefined }
    );
  });

  it('omits refresh when refresh is false', async () => {
    const esClient = {
      index: jest.fn().mockResolvedValue({ _id: 'written-rev' }),
    } as unknown as ElasticsearchClient;

    await appendKiRevision({
      esClient,
      destValue: dest.value,
      kiId,
      source: storedKi,
      changes,
      refresh: false,
    });

    expect(esClient.index).toHaveBeenCalledWith(
      expect.not.objectContaining({ refresh: 'wait_for' }),
      { signal: undefined }
    );
  });
});

describe('writeKiRevision data_stream', () => {
  const revision: KiRevision = {
    index: backingIndex,
    documentId: kiId,
    source: storedKi,
  };

  it('returns updated and appends without calling update', async () => {
    const esClient = {
      index: jest.fn().mockResolvedValue({ _id: 'written-rev' }),
      update: jest.fn(),
    } as unknown as ElasticsearchClient;

    const result = await writeKiRevision({
      esClient,
      aiIndexId,
      dest,
      kiId,
      revision,
      changes,
    });

    expect(result).toEqual({ result: 'updated' });
    expect(esClient.update).not.toHaveBeenCalled();
    expect(esClient.index).toHaveBeenCalled();
  });
});
