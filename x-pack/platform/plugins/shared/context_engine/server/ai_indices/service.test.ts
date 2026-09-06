/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import type { DiagnosticResult } from '@elastic/elasticsearch';
import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { AiIndexService } from './service';
import {
  InvalidAiIndexDestError,
  AiIndexConflictError,
  AiIndexManagedError,
  AiIndexNotFoundError,
  AiIndexIdConflictError,
  AiIndexAlreadyExistsError,
} from './errors';
import type { AiIndexDocument, AiIndexStorageClient } from './storage';
import { createAiIndexStorageClient } from './storage';

jest.mock('./storage', () => ({
  ...jest.requireActual('./storage'),
  createAiIndexStorageClient: jest.fn(),
}));

const createAiIndexStorageClientMock = createAiIndexStorageClient as jest.Mock;

const createNotFoundError = () =>
  new errors.ResponseError({
    meta: {
      aborted: false,
      attempts: 1,
      connection: null,
      context: null,
      name: 'resource_not_found_exception',
      request: {} as unknown as DiagnosticResult['meta']['request'],
    },
    warnings: [],
    body: 'resource_not_found_exception',
    statusCode: 404,
  });

const createConflictError = () =>
  new errors.ResponseError({
    meta: {
      aborted: false,
      attempts: 1,
      connection: null,
      context: null,
      name: 'version_conflict_engine_exception',
      request: {} as unknown as DiagnosticResult['meta']['request'],
    },
    warnings: [],
    body: 'version_conflict_engine_exception',
    statusCode: 409,
  });

const aiIndexDocument: AiIndexDocument = {
  description: 'KIs representing previously answered, commonly asked questions',
  managed: false,
  dest: { type: 'data_stream', value: 'ai-index-ds-customer_support*' },
  automations: [{ type: 'workflow', value: 'nightly-refresh' }],
  sources: [{ type: 'esql', value: 'FROM ai-index-customer_support | LIMIT 10' }],
  date_created: '2026-07-08T12:10:30.000Z',
  date_modified: '2026-07-08T12:10:30.000Z',
};

describe('AiIndexService', () => {
  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
  let storageClient: jest.Mocked<Pick<AiIndexStorageClient, 'get' | 'index' | 'search' | 'delete'>>;
  let service: AiIndexService;

  beforeEach(() => {
    jest.clearAllMocks();
    esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.indices.resolveIndex.mockResponse({
      indices: [],
      aliases: [],
      data_streams: [
        {
          name: 'ai-index-ds-customer_support',
          backing_indices: [],
          timestamp_field: '@timestamp',
        },
      ],
    });

    storageClient = {
      get: jest.fn(),
      index: jest.fn(),
      search: jest.fn(),
      delete: jest.fn(),
    };
    createAiIndexStorageClientMock.mockReturnValue(storageClient);

    service = new AiIndexService({
      esClient,
      logger: loggingSystemMock.createLogger(),
    });
  });

  const properties = {
    description: 'KIs representing previously answered, commonly asked questions',
    dest: { type: 'data_stream' as const, value: 'ai-index-ds-customer_support*' },
    automations: [{ type: 'workflow' as const, value: 'nightly-refresh' }],
    sources: [{ type: 'esql' as const, value: 'FROM ai-index-customer_support | LIMIT 10' }],
  };

  describe('create', () => {
    it('creates with op_type create, without looking up the existing document', async () => {
      await expect(service.create('customer_support', properties)).resolves.toBeUndefined();

      expect(storageClient.get).not.toHaveBeenCalled();
      expect(storageClient.index).toHaveBeenCalledWith({
        id: 'customer_support',
        op_type: 'create',
        document: expect.objectContaining({
          ...properties,
          date_created: expect.any(String),
          date_modified: expect.any(String),
        }),
      });
    });

    it('throws AiIndexAlreadyExistsError when the id already exists (409)', async () => {
      storageClient.index.mockRejectedValue(createConflictError());

      await expect(service.create('customer_support', properties)).rejects.toBeInstanceOf(
        AiIndexAlreadyExistsError
      );
    });

    it('rejects an invalid dest before writing', async () => {
      await expect(
        service.create('customer_support', {
          ...properties,
          dest: { type: 'data_stream', value: 'customer_support*' },
        })
      ).rejects.toBeInstanceOf(InvalidAiIndexDestError);
      expect(storageClient.index).not.toHaveBeenCalled();
    });
  });

  describe('put', () => {
    it('creates an AI index with op_type create when none exists', async () => {
      storageClient.get.mockRejectedValue(createNotFoundError());

      await expect(service.put('customer_support', properties)).resolves.toBe('created');

      expect(storageClient.index).toHaveBeenCalledWith({
        id: 'customer_support',
        op_type: 'create',
        document: expect.objectContaining({
          ...properties,
          managed: false,
          date_created: expect.any(String),
          date_modified: expect.any(String),
        }),
      });
    });

    it('updates an existing AI index, preserving date_created and asserting seq_no', async () => {
      storageClient.get.mockResolvedValue({
        _id: 'customer_support',
        _index: '.contextengine-ai-indices',
        found: true,
        _seq_no: 7,
        _primary_term: 2,
        _source: aiIndexDocument,
      });

      await expect(service.put('customer_support', properties)).resolves.toBe('updated');

      // The search-based get only returns _seq_no/_primary_term when asked.
      expect(storageClient.get).toHaveBeenCalledWith({
        id: 'customer_support',
        seq_no_primary_term: true,
      });

      const [indexArgs] = storageClient.index.mock.calls[0];
      expect(indexArgs.if_seq_no).toBe(7);
      expect(indexArgs.if_primary_term).toBe(2);
      expect(indexArgs.document?.date_created).toBe(aiIndexDocument.date_created);
      expect(indexArgs.document?.date_modified).not.toBe(aiIndexDocument.date_modified);
    });

    it('persists feedback_analysis when updating an existing AI index', async () => {
      storageClient.get.mockResolvedValue({
        _id: 'customer_support',
        _index: '.contextengine-ai-indices',
        found: true,
        _seq_no: 7,
        _primary_term: 2,
        _source: aiIndexDocument,
      });

      await expect(
        service.put('customer_support', {
          ...properties,
          feedback_analysis: { enabled: true, agent_id: 'my-analysis-agent' },
        })
      ).resolves.toBe('updated');

      const [indexArgs] = storageClient.index.mock.calls[0];
      expect(indexArgs.document?.feedback_analysis).toEqual({
        enabled: true,
        agent_id: 'my-analysis-agent',
      });
    });

    it('throws AiIndexConflictError when a concurrent create wins (409)', async () => {
      storageClient.get.mockRejectedValue(createNotFoundError());
      storageClient.index.mockRejectedValue(createConflictError());

      await expect(service.put('customer_support', properties)).rejects.toBeInstanceOf(
        AiIndexConflictError
      );
    });

    it('throws AiIndexConflictError when a concurrent update wins (409)', async () => {
      storageClient.get.mockResolvedValue({
        _id: 'customer_support',
        _index: '.contextengine-ai-indices',
        found: true,
        _seq_no: 7,
        _primary_term: 2,
        _source: aiIndexDocument,
      });
      storageClient.index.mockRejectedValue(createConflictError());

      await expect(service.put('customer_support', properties)).rejects.toBeInstanceOf(
        AiIndexConflictError
      );
    });

    it('throws AiIndexManagedError when the entry is managed', async () => {
      storageClient.get.mockResolvedValue({
        _id: 'customer_support',
        _index: '.contextengine-ai-indices',
        found: true,
        _seq_no: 1,
        _primary_term: 1,
        _source: { ...aiIndexDocument, managed: true },
      });

      await expect(service.put('customer_support', properties)).rejects.toBeInstanceOf(
        AiIndexManagedError
      );
      expect(storageClient.index).not.toHaveBeenCalled();
    });

    it('allows a data_stream dest with no matches yet (lazy creation)', async () => {
      esClient.indices.resolveIndex.mockResponse({ indices: [], aliases: [], data_streams: [] });
      storageClient.get.mockRejectedValue(createNotFoundError());

      await expect(service.put('customer_support', properties)).resolves.toBe('created');
      expect(storageClient.index).toHaveBeenCalled();
    });

    it('allows a data_stream dest when resolveIndex returns 404', async () => {
      esClient.indices.resolveIndex.mockRejectedValue(createNotFoundError());
      storageClient.get.mockRejectedValue(createNotFoundError());

      await expect(service.put('customer_support', properties)).resolves.toBe('created');
      expect(storageClient.index).toHaveBeenCalled();
    });

    it('rejects a data_stream dest when a plain index exists at that name', async () => {
      esClient.indices.resolveIndex.mockResponse({
        indices: [{ name: 'ai-index-ds-customer_support', attributes: ['open'] }],
        aliases: [],
        data_streams: [],
      });

      await expect(service.put('customer_support', properties)).rejects.toBeInstanceOf(
        InvalidAiIndexDestError
      );
      expect(storageClient.index).not.toHaveBeenCalled();
    });

    it('rejects a data_stream dest value not prefixed with ai-index-ds- without resolving it', async () => {
      await expect(
        service.put('customer_support', {
          ...properties,
          dest: { type: 'data_stream', value: 'customer_support*' },
        })
      ).rejects.toBeInstanceOf(InvalidAiIndexDestError);
      expect(esClient.indices.resolveIndex).not.toHaveBeenCalled();
      expect(storageClient.index).not.toHaveBeenCalled();
    });

    it('rejects a data_stream dest not prefixed with ai-index-ds-', async () => {
      esClient.indices.resolveIndex.mockResponse({
        indices: [],
        aliases: [],
        data_streams: [
          {
            name: 'ai-index-idx-customer_support',
            backing_indices: [],
            timestamp_field: '@timestamp',
          },
        ],
      });

      await expect(service.put('customer_support', properties)).rejects.toBeInstanceOf(
        InvalidAiIndexDestError
      );
      expect(storageClient.index).not.toHaveBeenCalled();
    });

    const indexProperties = {
      ...properties,
      dest: { type: 'index' as const, value: 'ai-index-idx-logs-*' },
    };

    it('creates an index AI index when the value matches an index', async () => {
      esClient.indices.resolveIndex.mockResponse({
        indices: [{ name: 'ai-index-idx-logs-app', attributes: ['open'] }],
        aliases: [],
        data_streams: [],
      });
      storageClient.get.mockRejectedValue(createNotFoundError());

      await expect(service.put('logs', indexProperties)).resolves.toBe('created');
      expect(storageClient.index).toHaveBeenCalled();
    });

    it('allows an index dest that matches no index yet (lazy creation)', async () => {
      esClient.indices.resolveIndex.mockResponse({
        indices: [],
        aliases: [],
        data_streams: [],
      });
      storageClient.get.mockRejectedValue(createNotFoundError());

      await expect(service.put('logs', indexProperties)).resolves.toBe('created');
      expect(storageClient.index).toHaveBeenCalled();
    });

    it('rejects an index dest when a data stream exists at that name', async () => {
      esClient.indices.resolveIndex.mockResponse({
        indices: [],
        aliases: [],
        data_streams: [
          { name: 'ai-index-idx-logs', backing_indices: [], timestamp_field: '@timestamp' },
        ],
      });

      await expect(service.put('logs', indexProperties)).rejects.toBeInstanceOf(
        InvalidAiIndexDestError
      );
      expect(storageClient.index).not.toHaveBeenCalled();
    });

    it('rejects a system index dest', async () => {
      esClient.indices.resolveIndex.mockResponse({
        indices: [{ name: 'ai-index-idx-security', attributes: ['open', 'hidden', 'system'] }],
        aliases: [],
        data_streams: [],
      });

      await expect(service.put('logs', indexProperties)).rejects.toBeInstanceOf(
        InvalidAiIndexDestError
      );
      expect(storageClient.index).not.toHaveBeenCalled();
    });

    it('allows a hidden but non-system index dest', async () => {
      esClient.indices.resolveIndex.mockResponse({
        indices: [{ name: 'ai-index-idx-sml-data', attributes: ['open', 'hidden'] }],
        aliases: [],
        data_streams: [],
      });
      storageClient.get.mockRejectedValue(createNotFoundError());

      await expect(service.put('logs', indexProperties)).resolves.toBe('created');
      // Hidden indices only resolve when expand_wildcards includes them.
      expect(esClient.indices.resolveIndex).toHaveBeenCalledWith({
        name: indexProperties.dest.value,
        expand_wildcards: ['open', 'hidden', 'closed'],
      });
      expect(storageClient.index).toHaveBeenCalled();
    });

    it('allows a closed hidden but non-system index dest', async () => {
      esClient.indices.resolveIndex.mockResponse({
        indices: [{ name: 'ai-index-idx-sml-data', attributes: ['closed', 'hidden'] }],
        aliases: [],
        data_streams: [],
      });
      storageClient.get.mockRejectedValue(createNotFoundError());

      await expect(service.put('logs', indexProperties)).resolves.toBe('created');
      // Closed indices only resolve when expand_wildcards includes 'closed'.
      expect(esClient.indices.resolveIndex).toHaveBeenCalledWith({
        name: indexProperties.dest.value,
        expand_wildcards: ['open', 'hidden', 'closed'],
      });
      expect(storageClient.index).toHaveBeenCalled();
    });

    it('rejects a mixed expression that includes a system index', async () => {
      esClient.indices.resolveIndex.mockResponse({
        indices: [
          { name: 'ai-index-idx-logs-app', attributes: ['open'] },
          { name: 'ai-index-idx-kibana', attributes: ['open', 'hidden', 'system'] },
        ],
        aliases: [],
        data_streams: [],
      });

      await expect(
        service.put('logs', {
          ...indexProperties,
          dest: { type: 'index', value: 'ai-index-idx-logs-*,ai-index-idx-kibana*' },
        })
      ).rejects.toBeInstanceOf(InvalidAiIndexDestError);
      expect(storageClient.index).not.toHaveBeenCalled();
    });

    it('rejects an index dest value not prefixed with ai-index-idx- without resolving it', async () => {
      await expect(
        service.put('logs', {
          ...indexProperties,
          dest: { type: 'index', value: '.kibana*' },
        })
      ).rejects.toBeInstanceOf(InvalidAiIndexDestError);
      expect(esClient.indices.resolveIndex).not.toHaveBeenCalled();
      expect(storageClient.index).not.toHaveBeenCalled();
    });

    it('rejects a mixed expression when one expression lacks the prefix', async () => {
      await expect(
        service.put('logs', {
          ...indexProperties,
          dest: { type: 'index', value: 'ai-index-idx-logs-*,.kibana*' },
        })
      ).rejects.toBeInstanceOf(InvalidAiIndexDestError);
      expect(esClient.indices.resolveIndex).not.toHaveBeenCalled();
      expect(storageClient.index).not.toHaveBeenCalled();
    });

    it('rejects an index dest not prefixed with ai-index-idx-', async () => {
      esClient.indices.resolveIndex.mockResponse({
        indices: [{ name: 'ai-index-logs-app', attributes: ['open'] }],
        aliases: [],
        data_streams: [],
      });

      await expect(service.put('logs', indexProperties)).rejects.toBeInstanceOf(
        InvalidAiIndexDestError
      );
      expect(storageClient.index).not.toHaveBeenCalled();
    });
  });

  describe('putManaged', () => {
    const managedProperties = {
      description: 'Elastic managed AI index',
      dest: { type: 'index' as const, value: 'ai-index-idx-sml-data' },
      automations: [],
      sources: [],
    };

    const mockValidIndexDest = () =>
      esClient.indices.resolveIndex.mockResponse({
        indices: [{ name: 'ai-index-idx-sml-data', attributes: ['open'] }],
        aliases: [],
        data_streams: [],
      });

    it('writes managed: true to the document', async () => {
      mockValidIndexDest();
      storageClient.get.mockRejectedValue(createNotFoundError());

      await expect(service.putManaged('elastic', managedProperties)).resolves.toBe('created');

      expect(storageClient.index).toHaveBeenCalledWith(
        expect.objectContaining({
          document: expect.objectContaining({ managed: true }),
        })
      );
    });

    it('overwrites an existing managed entry (idempotent upsert)', async () => {
      mockValidIndexDest();
      storageClient.get.mockResolvedValue({
        _id: 'elastic',
        _index: '.contextengine-ai-indices',
        found: true,
        _seq_no: 7,
        _primary_term: 2,
        _source: { ...aiIndexDocument, managed: true },
      });

      await expect(service.putManaged('elastic', managedProperties)).resolves.toBe('updated');

      const [indexArgs] = storageClient.index.mock.calls[0];
      expect(indexArgs.if_seq_no).toBe(7);
      expect(indexArgs.if_primary_term).toBe(2);
      expect(indexArgs.document?.managed).toBe(true);
    });

    it('throws AiIndexIdConflictError when the id is taken by an unmanaged entry', async () => {
      mockValidIndexDest();
      storageClient.get.mockResolvedValue({
        _id: 'elastic',
        _index: '.contextengine-ai-indices',
        found: true,
        _source: { ...aiIndexDocument, managed: false },
      });

      await expect(service.putManaged('elastic', managedProperties)).rejects.toBeInstanceOf(
        AiIndexIdConflictError
      );
      expect(storageClient.index).not.toHaveBeenCalled();
    });
  });

  describe('setFeedbackAnalysis', () => {
    const feedbackAnalysis = {
      enabled: true,
      agent_id: 'my-analysis-agent',
      schedule: { interval: '24h' },
      signal_time_range: { type: 'relative' as const, from: 'now-30d' },
    };

    const mockStored = (document: AiIndexDocument) => {
      storageClient.get.mockResolvedValue({
        _id: 'customer_support',
        _index: '.contextengine-ai-indices',
        found: true,
        _seq_no: 7,
        _primary_term: 2,
        _source: document,
      });
    };

    it('writes the block and leaves the rest of the entry untouched', async () => {
      mockStored(aiIndexDocument);

      await expect(
        service.setFeedbackAnalysis('customer_support', feedbackAnalysis)
      ).resolves.toEqual(feedbackAnalysis);

      const [indexArgs] = storageClient.index.mock.calls[0];
      expect(indexArgs.document).toEqual(
        expect.objectContaining({
          feedback_analysis: feedbackAnalysis,
          description: aiIndexDocument.description,
          dest: aiIndexDocument.dest,
          automations: aiIndexDocument.automations,
          sources: aiIndexDocument.sources,
          date_created: aiIndexDocument.date_created,
        })
      );
    });

    it('guards the write with optimistic concurrency control', async () => {
      mockStored(aiIndexDocument);

      await service.setFeedbackAnalysis('customer_support', feedbackAnalysis);

      const [indexArgs] = storageClient.index.mock.calls[0];
      expect(indexArgs.if_seq_no).toBe(7);
      expect(indexArgs.if_primary_term).toBe(2);
    });

    it('is permitted on managed AI indices, and preserves the managed flag', async () => {
      mockStored({ ...aiIndexDocument, managed: true });

      await expect(
        service.setFeedbackAnalysis('customer_support', feedbackAnalysis)
      ).resolves.toEqual(feedbackAnalysis);

      const [indexArgs] = storageClient.index.mock.calls[0];
      expect(indexArgs.document?.managed).toBe(true);
    });

    it('replaces the previous block rather than merging into it', async () => {
      mockStored({
        ...aiIndexDocument,
        feedback_analysis: { enabled: true, agent_id: 'previous-agent' },
      });

      await service.setFeedbackAnalysis('customer_support', { enabled: false });

      const [indexArgs] = storageClient.index.mock.calls[0];
      expect(indexArgs.document?.feedback_analysis).toEqual({ enabled: false });
    });

    it('does not re-validate the dest, so a stale backing store can still be switched off', async () => {
      mockStored(aiIndexDocument);

      await service.setFeedbackAnalysis('customer_support', { enabled: false });

      expect(esClient.indices.resolveIndex).not.toHaveBeenCalled();
    });

    it('throws AiIndexNotFoundError when the AI index does not exist', async () => {
      storageClient.get.mockRejectedValue(createNotFoundError());

      await expect(service.setFeedbackAnalysis('missing', feedbackAnalysis)).rejects.toBeInstanceOf(
        AiIndexNotFoundError
      );
      expect(storageClient.index).not.toHaveBeenCalled();
    });

    it('throws AiIndexConflictError when a concurrent write wins (409)', async () => {
      mockStored(aiIndexDocument);
      storageClient.index.mockRejectedValue(createConflictError());

      await expect(
        service.setFeedbackAnalysis('customer_support', feedbackAnalysis)
      ).rejects.toBeInstanceOf(AiIndexConflictError);
    });
  });

  describe('get', () => {
    it('returns the AI index with its id', async () => {
      storageClient.get.mockResolvedValue({
        _id: 'customer_support',
        _index: '.contextengine-ai-indices',
        found: true,
        _source: aiIndexDocument,
      });

      await expect(service.get('customer_support')).resolves.toEqual({
        id: 'customer_support',
        ...aiIndexDocument,
      });
    });

    it('defaults managed to false for legacy documents without the field', async () => {
      const legacyDocument = { ...aiIndexDocument };
      delete (legacyDocument as { managed?: boolean }).managed;
      storageClient.get.mockResolvedValue({
        _id: 'customer_support',
        _index: '.contextengine-ai-indices',
        found: true,
        _source: legacyDocument,
      });

      await expect(service.get('customer_support')).resolves.toEqual(
        expect.objectContaining({ id: 'customer_support', managed: false })
      );
    });

    it('round-trips feedback_analysis from the stored document to the item', async () => {
      storageClient.get.mockResolvedValue({
        _id: 'customer_support',
        _index: '.contextengine-ai-indices',
        found: true,
        _source: {
          ...aiIndexDocument,
          feedback_analysis: {
            enabled: true,
            agent_id: 'my-analysis-agent',
            schedule: { interval: '24h' },
            signal_time_range: { type: 'relative' as const, from: 'now-30d' },
          },
        },
      });

      await expect(service.get('customer_support')).resolves.toEqual(
        expect.objectContaining({
          feedback_analysis: {
            enabled: true,
            agent_id: 'my-analysis-agent',
            schedule: { interval: '24h' },
            signal_time_range: { type: 'relative', from: 'now-30d' },
          },
        })
      );
    });

    it('omits feedback_analysis when the stored document has none', async () => {
      storageClient.get.mockResolvedValue({
        _id: 'customer_support',
        _index: '.contextengine-ai-indices',
        found: true,
        _source: aiIndexDocument,
      });

      await expect(service.get('customer_support')).resolves.not.toHaveProperty(
        'feedback_analysis'
      );
    });

    it('persists feedback_analysis when creating an AI index', async () => {
      await service.create('customer_support', {
        ...properties,
        feedback_analysis: { enabled: false, agent_id: 'my-analysis-agent' },
      });

      expect(storageClient.index).toHaveBeenCalledWith(
        expect.objectContaining({
          document: expect.objectContaining({
            feedback_analysis: { enabled: false, agent_id: 'my-analysis-agent' },
          }),
        })
      );
    });

    it('throws AiIndexNotFoundError when the AI index does not exist', async () => {
      storageClient.get.mockRejectedValue(createNotFoundError());

      await expect(service.get('missing')).rejects.toBeInstanceOf(AiIndexNotFoundError);
    });

    it('rethrows unexpected errors', async () => {
      storageClient.get.mockRejectedValue(new Error('boom'));

      await expect(service.get('customer_support')).rejects.toThrow('boom');
    });
  });

  describe('list', () => {
    it('returns AI indices mapped from search hits, sorted by id', async () => {
      storageClient.search.mockResolvedValue({
        took: 1,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: {
          hits: [
            {
              _id: 'customer_support',
              _index: '.contextengine-ai-indices',
              _source: aiIndexDocument,
            },
            { _id: 'billing', _index: '.contextengine-ai-indices', _source: aiIndexDocument },
          ],
        },
      } as unknown as Awaited<ReturnType<AiIndexStorageClient['search']>>);

      await expect(service.list()).resolves.toEqual([
        { id: 'billing', ...aiIndexDocument },
        { id: 'customer_support', ...aiIndexDocument },
      ]);

      expect(storageClient.search).toHaveBeenCalledWith(expect.objectContaining({ size: 100 }));
    });
  });

  describe('delete', () => {
    it('resolves when the AI index is deleted', async () => {
      storageClient.get.mockResolvedValue({
        _id: 'customer_support',
        _index: '.contextengine-ai-indices',
        found: true,
        _source: aiIndexDocument,
      });
      storageClient.delete.mockResolvedValue({ acknowledged: true, result: 'deleted' });

      await expect(service.delete('customer_support')).resolves.toBeUndefined();
      expect(storageClient.delete).toHaveBeenCalledWith({ id: 'customer_support' });
    });

    it('throws AiIndexNotFoundError when the AI index does not exist', async () => {
      storageClient.get.mockRejectedValue(createNotFoundError());

      await expect(service.delete('missing')).rejects.toBeInstanceOf(AiIndexNotFoundError);
      expect(storageClient.delete).not.toHaveBeenCalled();
    });

    it('throws AiIndexManagedError when the entry is managed', async () => {
      storageClient.get.mockResolvedValue({
        _id: 'customer_support',
        _index: '.contextengine-ai-indices',
        found: true,
        _source: { ...aiIndexDocument, managed: true },
      });

      await expect(service.delete('customer_support')).rejects.toBeInstanceOf(AiIndexManagedError);
      expect(storageClient.delete).not.toHaveBeenCalled();
    });

    it('throws AiIndexNotFoundError when the entry is removed concurrently', async () => {
      storageClient.get.mockResolvedValue({
        _id: 'customer_support',
        _index: '.contextengine-ai-indices',
        found: true,
        _source: aiIndexDocument,
      });
      storageClient.delete.mockResolvedValue({ acknowledged: true, result: 'not_found' });

      await expect(service.delete('customer_support')).rejects.toBeInstanceOf(AiIndexNotFoundError);
    });
  });
});
