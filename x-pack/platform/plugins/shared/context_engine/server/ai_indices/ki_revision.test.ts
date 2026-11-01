/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import type { DiagnosticResult } from '@elastic/elasticsearch';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { AiIndexDest } from '../../common/http_api/ai_indices';
import {
  appendKiRevision,
  putKiRevision,
  writeKiRevision,
  type KiRevision,
  type StoredKi,
} from './ki_revision';
import { KiConflictError, KiNotFoundError } from './errors';
import { mockKiWriter } from '../step_types/test_utils';

const createResponseError = (name: string, statusCode: number) =>
  new errors.ResponseError({
    meta: {
      aborted: false,
      attempts: 1,
      connection: null,
      context: null,
      name,
      request: {} as unknown as DiagnosticResult['meta']['request'],
    },
    warnings: [],
    body: name,
    statusCode,
  });

const dataStreamDest: AiIndexDest = { type: 'data_stream', value: 'ai-index-ds-my-ai-index' };
const indexDest: AiIndexDest = { type: 'index', value: 'ai-index-idx-my-ai-index' };
const aiIndexId = 'my-ai-index';
const kiId = 'ki-1';
const backingIndex = '.ds-ai-index-ds-my-ai-index-000001';
const pinnedBackingIndex = 'ai-index-idx-my-ai-index-000001';

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
      destValue: dataStreamDest.value,
      kiId,
      source: storedKi,
      changes,
      refresh: true,
    });

    expect(esClient.index).toHaveBeenCalledWith(
      expect.objectContaining({
        index: dataStreamDest.value,
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
      destValue: dataStreamDest.value,
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
      dest: dataStreamDest,
      kiId,
      revision,
      changes,
    });

    expect(result).toEqual({ result: 'updated' });
    expect(esClient.update).not.toHaveBeenCalled();
    expect(esClient.index).toHaveBeenCalled();
  });
});

describe('putKiRevision', () => {
  const document: StoredKi = { ...storedKi, updated_at: changes.updated_at };

  it('indexes a fresh document on an index dest without op_type when failIfExists is false', async () => {
    const esClient = {
      index: jest.fn().mockResolvedValue({}),
    } as unknown as ElasticsearchClient;

    await putKiRevision({
      esClient,
      aiIndexId,
      dest: indexDest,
      kiId,
      document,
    });

    expect(esClient.index).toHaveBeenCalledWith(
      {
        index: indexDest.value,
        id: kiId,
        document,
      },
      { signal: undefined }
    );
  });

  it('indexes a fresh document on an index dest with op_type create when failIfExists is true', async () => {
    const esClient = {
      index: jest.fn().mockResolvedValue({}),
    } as unknown as ElasticsearchClient;

    await putKiRevision({
      esClient,
      aiIndexId,
      dest: indexDest,
      kiId,
      document,
      failIfExists: true,
    });

    expect(esClient.index).toHaveBeenCalledWith(
      {
        index: indexDest.value,
        id: kiId,
        document,
        op_type: 'create',
      },
      { signal: undefined }
    );
  });

  it('overwrites an existing revision on an index dest with optimistic concurrency', async () => {
    const esClient = {
      index: jest.fn().mockResolvedValue({}),
    } as unknown as ElasticsearchClient;
    const existing = {
      index: pinnedBackingIndex,
      documentId: 'doc-1',
      seqNo: 5,
      primaryTerm: 2,
    };

    await putKiRevision({
      esClient,
      aiIndexId,
      dest: indexDest,
      kiId,
      document,
      existing,
    });

    expect(esClient.index).toHaveBeenCalledWith(
      {
        index: pinnedBackingIndex,
        id: 'doc-1',
        document,
        if_seq_no: 5,
        if_primary_term: 2,
      },
      { signal: undefined }
    );
  });

  it('always creates on a data stream dest without an id', async () => {
    const esClient = {
      index: jest.fn().mockResolvedValue({}),
    } as unknown as ElasticsearchClient;
    const existing = {
      index: backingIndex,
      documentId: kiId,
      seqNo: 1,
      primaryTerm: 1,
    };

    await putKiRevision({
      esClient,
      aiIndexId,
      dest: dataStreamDest,
      kiId,
      document,
      existing,
      failIfExists: false,
    });

    const indexCall = (esClient.index as jest.Mock).mock.calls[0][0];
    expect(indexCall).toEqual({
      index: backingIndex,
      document,
      op_type: 'create',
    });
    expect(indexCall).not.toHaveProperty('id');
  });

  it('throws KiNotFoundError when index returns 404', async () => {
    const esClient = {
      index: jest.fn().mockRejectedValue(createResponseError('index_not_found_exception', 404)),
    } as unknown as ElasticsearchClient;

    await expect(
      putKiRevision({
        esClient,
        aiIndexId,
        dest: indexDest,
        kiId,
        document,
      })
    ).rejects.toThrow(new KiNotFoundError(aiIndexId, kiId));
  });

  it('throws KiConflictError when index returns 409', async () => {
    const esClient = {
      index: jest
        .fn()
        .mockRejectedValue(createResponseError('version_conflict_engine_exception', 409)),
    } as unknown as ElasticsearchClient;

    await expect(
      putKiRevision({
        esClient,
        aiIndexId,
        dest: indexDest,
        kiId,
        document,
        failIfExists: true,
      })
    ).rejects.toThrow(new KiConflictError(aiIndexId, kiId));
  });
});
