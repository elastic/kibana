/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { AuditLogger } from '@kbn/core-security-server';
import type { AiIndexHttpItem } from '../../common/http_api/ai_indices';
import { buildAiIndexSpaceFilter } from '../../common/space_filter';
import type { MemoryWriter, StoredMemoryDocument } from './memory_document';
import { AiIndexMemoryWriteService, type ReviseMemoryRequest } from './memory_write_service';
import { MemoryWriteError } from './memory_write_errors';
import { kiIdQuery } from './ki_get';

const indexAiIndex: AiIndexHttpItem = {
  id: 'support',
  dest: { type: 'index', value: 'ai-index-idx-support' },
  managed: false,
  memory_enabled: true,
  automations: [],
  sources: [],
  traces: [],
  date_created: '2026-01-01T00:00:00.000Z',
  date_modified: '2026-01-01T00:00:00.000Z',
};

const existingDocument: StoredMemoryDocument = {
  '@timestamp': '2026-09-01T00:00:00.000Z',
  id: 'memory-1',
  type: 'memory.session_fact',
  title: 'Old title',
  description: 'Old description',
  content: 'Old content',
  tags: ['existing'],
  updated_at: '2026-09-01T00:00:00.000Z',
  references: [{ uri: 'api://source', relation: 'derived_from' }],
  attributes: { existing: true },
  permissions: { kibana: { privileges: [{ space: 'space-1' }] } },
  governance: {
    provenance: {
      created_by: {
        uri: 'tool://platform.context_engine.remember',
        metadata: { run_id: 'run-0' },
      },
    },
  },
};

describe('AiIndexMemoryWriteService', () => {
  const search = jest.fn();
  const index = jest.fn();
  const esClient = { search, index } as unknown as ElasticsearchClient;
  const aiIndexService = { get: jest.fn() };
  const isMemoryEnabled = jest.fn();
  const auditLogger = { log: jest.fn() } as unknown as jest.Mocked<AuditLogger>;
  const writer: MemoryWriter = {
    uri: 'tool://platform.context_engine.remember',
    metadata: { run_id: 'run-1', agent_id: 'agent-1' },
  };
  const request = {
    aiIndexId: 'support',
    sessionId: 'conversation-1',
    type: 'memory.session_fact' as const,
    title: 'Duration mapping',
    description: 'duration_ms is a keyword and must be cast.',
    content: 'Use TO_DOUBLE(duration_ms) before numeric comparisons.',
    writer,
    references: [
      {
        uri: 'conversation://conversation-1',
        relation: 'derived_from',
        description: 'The Agent Builder conversation where this memory was recorded.',
      },
    ],
  };
  const service = new AiIndexMemoryWriteService({
    esClient,
    spaceId: 'space-1',
    auditLogger,
    aiIndexService,
    isMemoryEnabled,
    generateId: () => 'logical-memory-id',
    generateSessionId: () => 'generated-session-id',
    generateRevisionId: () => 'revision-id',
    getCurrentDate: () => new Date('2026-09-24T12:00:00.000Z'),
  });

  const useDataStreamDestination = () =>
    aiIndexService.get.mockResolvedValue({
      ...indexAiIndex,
      dest: { type: 'data_stream', value: 'ai-index-ds-support' },
    });

  const mockCurrentMemory = ({
    id = 'physical-memory-id',
    indexName = 'ai-index-idx-support',
    source = existingDocument,
    sort,
    includeConcurrency = true,
  }: {
    id?: string;
    indexName?: string;
    source?: StoredMemoryDocument & { custom_field?: string };
    sort?: string[];
    includeConcurrency?: boolean;
  } = {}) =>
    search.mockResolvedValue({
      hits: {
        hits: [
          {
            _id: id,
            _index: indexName,
            ...(includeConcurrency ? { _seq_no: 7, _primary_term: 2 } : {}),
            _source: source,
            ...(sort ? { sort } : {}),
          },
        ],
      },
    });

  const reviseMemory = (overrides: Partial<ReviseMemoryRequest> = {}) =>
    service.reviseMemory({ ...request, id: 'memory-1', ...overrides });
  const forgetMemory = (memoryWriter = writer) =>
    service.forgetMemory({ aiIndexId: 'support', id: 'memory-1', writer: memoryWriter });
  const getIndexedDocument = (call = 0) => index.mock.calls[call][0].document;

  beforeEach(() => {
    jest.clearAllMocks();
    isMemoryEnabled.mockResolvedValue(true);
    aiIndexService.get.mockResolvedValue(indexAiIndex);
    index.mockResolvedValue({});
    search.mockResolvedValue({ hits: { hits: [] } });
  });

  it('creates a Memory with generated identity, expiry, references, and provenance', async () => {
    await expect(service.createMemory(request)).resolves.toEqual({
      id: 'logical-memory-id',
      sessionId: 'conversation-1',
    });

    expect(aiIndexService.get).toHaveBeenCalledWith('support', 'space-1');
    expect(index).toHaveBeenCalledWith({
      index: 'ai-index-idx-support',
      id: 'logical-memory-id',
      document: {
        '@timestamp': '2026-09-24T12:00:00.000Z',
        id: 'logical-memory-id',
        type: 'memory.session_fact',
        title: request.title,
        description: request.description,
        content: request.content,
        expires_at: '2026-12-23T12:00:00.000Z',
        updated_at: '2026-09-24T12:00:00.000Z',
        references: request.references,
        attributes: { 'memory.session_id': 'conversation-1' },
        governance: {
          provenance: {
            created_by: writer,
            updated_by: writer,
          },
        },
      },
      op_type: 'create',
      refresh: 'wait_for',
    });
    expect(auditLogger.log).toHaveBeenCalledWith(
      expect.objectContaining({
        event: expect.objectContaining({
          action: 'context_engine_memory_create',
          outcome: 'success',
        }),
      })
    );
  });

  it('generates a session when create omits it', async () => {
    const { sessionId: _, ...requestWithoutSession } = request;

    await expect(service.createMemory(requestWithoutSession)).resolves.toEqual({
      id: 'logical-memory-id',
      sessionId: 'generated-session-id',
    });
    expect(index).toHaveBeenCalledWith(
      expect.objectContaining({
        document: expect.objectContaining({
          attributes: { 'memory.session_id': 'generated-session-id' },
        }),
      })
    );
  });

  it('creates a data-stream Memory with a unique physical revision ID', async () => {
    useDataStreamDestination();

    await service.createMemory(request);

    expect(index).toHaveBeenCalledWith(
      expect.objectContaining({
        index: 'ai-index-ds-support',
        id: 'memory-revision-revision-id',
        op_type: 'create',
      })
    );
  });

  it('normalizes explicit expiry and supports non-expiring Memory', async () => {
    await service.createMemory({ ...request, expiresAt: '2026-10-01T03:00:00+03:00' });
    expect(index.mock.calls[0][0].document.expires_at).toBe('2026-10-01T00:00:00.000Z');

    index.mockClear();
    await service.createMemory({ ...request, expiresAt: null });
    expect(index.mock.calls[0][0].document).not.toHaveProperty('expires_at');
  });

  it('accepts an expiry in the past', async () => {
    await service.createMemory({ ...request, expiresAt: '2020-01-01T00:00:00Z' });

    expect(index.mock.calls[0][0].document.expires_at).toBe('2020-01-01T00:00:00.000Z');
  });

  it.each([
    [
      'global Memory is disabled',
      () => isMemoryEnabled.mockResolvedValue(false),
      'memory_disabled',
      'Context Engine memory is not enabled.',
    ],
    [
      'the AI index does not enable Memory',
      () => aiIndexService.get.mockResolvedValue({ ...indexAiIndex, memory_enabled: false }),
      'ai_index_memory_disabled',
      "AI index 'support' does not have memory enabled.",
    ],
    [
      'the destination is an index pattern',
      () =>
        aiIndexService.get.mockResolvedValue({
          ...indexAiIndex,
          dest: { type: 'index', value: 'ai-index-idx-*' },
        }),
      'destination_not_writable',
      "AI index 'support' uses an index pattern and cannot accept memory writes.",
    ],
  ])('rejects writes when %s', async (_, arrange, code, message) => {
    arrange();

    await expect(service.createMemory(request)).rejects.toMatchObject({
      name: 'MemoryWriteError',
      code,
      message,
    });
    expect(index).not.toHaveBeenCalled();
    if (code === 'memory_disabled') {
      expect(aiIndexService.get).not.toHaveBeenCalled();
    }
  });

  it('revises an index-backed Memory in place with OCC and preserved fields', async () => {
    mockCurrentMemory({
      indexName: 'ai-index-idx-support-000001',
      source: { ...existingDocument, custom_field: 'preserved' },
    });

    await expect(reviseMemory()).resolves.toEqual({
      id: 'memory-1',
      sessionId: 'conversation-1',
    });

    expect(search).toHaveBeenCalledWith(
      expect.objectContaining({
        allow_partial_search_results: false,
        query: {
          bool: {
            filter: [kiIdQuery('memory-1'), buildAiIndexSpaceFilter('space-1')],
          },
        },
        seq_no_primary_term: true,
        size: 2,
      })
    );
    expect(index).toHaveBeenCalledWith(
      expect.objectContaining({
        index: 'ai-index-idx-support-000001',
        id: 'physical-memory-id',
        if_seq_no: 7,
        if_primary_term: 2,
        document: expect.objectContaining({
          '@timestamp': existingDocument['@timestamp'],
          tags: ['existing'],
          references: request.references,
          permissions: existingDocument.permissions,
          custom_field: 'preserved',
          attributes: {
            existing: true,
            'memory.session_id': 'conversation-1',
          },
          governance: {
            provenance: {
              created_by: existingDocument.governance?.provenance?.created_by,
              updated_by: writer,
            },
          },
        }),
      })
    );
  });

  it('preserves references when a revision does not supply replacements', async () => {
    mockCurrentMemory({ indexName: 'ai-index-idx-support-000001' });

    const { references: _, ...requestWithoutReferences } = request;
    await service.reviseMemory({ ...requestWithoutReferences, id: 'memory-1' });

    expect(getIndexedDocument()).toMatchObject({ references: existingDocument.references });
  });

  it('preserves omitted content fields during a partial revision', async () => {
    mockCurrentMemory();

    await service.reviseMemory({
      aiIndexId: 'support',
      id: 'memory-1',
      title: 'Updated title',
      writer,
    });

    expect(getIndexedDocument()).toMatchObject({
      type: existingDocument.type,
      title: 'Updated title',
      description: existingDocument.description,
      content: existingDocument.content,
    });
  });

  it('preserves expiry and session when a revision omits them', async () => {
    mockCurrentMemory({
      source: {
        ...existingDocument,
        expires_at: '2027-01-01T00:00:00.000Z',
        attributes: {
          ...existingDocument.attributes,
          'memory.session_id': 'existing-session',
        },
      },
    });
    const { sessionId: _, ...requestWithoutSession } = request;

    await expect(
      service.reviseMemory({ ...requestWithoutSession, id: 'memory-1' })
    ).resolves.toEqual({
      id: 'memory-1',
      sessionId: 'existing-session',
    });
    expect(getIndexedDocument()).toMatchObject({
      expires_at: '2027-01-01T00:00:00.000Z',
      attributes: { 'memory.session_id': 'existing-session' },
    });
  });

  it('preserves non-expiring state when a revision omits expiry', async () => {
    mockCurrentMemory();

    await reviseMemory();

    expect(getIndexedDocument()).not.toHaveProperty('expires_at');
  });

  it('allows expired memories to be revised or forgotten', async () => {
    mockCurrentMemory({
      source: {
        ...existingDocument,
        expires_at: '2020-01-01T00:00:00.000Z',
      },
    });

    await reviseMemory();
    await forgetMemory();

    expect(index).toHaveBeenCalledTimes(2);
    expect(getIndexedDocument()).toMatchObject({
      expires_at: '2020-01-01T00:00:00.000Z',
    });
    expect(getIndexedDocument(1)).toMatchObject({
      governance: { lifecycle: { status: 'deleted' } },
    });
  });

  it('generates a session when a revision omits it and the memory has none', async () => {
    mockCurrentMemory();
    const { sessionId: _, ...requestWithoutSession } = request;

    await expect(
      service.reviseMemory({ ...requestWithoutSession, id: 'memory-1' })
    ).resolves.toEqual({
      id: 'memory-1',
      sessionId: 'generated-session-id',
    });
  });

  it('uses the current time for a data-stream revision when it is newer than the parent', async () => {
    useDataStreamDestination();
    mockCurrentMemory({
      id: 'parent',
      indexName: '.ds-ai-index-ds-support-000001',
    });

    await reviseMemory({ tags: [] });

    expect(search).toHaveBeenCalledWith(
      expect.objectContaining({
        allow_partial_search_results: false,
        query: {
          bool: {
            filter: [kiIdQuery('memory-1'), buildAiIndexSpaceFilter('space-1')],
          },
        },
        sort: [{ '@timestamp': { order: 'desc', unmapped_type: 'date' } }],
        size: 11,
      })
    );
    expect(index).toHaveBeenCalledWith(
      expect.objectContaining({
        index: 'ai-index-ds-support',
        id: 'memory-revision-revision-id',
        op_type: 'create',
        document: expect.objectContaining({
          '@timestamp': '2026-09-24T12:00:00.000Z',
          tags: [],
        }),
      })
    );
  });

  it('uses the greatest document ID when data-stream revisions share a timestamp', async () => {
    useDataStreamDestination();
    search.mockResolvedValue({
      hits: {
        hits: [
          {
            _id: '~1-a',
            _index: '.ds-ai-index-ds-support-000001',
            _source: existingDocument,
            sort: [existingDocument['@timestamp']],
          },
          {
            _id: '~2-b',
            _index: '.ds-ai-index-ds-support-000001',
            _source: {
              ...existingDocument,
              governance: { lifecycle: { status: 'deleted' } },
            },
            sort: [existingDocument['@timestamp']],
          },
        ],
      },
    });

    await expect(reviseMemory()).rejects.toMatchObject({
      code: 'memory_deleted',
    });
    expect(index).not.toHaveBeenCalled();
  });

  it('fails closed when the data-stream revision tie window is exhausted', async () => {
    useDataStreamDestination();
    search.mockResolvedValue({
      hits: {
        hits: Array.from({ length: 11 }, (_, revision) => ({
          _id: `revision-${revision}`,
          _index: '.ds-ai-index-ds-support-000001',
          _source: existingDocument,
          sort: [existingDocument['@timestamp']],
        })),
      },
    });

    await expect(reviseMemory()).rejects.toMatchObject({
      code: 'revision_tie_window_exceeded',
    });
    expect(index).not.toHaveBeenCalled();
  });

  it.each([
    ['matches the current clock', '~1-a', '2026-09-24T12:00:00.000Z', '2026-09-24T12:00:00.001Z'],
    ['is ahead of the clock', 'parent', '2026-09-25T12:00:00.000Z', '2026-09-25T12:00:00.001Z'],
  ])(
    'keeps data-stream revision timestamps monotonic when the parent %s',
    async (_, id, parentTimestamp, expectedTimestamp) => {
      useDataStreamDestination();
      mockCurrentMemory({
        id,
        indexName: '.ds-ai-index-ds-support-000001',
        source: { ...existingDocument, '@timestamp': parentTimestamp },
        sort: [parentTimestamp],
      });

      await reviseMemory();

      expect(index.mock.calls[0][0].id).toBe('memory-revision-revision-id');
      expect(getIndexedDocument()).toMatchObject({
        '@timestamp': expectedTimestamp,
        updated_at: '2026-09-24T12:00:00.000Z',
      });
    }
  );

  it('rejects a data-stream revision whose parent has an invalid timestamp', async () => {
    useDataStreamDestination();
    mockCurrentMemory({
      id: 'parent',
      indexName: '.ds-ai-index-ds-support-000001',
      source: { ...existingDocument, '@timestamp': 'not-a-date' },
      sort: ['not-a-date'],
    });

    await expect(reviseMemory()).rejects.toMatchObject({
      code: 'invalid_memory_timestamp',
    });
    expect(index).not.toHaveBeenCalled();
  });

  it.each([
    [
      'missing Memory',
      { hits: { hits: [] } },
      'memory_not_found',
      "Memory 'memory-1' was not found in AI index 'support'.",
    ],
    [
      'duplicate Memory',
      {
        hits: {
          hits: [
            { _id: 'one', _index: 'one', _source: existingDocument },
            { _id: 'two', _index: 'two', _source: existingDocument },
          ],
        },
      },
      'duplicate_memory',
      "Memory 'memory-1' exists in multiple indices matched by AI index 'support'.",
    ],
    [
      'non-Memory document',
      {
        hits: {
          hits: [
            {
              _id: 'physical-memory-id',
              _index: 'one',
              _source: { ...existingDocument, type: 'index_metadata' },
            },
          ],
        },
      },
      'not_a_memory',
      "Document 'memory-1' in AI index 'support' is not a memory.",
    ],
  ])('returns a typed error for %s', async (_, response, code, message) => {
    search.mockResolvedValue(response);

    await expect(reviseMemory()).rejects.toMatchObject({
      code,
      message,
    });
  });

  it('rejects type changes and tombstoned revisions', async () => {
    search.mockResolvedValue({
      hits: {
        hits: [
          {
            _id: 'physical-memory-id',
            _index: 'one',
            _source: { ...existingDocument, type: 'memory.session' },
          },
        ],
      },
    });
    await expect(reviseMemory()).rejects.toThrow(
      "Memory 'memory-1' has type 'memory.session' and cannot be revised as 'memory.session_fact'."
    );

    search.mockResolvedValue({
      hits: {
        hits: [
          {
            _id: 'physical-memory-id',
            _index: 'one',
            _source: {
              ...existingDocument,
              governance: { lifecycle: { status: 'deleted' } },
            },
          },
        ],
      },
    });
    await expect(reviseMemory()).rejects.toThrow(
      "Memory 'memory-1' was deleted and cannot be revised."
    );
  });

  it('tombstones an index-backed Memory with provenance and OCC', async () => {
    mockCurrentMemory();
    const forgetWriter = {
      uri: 'tool://platform.context_engine.forget',
      metadata: { run_id: 'run-2' },
    };

    await expect(forgetMemory(forgetWriter)).resolves.toEqual({ id: 'memory-1' });

    expect(index).toHaveBeenCalledWith({
      index: 'ai-index-idx-support',
      id: 'physical-memory-id',
      if_seq_no: 7,
      if_primary_term: 2,
      document: {
        ...existingDocument,
        updated_at: '2026-09-24T12:00:00.000Z',
        governance: {
          provenance: {
            created_by: existingDocument.governance?.provenance?.created_by,
            updated_by: forgetWriter,
          },
          lifecycle: { status: 'deleted' },
        },
      },
      refresh: 'wait_for',
    });
  });

  it('appends a tombstone for a data-stream-backed Memory', async () => {
    useDataStreamDestination();
    mockCurrentMemory({
      id: 'parent',
      indexName: '.ds-ai-index-ds-support-000001',
    });
    const forgetWriter = {
      uri: 'tool://platform.context_engine.forget',
      metadata: { run_id: 'run-2' },
    };

    await forgetMemory(forgetWriter);

    expect(index).toHaveBeenCalledWith({
      index: 'ai-index-ds-support',
      id: 'memory-revision-revision-id',
      document: {
        ...existingDocument,
        '@timestamp': '2026-09-24T12:00:00.000Z',
        updated_at: '2026-09-24T12:00:00.000Z',
        governance: {
          provenance: {
            created_by: existingDocument.governance?.provenance?.created_by,
            updated_by: forgetWriter,
          },
          lifecycle: { status: 'deleted' },
        },
      },
      op_type: 'create',
      refresh: 'wait_for',
    });
  });

  it('is idempotent when forgetting an already tombstoned Memory', async () => {
    mockCurrentMemory({
      source: {
        ...existingDocument,
        governance: { lifecycle: { status: 'deleted' } },
      },
    });

    await expect(forgetMemory()).resolves.toEqual({ id: 'memory-1' });
    expect(index).not.toHaveBeenCalled();
  });

  it('fails without writing or successful audit when current-revision search fails', async () => {
    const searchError = new Error('partial search results are not allowed');
    search.mockRejectedValue(searchError);

    await expect(reviseMemory()).rejects.toBe(searchError);
    expect(index).not.toHaveBeenCalled();
    expect(auditLogger.log).toHaveBeenCalledWith(
      expect.objectContaining({
        event: expect.objectContaining({
          action: 'context_engine_memory_revise',
          outcome: 'failure',
        }),
      })
    );
  });

  it('uses a typed error for missing index concurrency metadata', async () => {
    mockCurrentMemory({ includeConcurrency: false });

    await expect(reviseMemory()).rejects.toEqual(
      new MemoryWriteError(
        'missing_concurrency_metadata',
        "Memory 'memory-1' is missing concurrency metadata."
      )
    );
    expect(auditLogger.log).toHaveBeenCalledWith(
      expect.objectContaining({
        event: expect.objectContaining({
          action: 'context_engine_memory_revise',
          outcome: 'failure',
        }),
      })
    );
  });
});
