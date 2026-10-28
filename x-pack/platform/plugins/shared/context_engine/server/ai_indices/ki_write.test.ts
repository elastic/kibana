/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import type { DiagnosticResult } from '@elastic/elasticsearch';
import type { ElasticsearchClient } from '@kbn/core/server';
import { kiIdQuery, REVISION_TIE_WINDOW } from './ki_get';
import { buildKiApiWriter, restoreKi, softDeleteKi, updateKi } from './ki_write';
import { KiConflictError, KiDeletedError, KiNotFoundError, KiValidationError } from './errors';

const storedKi = { type: 'index_metadata', title: 'logs-* index profile', id: 'ki-1' };
const deletedKi = { ...storedKi, governance: { lifecycle: { status: 'deleted' } } };
const searchHit = (index: string, source: object = storedKi) => ({
  hits: { hits: [{ _id: 'ki-1', _index: index, _seq_no: 5, _primary_term: 1, _source: source }] },
});

const apiWriter = buildKiApiWriter('update', 'default');
const deleteWriter = buildKiApiWriter('delete', 'marketing');

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
const createConflictResponseError = () =>
  createResponseError('version_conflict_engine_exception', 409);

const indexDest = { type: 'index' as const, value: 'ai-index-idx-my-ai-index' };
const dataStreamDest = { type: 'data_stream' as const, value: 'ai-index-ds-my-ai-index' };
const pinnedBackingIndex = 'ai-index-idx-my-ai-index-000001';

const expectEsRequest = (fn: jest.Mock, payload: unknown) => {
  expect(fn.mock.calls[0][0]).toEqual(payload);
};

describe('buildKiApiWriter', () => {
  it('builds a writer for update with the space id', () => {
    expect(buildKiApiWriter('update', 'default')).toEqual({
      uri: 'api://context_engine.ki.update',
      metadata: { space_id: 'default' },
    });
  });

  it('builds a writer for delete with the space id', () => {
    expect(buildKiApiWriter('delete', 'marketing')).toEqual({
      uri: 'api://context_engine.ki.delete',
      metadata: { space_id: 'marketing' },
    });
  });

  it('builds a writer for restore with the space id', () => {
    expect(buildKiApiWriter('restore', 'default')).toEqual({
      uri: 'api://context_engine.ki.restore',
      metadata: { space_id: 'default' },
    });
  });
});

describe('updateKi', () => {
  it('updates the KI in place on an index dest', async () => {
    const esClient = {
      search: jest.fn().mockResolvedValue(searchHit('ai-index-idx-my-ai-index')),
      update: jest.fn().mockResolvedValue({ result: 'updated' }),
    } as unknown as ElasticsearchClient;

    const result = await updateKi(esClient, {
      aiIndexId: 'my-ai-index',
      dest: indexDest,
      kiId: 'ki-1',
      ki: { content: 'Updated' },
      writer: apiWriter,
    });

    expect(result).toEqual({ id: 'ki-1', result: 'updated' });
    expectEsRequest(esClient.search as jest.Mock, {
      index: 'ai-index-idx-my-ai-index',
      ignore_unavailable: true,
      allow_no_indices: true,
      query: kiIdQuery('ki-1'),
      size: 2,
      seq_no_primary_term: true,
      _source: true,
    });
    expectEsRequest(esClient.update as jest.Mock, {
      index: 'ai-index-idx-my-ai-index',
      id: 'ki-1',
      doc: {
        content: 'Updated',
        updated_at: expect.any(String),
        governance: { provenance: { updated_by: apiWriter } },
      },
      if_seq_no: 5,
      if_primary_term: 1,
      refresh: 'wait_for',
    });
  });

  it('filters search by backing index when backingIndex is set', async () => {
    const esClient = {
      search: jest.fn().mockResolvedValue(searchHit(pinnedBackingIndex)),
      update: jest.fn().mockResolvedValue({ result: 'updated' }),
    } as unknown as ElasticsearchClient;

    await updateKi(esClient, {
      aiIndexId: 'my-ai-index',
      dest: indexDest,
      kiId: 'ki-1',
      ki: { content: 'Updated' },
      writer: apiWriter,
      backingIndex: pinnedBackingIndex,
    });

    expectEsRequest(esClient.search as jest.Mock, {
      index: 'ai-index-idx-my-ai-index',
      ignore_unavailable: true,
      allow_no_indices: true,
      query: {
        bool: {
          filter: [kiIdQuery('ki-1'), { term: { _index: pinnedBackingIndex } }],
        },
      },
      sort: [{ '@timestamp': { order: 'desc', unmapped_type: 'date' } }],
      size: REVISION_TIE_WINDOW,
      seq_no_primary_term: true,
      _source: true,
    });
  });

  it('appends a new revision on a data stream dest', async () => {
    const existing = {
      ...storedKi,
      '@timestamp': '2026-01-01T00:00:00.000Z',
      governance: {
        provenance: { created_by: { uri: 'workflow://wf-0', metadata: {} } },
        lifecycle: { status: 'active' },
      },
    };
    const esClient = {
      search: jest
        .fn()
        .mockResolvedValue(searchHit('.ds-ai-index-ds-my-ai-index-000001', existing)),
      index: jest.fn().mockResolvedValue({ _id: 'ki-1' }),
      update: jest.fn(),
    } as unknown as ElasticsearchClient;

    const result = await updateKi(esClient, {
      aiIndexId: 'my-ai-index',
      dest: dataStreamDest,
      kiId: 'ki-1',
      ki: { content: 'Updated' },
      writer: apiWriter,
    });

    expect(result).toEqual({ id: 'ki-1', result: 'updated' });
    expect(esClient.update).not.toHaveBeenCalled();
    expectEsRequest(esClient.index as jest.Mock, {
      index: 'ai-index-ds-my-ai-index',
      document: {
        ...storedKi,
        content: 'Updated',
        '@timestamp': expect.any(String),
        updated_at: expect.any(String),
        governance: {
          provenance: {
            created_by: { uri: 'workflow://wf-0', metadata: {} },
            updated_by: apiWriter,
          },
          lifecycle: { status: 'active' },
        },
      },
      op_type: 'create',
      refresh: 'wait_for',
    });
  });

  it('throws NotFoundError when the KI does not exist', async () => {
    const esClient = {
      search: jest.fn().mockResolvedValue({ hits: { hits: [] } }),
      update: jest.fn(),
    } as unknown as ElasticsearchClient;

    const thrown = await updateKi(esClient, {
      aiIndexId: 'my-ai-index',
      dest: indexDest,
      kiId: 'missing-ki',
      ki: { content: 'New title' },
      writer: apiWriter,
    }).catch((e) => e);

    expect(thrown).toBeInstanceOf(KiNotFoundError);
    expect(esClient.update).not.toHaveBeenCalled();
  });

  it('returns noop when submitted content already matches the stored KI', async () => {
    const storedWithContent = { ...storedKi, content: 'Same content' };
    const esClient = {
      search: jest.fn().mockResolvedValue(searchHit('ai-index-idx-my-ai-index', storedWithContent)),
      update: jest.fn(),
      index: jest.fn(),
    } as unknown as ElasticsearchClient;

    const result = await updateKi(esClient, {
      aiIndexId: 'my-ai-index',
      dest: indexDest,
      kiId: 'ki-1',
      ki: { content: 'Same content' },
      writer: apiWriter,
    });

    expect(result).toEqual({ id: 'ki-1', result: 'noop' });
    expect(esClient.update).not.toHaveBeenCalled();
    expect(esClient.index).not.toHaveBeenCalled();
  });

  it('writes when an array field is narrowed, not treating it as a noop', async () => {
    const storedWithTags = { ...storedKi, tags: ['keep', 'remove'] };
    const esClient = {
      search: jest.fn().mockResolvedValue(searchHit('ai-index-idx-my-ai-index', storedWithTags)),
      update: jest.fn().mockResolvedValue({ result: 'updated' }),
    } as unknown as ElasticsearchClient;

    const result = await updateKi(esClient, {
      aiIndexId: 'my-ai-index',
      dest: indexDest,
      kiId: 'ki-1',
      ki: { tags: ['keep'] },
      writer: apiWriter,
    });

    expect(result).toEqual({ id: 'ki-1', result: 'updated' });
    expect(esClient.update).toHaveBeenCalled();
  });

  it('throws ConflictError when the update loses the revision check', async () => {
    const esClient = {
      search: jest.fn().mockResolvedValue(searchHit('ai-index-idx-my-ai-index')),
      update: jest.fn().mockRejectedValue(createConflictResponseError()),
    } as unknown as ElasticsearchClient;

    const thrown = await updateKi(esClient, {
      aiIndexId: 'my-ai-index',
      dest: indexDest,
      kiId: 'ki-1',
      ki: { content: 'New title' },
      writer: apiWriter,
    }).catch((e) => e);

    expect(thrown).toBeInstanceOf(KiConflictError);
  });

  it('throws ConflictError when the KI has lifecycle status deleted', async () => {
    const esClient = {
      search: jest.fn().mockResolvedValue(searchHit('ai-index-idx-my-ai-index', deletedKi)),
      update: jest.fn(),
    } as unknown as ElasticsearchClient;

    const thrown = await updateKi(esClient, {
      aiIndexId: 'my-ai-index',
      dest: indexDest,
      kiId: 'ki-1',
      ki: { content: 'Updated' },
      writer: apiWriter,
    }).catch((e) => e);

    expect(thrown).toBeInstanceOf(KiDeletedError);
    expect(thrown.message).toContain('restore the deleted KI before updating it');
    expect(esClient.update).not.toHaveBeenCalled();
  });

  it('updates the newest revision when the pinned backing index holds duplicate logical ids', async () => {
    // A stale revision (e.g. left behind by a buggy writer) and the current one share `id`
    // but have different `_id`s; the current one is the one with the newest `@timestamp`.
    const esClient = {
      search: jest.fn().mockResolvedValue({
        hits: {
          hits: [
            {
              _id: 'ki-1',
              _index: pinnedBackingIndex,
              _seq_no: 9,
              _primary_term: 1,
              sort: ['2026-02-01T00:00:00.000Z'],
              _source: storedKi,
            },
            {
              _id: 'autogenerated-id',
              _index: pinnedBackingIndex,
              _seq_no: 5,
              _primary_term: 1,
              sort: ['2026-01-01T00:00:00.000Z'],
              _source: storedKi,
            },
          ],
        },
      }),
      update: jest.fn().mockResolvedValue({ result: 'updated' }),
    } as unknown as ElasticsearchClient;

    await updateKi(esClient, {
      aiIndexId: 'my-ai-index',
      dest: indexDest,
      kiId: 'ki-1',
      ki: { content: 'Updated' },
      writer: apiWriter,
      backingIndex: pinnedBackingIndex,
    });

    expect(esClient.update).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'ki-1', if_seq_no: 9, if_primary_term: 1 }),
      expect.anything()
    );
  });

  it('throws ValidationError when the KI is ambiguous across backing indices and no index is pinned', async () => {
    const esClient = {
      search: jest.fn().mockResolvedValue({
        hits: {
          hits: [
            { _id: 'ki-1', _index: 'ai-index-idx-my-ai-index-000001', _source: storedKi },
            { _id: 'ki-1', _index: 'ai-index-idx-my-ai-index-000002', _source: storedKi },
          ],
        },
      }),
      update: jest.fn(),
    } as unknown as ElasticsearchClient;

    const thrown = await updateKi(esClient, {
      aiIndexId: 'my-ai-index',
      dest: indexDest,
      kiId: 'ki-1',
      ki: { content: 'Updated' },
      writer: apiWriter,
    }).catch((e) => e);

    expect(thrown).toBeInstanceOf(KiValidationError);
    expect(esClient.update).not.toHaveBeenCalled();
  });
});

describe('softDeleteKi', () => {
  it('tombstones the KI in place on an index dest', async () => {
    const esClient = {
      search: jest.fn().mockResolvedValue(searchHit('ai-index-idx-my-ai-index')),
      update: jest.fn().mockResolvedValue({ result: 'updated' }),
      delete: jest.fn(),
    } as unknown as ElasticsearchClient;

    const result = await softDeleteKi(esClient, {
      aiIndexId: 'my-ai-index',
      dest: indexDest,
      kiId: 'ki-1',
      writer: deleteWriter,
    });

    expect(result).toEqual({ id: 'ki-1' });
    expect(esClient.delete).not.toHaveBeenCalled();
    expectEsRequest(esClient.update as jest.Mock, {
      index: 'ai-index-idx-my-ai-index',
      id: 'ki-1',
      doc: {
        updated_at: expect.any(String),
        governance: {
          provenance: { updated_by: deleteWriter },
          lifecycle: { status: 'deleted' },
        },
      },
      if_seq_no: 5,
      if_primary_term: 1,
      refresh: 'wait_for',
    });
  });

  it('filters search by backing index when backingIndex is set', async () => {
    const esClient = {
      search: jest.fn().mockResolvedValue(searchHit(pinnedBackingIndex)),
      update: jest.fn().mockResolvedValue({ result: 'updated' }),
    } as unknown as ElasticsearchClient;

    await softDeleteKi(esClient, {
      aiIndexId: 'my-ai-index',
      dest: indexDest,
      kiId: 'ki-1',
      writer: deleteWriter,
      backingIndex: pinnedBackingIndex,
    });

    expectEsRequest(esClient.search as jest.Mock, {
      index: 'ai-index-idx-my-ai-index',
      ignore_unavailable: true,
      allow_no_indices: true,
      query: {
        bool: {
          filter: [kiIdQuery('ki-1'), { term: { _index: pinnedBackingIndex } }],
        },
      },
      sort: [{ '@timestamp': { order: 'desc', unmapped_type: 'date' } }],
      size: REVISION_TIE_WINDOW,
      seq_no_primary_term: true,
      _source: ['id', 'governance'],
    });
  });

  it('appends a tombstone revision on a data stream dest', async () => {
    const esClient = {
      search: jest.fn().mockResolvedValue(searchHit('.ds-ai-index-ds-my-ai-index-000001')),
      index: jest.fn().mockResolvedValue({ _id: 'ki-1' }),
      delete: jest.fn(),
    } as unknown as ElasticsearchClient;

    const result = await softDeleteKi(esClient, {
      aiIndexId: 'my-ai-index',
      dest: dataStreamDest,
      kiId: 'ki-1',
      writer: deleteWriter,
    });

    expect(result).toEqual({ id: 'ki-1' });
    expect(esClient.delete).not.toHaveBeenCalled();
    expectEsRequest(esClient.index as jest.Mock, {
      index: 'ai-index-ds-my-ai-index',
      document: {
        ...storedKi,
        '@timestamp': expect.any(String),
        updated_at: expect.any(String),
        governance: {
          provenance: { updated_by: deleteWriter },
          lifecycle: { status: 'deleted' },
        },
      },
      op_type: 'create',
      refresh: 'wait_for',
    });
  });

  it('returns idempotently when the KI is already deleted', async () => {
    const esClient = {
      search: jest.fn().mockResolvedValue(searchHit('ai-index-idx-my-ai-index', deletedKi)),
      update: jest.fn(),
      index: jest.fn(),
    } as unknown as ElasticsearchClient;

    const result = await softDeleteKi(esClient, {
      aiIndexId: 'my-ai-index',
      dest: indexDest,
      kiId: 'ki-1',
      writer: deleteWriter,
    });

    expect(result).toEqual({ id: 'ki-1' });
    expect(esClient.update).not.toHaveBeenCalled();
    expect(esClient.index).not.toHaveBeenCalled();
  });

  it('throws NotFoundError when the KI does not exist', async () => {
    const esClient = {
      search: jest.fn().mockResolvedValue({ hits: { hits: [] } }),
      update: jest.fn(),
      index: jest.fn(),
    } as unknown as ElasticsearchClient;

    const thrown = await softDeleteKi(esClient, {
      aiIndexId: 'my-ai-index',
      dest: indexDest,
      kiId: 'missing-ki',
      writer: deleteWriter,
    }).catch((e) => e);

    expect(thrown).toBeInstanceOf(KiNotFoundError);
    expect(esClient.update).not.toHaveBeenCalled();
    expect(esClient.index).not.toHaveBeenCalled();
  });
});

describe('restoreKi', () => {
  it('restores the KI in place on an index dest', async () => {
    const esClient = {
      search: jest.fn().mockResolvedValue(searchHit('ai-index-idx-my-ai-index', deletedKi)),
      update: jest.fn().mockResolvedValue({ result: 'updated' }),
      delete: jest.fn(),
    } as unknown as ElasticsearchClient;

    const result = await restoreKi(esClient, {
      aiIndexId: 'my-ai-index',
      dest: indexDest,
      kiId: 'ki-1',
      writer: apiWriter,
    });

    expect(result).toEqual({ id: 'ki-1' });
    expect(esClient.delete).not.toHaveBeenCalled();
    expectEsRequest(esClient.update as jest.Mock, {
      index: 'ai-index-idx-my-ai-index',
      id: 'ki-1',
      doc: {
        updated_at: expect.any(String),
        governance: {
          provenance: { updated_by: apiWriter },
          lifecycle: { status: 'active' },
        },
      },
      if_seq_no: 5,
      if_primary_term: 1,
      refresh: 'wait_for',
    });
  });

  it('filters search by backing index when backingIndex is set', async () => {
    const esClient = {
      search: jest.fn().mockResolvedValue(searchHit(pinnedBackingIndex, deletedKi)),
      update: jest.fn().mockResolvedValue({ result: 'updated' }),
    } as unknown as ElasticsearchClient;

    await restoreKi(esClient, {
      aiIndexId: 'my-ai-index',
      dest: indexDest,
      kiId: 'ki-1',
      writer: apiWriter,
      backingIndex: pinnedBackingIndex,
    });

    expectEsRequest(esClient.search as jest.Mock, {
      index: 'ai-index-idx-my-ai-index',
      ignore_unavailable: true,
      allow_no_indices: true,
      query: {
        bool: {
          filter: [kiIdQuery('ki-1'), { term: { _index: pinnedBackingIndex } }],
        },
      },
      sort: [{ '@timestamp': { order: 'desc', unmapped_type: 'date' } }],
      size: REVISION_TIE_WINDOW,
      seq_no_primary_term: true,
      _source: ['id', 'governance'],
    });
  });

  it('appends a restore revision on a data stream dest', async () => {
    const esClient = {
      search: jest
        .fn()
        .mockResolvedValue(searchHit('.ds-ai-index-ds-my-ai-index-000001', deletedKi)),
      index: jest.fn().mockResolvedValue({ _id: 'ki-1' }),
      delete: jest.fn(),
    } as unknown as ElasticsearchClient;

    const result = await restoreKi(esClient, {
      aiIndexId: 'my-ai-index',
      dest: dataStreamDest,
      kiId: 'ki-1',
      writer: apiWriter,
    });

    expect(result).toEqual({ id: 'ki-1' });
    expect(esClient.delete).not.toHaveBeenCalled();
    expectEsRequest(esClient.index as jest.Mock, {
      index: 'ai-index-ds-my-ai-index',
      document: {
        ...storedKi,
        '@timestamp': expect.any(String),
        updated_at: expect.any(String),
        governance: {
          provenance: { updated_by: apiWriter },
          lifecycle: { status: 'active' },
        },
      },
      op_type: 'create',
      refresh: 'wait_for',
    });
  });

  it('returns idempotently when the KI is already active', async () => {
    const esClient = {
      search: jest.fn().mockResolvedValue(searchHit('ai-index-idx-my-ai-index')),
      update: jest.fn(),
      index: jest.fn(),
    } as unknown as ElasticsearchClient;

    const result = await restoreKi(esClient, {
      aiIndexId: 'my-ai-index',
      dest: indexDest,
      kiId: 'ki-1',
      writer: apiWriter,
    });

    expect(result).toEqual({ id: 'ki-1' });
    expect(esClient.update).not.toHaveBeenCalled();
    expect(esClient.index).not.toHaveBeenCalled();
  });

  it('throws NotFoundError when the KI does not exist', async () => {
    const esClient = {
      search: jest.fn().mockResolvedValue({ hits: { hits: [] } }),
      update: jest.fn(),
      index: jest.fn(),
    } as unknown as ElasticsearchClient;

    const thrown = await restoreKi(esClient, {
      aiIndexId: 'my-ai-index',
      dest: indexDest,
      kiId: 'missing-ki',
      writer: apiWriter,
    }).catch((e) => e);

    expect(thrown).toBeInstanceOf(KiNotFoundError);
    expect(esClient.update).not.toHaveBeenCalled();
    expect(esClient.index).not.toHaveBeenCalled();
  });
});
