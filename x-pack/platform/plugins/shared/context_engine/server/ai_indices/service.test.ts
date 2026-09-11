/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import type { DiagnosticResult } from '@elastic/elasticsearch';
import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { MAX_AI_INDEX_AUTOMATIONS } from '../../common/constants';
import { createSpaceDslFilter } from '../utils/space_filter';
import { AiIndexService } from './service';
import {
  InvalidAiIndexDestError,
  AiIndexConflictError,
  AiIndexManagedError,
  AiIndexNotFoundError,
  AiIndexIdConflictError,
  AiIndexAlreadyExistsError,
} from './errors';
import type { AiIndexDocument, AiIndexStorageClient, StoredAiIndexDocument } from './storage';
import { buildManagedAiIndexDocId, createAiIndexStorageClient } from './storage';

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

const DEFAULT_SPACE = 'default';
const AI_INDICES_INDEX = '.contextengine-ai-indices';

interface SearchHitInput {
  _id: string;
  _source: StoredAiIndexDocument;
  _seq_no?: number;
  _primary_term?: number;
}

const searchResponse = (hits: SearchHitInput[] = []) => ({
  took: 1,
  timed_out: false,
  _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
  hits: {
    hits: hits.map((hit) => ({
      _index: AI_INDICES_INDEX,
      ...hit,
    })),
  },
});

const aiIndexDocument: AiIndexDocument = {
  id: 'customer_support',
  space: DEFAULT_SPACE,
  description: 'KIs representing previously answered, commonly asked questions',
  managed: false,
  dest: { type: 'data_stream', value: 'ai-index-ds-customer_support' },
  automations: [{ type: 'workflow', value: 'nightly-refresh' }],
  sources: [{ type: 'esql', value: 'FROM ai-index-customer_support | LIMIT 10' }],
  traces: [],
  date_created: '2026-07-08T12:10:30.000Z',
  date_modified: '2026-07-08T12:10:30.000Z',
};

const toHttpItem = (document: AiIndexDocument) => {
  const { space: _space, ...item } = document;
  return { ...item, memory_enabled: document.memory_enabled ?? false };
};

const storedHit = (
  document: StoredAiIndexDocument,
  {
    id = document.id ?? 'missing',
    seqNo = 7,
    primaryTerm = 2,
  }: { id?: string; seqNo?: number; primaryTerm?: number } = {}
): SearchHitInput => ({
  _id: id,
  _source: document,
  _seq_no: seqNo,
  _primary_term: primaryTerm,
});

describe('AiIndexService', () => {
  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
  let storageClient: jest.Mocked<Pick<AiIndexStorageClient, 'index' | 'search' | 'delete'>>;
  let service: AiIndexService;

  const mockSearchHits = (...hits: SearchHitInput[]) => {
    storageClient.search.mockResolvedValue(
      searchResponse(hits) as Awaited<ReturnType<AiIndexStorageClient['search']>>
    );
  };

  const mockSearchHitsOnce = (...hits: SearchHitInput[]) => {
    storageClient.search.mockResolvedValueOnce(
      searchResponse(hits) as Awaited<ReturnType<AiIndexStorageClient['search']>>
    );
  };

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
      index: jest.fn(),
      search: jest.fn(),
      delete: jest.fn(),
    };
    createAiIndexStorageClientMock.mockReturnValue(storageClient);
    mockSearchHits();

    service = new AiIndexService({
      esClient,
      logger: loggingSystemMock.createLogger(),
    });
  });

  const properties = {
    description: 'KIs representing previously answered, commonly asked questions',
    dest: { type: 'data_stream' as const, value: 'ai-index-ds-customer_support' },
    automations: [{ type: 'workflow' as const, value: 'nightly-refresh' }],
    sources: [{ type: 'esql' as const, value: 'FROM ai-index-customer_support | LIMIT 10' }],
    traces: [],
  };

  describe('create', () => {
    it('indexes a user-created AI index without an id so Elasticsearch assigns _id', async () => {
      await expect(
        service.create('customer_support', DEFAULT_SPACE, properties)
      ).resolves.toBeUndefined();

      expect(storageClient.search).toHaveBeenCalled();
      expect(storageClient.index).toHaveBeenCalledWith({
        refresh: 'wait_for',
        document: expect.objectContaining({
          ...properties,
          id: 'customer_support',
          space: DEFAULT_SPACE,
          date_created: expect.any(String),
          date_modified: expect.any(String),
        }),
      });
      expect(storageClient.index.mock.calls[0][0]).not.toHaveProperty('id');
      expect(storageClient.index.mock.calls[0][0]).not.toHaveProperty('op_type');
    });

    it('defaults memory_enabled to false', async () => {
      await service.create('customer_support', DEFAULT_SPACE, properties);

      expect(storageClient.index).toHaveBeenCalledWith(
        expect.objectContaining({
          document: expect.objectContaining({ memory_enabled: false }),
        })
      );
    });

    it('throws AiIndexAlreadyExistsError when the id already exists', async () => {
      mockSearchHits(storedHit(aiIndexDocument));

      await expect(
        service.create('customer_support', DEFAULT_SPACE, properties)
      ).rejects.toBeInstanceOf(AiIndexAlreadyExistsError);
      expect(storageClient.index).not.toHaveBeenCalled();
    });

    it('refuses to create a reserved managed id', async () => {
      service = new AiIndexService({
        esClient,
        logger: loggingSystemMock.createLogger(),
        managedBootstrap: {
          isManaged: (id) => id === 'elastic',
          getManagedIds: () => ['elastic'],
          ensure: jest.fn(),
        },
      });

      await expect(service.create('elastic', DEFAULT_SPACE, properties)).rejects.toBeInstanceOf(
        AiIndexManagedError
      );
      expect(storageClient.index).not.toHaveBeenCalled();
    });

    it('rejects an invalid dest before writing', async () => {
      await expect(
        service.create('customer_support', DEFAULT_SPACE, {
          ...properties,
          dest: { type: 'data_stream', value: 'customer_support' },
        })
      ).rejects.toBeInstanceOf(InvalidAiIndexDestError);
      expect(storageClient.index).not.toHaveBeenCalled();
    });

    it('rejects a dot-prefixed index dest on create', async () => {
      await expect(
        service.create('elastic', DEFAULT_SPACE, {
          ...properties,
          dest: { type: 'index', value: '.ai-index-idx-elastic-index' },
        })
      ).rejects.toBeInstanceOf(InvalidAiIndexDestError);
      expect(esClient.indices.resolveIndex).not.toHaveBeenCalled();
      expect(storageClient.index).not.toHaveBeenCalled();
    });
  });

  describe('put', () => {
    it('creates an AI index without an id when none exists', async () => {
      await expect(service.put('customer_support', DEFAULT_SPACE, properties)).resolves.toBe(
        'created'
      );

      expect(storageClient.index).toHaveBeenCalledWith({
        refresh: 'wait_for',
        document: expect.objectContaining({
          ...properties,
          id: 'customer_support',
          space: DEFAULT_SPACE,
          managed: false,
          date_created: expect.any(String),
          date_modified: expect.any(String),
        }),
      });
      expect(storageClient.index.mock.calls[0][0]).not.toHaveProperty('id');
      expect(storageClient.index.mock.calls[0][0]).not.toHaveProperty('op_type');
    });

    it('updates an existing AI index, preserving date_created and asserting seq_no', async () => {
      mockSearchHits(storedHit(aiIndexDocument, { id: 'auto-gen-1', seqNo: 7, primaryTerm: 2 }));

      await expect(service.put('customer_support', DEFAULT_SPACE, properties)).resolves.toBe(
        'updated'
      );

      expect(storageClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          size: 1,
          track_total_hits: false,
          seq_no_primary_term: true,
        })
      );

      const [indexArgs] = storageClient.index.mock.calls[0];
      expect(indexArgs.id).toBe('auto-gen-1');
      expect(indexArgs.if_seq_no).toBe(7);
      expect(indexArgs.if_primary_term).toBe(2);
      expect(indexArgs.document?.date_created).toBe(aiIndexDocument.date_created);
      expect(indexArgs.document?.date_modified).not.toBe(aiIndexDocument.date_modified);
    });

    it('persists feedback_analysis when updating an existing AI index', async () => {
      mockSearchHits(storedHit(aiIndexDocument));

      await expect(
        service.put('customer_support', DEFAULT_SPACE, {
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

    it('persists memory_enabled when updating an existing AI index', async () => {
      mockSearchHits(storedHit(aiIndexDocument, { seqNo: 7, primaryTerm: 2 }));

      await expect(
        service.put('customer_support', DEFAULT_SPACE, { ...properties, memory_enabled: true })
      ).resolves.toBe('updated');

      const [indexArgs] = storageClient.index.mock.calls[0];
      expect(indexArgs.document?.memory_enabled).toBe(true);
    });

    it('throws AiIndexConflictError when a concurrent create wins (409)', async () => {
      storageClient.index.mockRejectedValue(createConflictError());

      await expect(
        service.put('customer_support', DEFAULT_SPACE, properties)
      ).rejects.toBeInstanceOf(AiIndexConflictError);
    });

    it('throws AiIndexConflictError when a concurrent update wins (409)', async () => {
      mockSearchHits(storedHit(aiIndexDocument));
      storageClient.index.mockRejectedValue(createConflictError());

      await expect(
        service.put('customer_support', DEFAULT_SPACE, properties)
      ).rejects.toBeInstanceOf(AiIndexConflictError);
    });

    it('throws AiIndexManagedError when the entry is managed', async () => {
      mockSearchHits(
        storedHit({ ...aiIndexDocument, managed: true }, { seqNo: 1, primaryTerm: 1 })
      );

      await expect(
        service.put('customer_support', DEFAULT_SPACE, properties)
      ).rejects.toBeInstanceOf(AiIndexManagedError);
      expect(storageClient.index).not.toHaveBeenCalled();
    });

    it('refuses to put a reserved managed id that does not exist yet', async () => {
      service = new AiIndexService({
        esClient,
        logger: loggingSystemMock.createLogger(),
        managedBootstrap: {
          isManaged: (id) => id === 'elastic',
          getManagedIds: () => ['elastic'],
          ensure: jest.fn(),
        },
      });

      await expect(service.put('elastic', DEFAULT_SPACE, properties)).rejects.toBeInstanceOf(
        AiIndexManagedError
      );
      expect(storageClient.index).not.toHaveBeenCalled();
    });

    it('allows a data_stream dest with no matches yet (lazy creation)', async () => {
      esClient.indices.resolveIndex.mockResponse({ indices: [], aliases: [], data_streams: [] });

      await expect(service.put('customer_support', DEFAULT_SPACE, properties)).resolves.toBe(
        'created'
      );
      expect(storageClient.index).toHaveBeenCalled();
    });

    it('allows a data_stream dest when resolveIndex returns 404', async () => {
      esClient.indices.resolveIndex.mockRejectedValue(createNotFoundError());

      await expect(service.put('customer_support', DEFAULT_SPACE, properties)).resolves.toBe(
        'created'
      );
      expect(storageClient.index).toHaveBeenCalled();
    });

    it('rejects a data_stream dest when an alias exists at that name', async () => {
      esClient.indices.resolveIndex.mockResponse({
        indices: [],
        aliases: [{ name: 'ai-index-ds-customer_support', indices: ['ai-index-ds-a'] }],
        data_streams: [],
      });

      await expect(service.put('customer_support', DEFAULT_SPACE, properties)).rejects.toThrow(
        /'ai-index-ds-customer_support' is an alias/
      );
      expect(storageClient.index).not.toHaveBeenCalled();
    });

    it('rejects a data_stream dest when a plain index exists at that name', async () => {
      esClient.indices.resolveIndex.mockResponse({
        indices: [{ name: 'ai-index-ds-customer_support', attributes: ['open'] }],
        aliases: [],
        data_streams: [],
      });

      await expect(
        service.put('customer_support', DEFAULT_SPACE, properties)
      ).rejects.toBeInstanceOf(InvalidAiIndexDestError);
      expect(storageClient.index).not.toHaveBeenCalled();
    });

    it('rejects a data_stream dest value not prefixed with ai-index-ds- without resolving it', async () => {
      await expect(
        service.put('customer_support', DEFAULT_SPACE, {
          ...properties,
          dest: { type: 'data_stream', value: 'customer_support' },
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

      await expect(
        service.put('customer_support', DEFAULT_SPACE, properties)
      ).rejects.toBeInstanceOf(InvalidAiIndexDestError);
      expect(storageClient.index).not.toHaveBeenCalled();
    });

    const indexProperties = {
      ...properties,
      dest: { type: 'index' as const, value: 'ai-index-idx-logs' },
    };

    it('creates an index AI index when the value matches an index', async () => {
      esClient.indices.resolveIndex.mockResponse({
        indices: [{ name: 'ai-index-idx-logs-app', attributes: ['open'] }],
        aliases: [],
        data_streams: [],
      });

      await expect(service.put('logs', DEFAULT_SPACE, indexProperties)).resolves.toBe('created');
      expect(storageClient.index).toHaveBeenCalled();
    });

    it('allows an index dest that matches no index yet (lazy creation)', async () => {
      esClient.indices.resolveIndex.mockResponse({
        indices: [],
        aliases: [],
        data_streams: [],
      });

      await expect(service.put('logs', DEFAULT_SPACE, indexProperties)).resolves.toBe('created');
      expect(storageClient.index).toHaveBeenCalled();
    });

    it('rejects an index dest when an alias exists at that name', async () => {
      esClient.indices.resolveIndex.mockResponse({
        indices: [],
        aliases: [{ name: 'ai-index-idx-logs', indices: ['ai-index-idx-a', 'ai-index-idx-b'] }],
        data_streams: [],
      });

      await expect(service.put('logs', DEFAULT_SPACE, indexProperties)).rejects.toBeInstanceOf(
        InvalidAiIndexDestError
      );
      expect(storageClient.index).not.toHaveBeenCalled();
    });

    it('rejects an index dest when a data stream exists at that name', async () => {
      esClient.indices.resolveIndex.mockResponse({
        indices: [],
        aliases: [],
        data_streams: [
          { name: 'ai-index-idx-logs', backing_indices: [], timestamp_field: '@timestamp' },
        ],
      });

      await expect(service.put('logs', DEFAULT_SPACE, indexProperties)).rejects.toBeInstanceOf(
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

      await expect(service.put('logs', DEFAULT_SPACE, indexProperties)).rejects.toBeInstanceOf(
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

      await expect(service.put('logs', DEFAULT_SPACE, indexProperties)).resolves.toBe('created');
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

      await expect(service.put('logs', DEFAULT_SPACE, indexProperties)).resolves.toBe('created');
      // Closed indices only resolve when expand_wildcards includes 'closed'.
      expect(esClient.indices.resolveIndex).toHaveBeenCalledWith({
        name: indexProperties.dest.value,
        expand_wildcards: ['open', 'hidden', 'closed'],
      });
      expect(storageClient.index).toHaveBeenCalled();
    });

    it('rejects a wildcard index dest without resolving it', async () => {
      await expect(
        service.put('logs', DEFAULT_SPACE, {
          ...indexProperties,
          dest: { type: 'index', value: 'ai-index-idx-logs-*' },
        })
      ).rejects.toThrow(/must name a single index or data stream, not a pattern/);
      expect(esClient.indices.resolveIndex).not.toHaveBeenCalled();
      expect(storageClient.index).not.toHaveBeenCalled();
    });

    it('rejects a comma-separated index dest without resolving it', async () => {
      await expect(
        service.put('logs', DEFAULT_SPACE, {
          ...indexProperties,
          dest: { type: 'index', value: 'ai-index-idx-logs,ai-index-idx-kibana' },
        })
      ).rejects.toBeInstanceOf(InvalidAiIndexDestError);
      expect(esClient.indices.resolveIndex).not.toHaveBeenCalled();
      expect(storageClient.index).not.toHaveBeenCalled();
    });

    it('rejects an index dest whose id has invalid characters', async () => {
      await expect(
        service.put('logs', DEFAULT_SPACE, {
          ...indexProperties,
          dest: { type: 'index', value: 'ai-index-idx-logs?' },
        })
      ).rejects.toThrow(/the part after 'ai-index-idx-' must be a valid AI index id/);
      expect(esClient.indices.resolveIndex).not.toHaveBeenCalled();
      expect(storageClient.index).not.toHaveBeenCalled();
    });

    it('rejects an index dest value not prefixed with ai-index-idx- without resolving it', async () => {
      await expect(
        service.put('logs', DEFAULT_SPACE, {
          ...indexProperties,
          dest: { type: 'index', value: '.kibana' },
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

      await expect(service.put('logs', DEFAULT_SPACE, indexProperties)).rejects.toBeInstanceOf(
        InvalidAiIndexDestError
      );
      expect(storageClient.index).not.toHaveBeenCalled();
    });

    it('rejects a dot-prefixed index dest on put', async () => {
      await expect(
        service.put('elastic', DEFAULT_SPACE, {
          ...indexProperties,
          dest: { type: 'index', value: '.ai-index-idx-elastic-index' },
        })
      ).rejects.toBeInstanceOf(InvalidAiIndexDestError);
      expect(esClient.indices.resolveIndex).not.toHaveBeenCalled();
      expect(storageClient.index).not.toHaveBeenCalled();
    });
  });

  describe('putManaged', () => {
    const managedProperties = {
      description: 'Elastic managed AI index',
      dest: { type: 'index' as const, value: 'ai-index-idx-sml-data' },
      automations: [],
      sources: [],
      traces: [],
    };

    const mockValidIndexDest = () =>
      esClient.indices.resolveIndex.mockResponse({
        indices: [{ name: 'ai-index-idx-sml-data', attributes: ['open'] }],
        aliases: [],
        data_streams: [],
      });

    it('indexes a managed AI index at ${space}:${id} with op_type create', async () => {
      mockValidIndexDest();

      await expect(service.putManaged('elastic', DEFAULT_SPACE, managedProperties)).resolves.toBe(
        'created'
      );

      expect(storageClient.index).toHaveBeenCalledWith({
        id: buildManagedAiIndexDocId(DEFAULT_SPACE, 'elastic'),
        op_type: 'create',
        refresh: 'wait_for',
        document: expect.objectContaining({
          id: 'elastic',
          space: DEFAULT_SPACE,
          managed: true,
        }),
      });
    });

    it('overwrites an existing managed entry (idempotent upsert)', async () => {
      mockValidIndexDest();
      mockSearchHits(
        storedHit(
          {
            ...aiIndexDocument,
            id: 'elastic',
            managed: true,
          },
          { id: buildManagedAiIndexDocId(DEFAULT_SPACE, 'elastic') }
        )
      );

      await expect(service.putManaged('elastic', DEFAULT_SPACE, managedProperties)).resolves.toBe(
        'updated'
      );

      const [indexArgs] = storageClient.index.mock.calls[0];
      expect(indexArgs.id).toBe(buildManagedAiIndexDocId(DEFAULT_SPACE, 'elastic'));
      expect(indexArgs.if_seq_no).toBe(7);
      expect(indexArgs.if_primary_term).toBe(2);
      expect(indexArgs.document?.managed).toBe(true);
    });

    it('throws AiIndexIdConflictError when the id is taken by an unmanaged entry', async () => {
      mockValidIndexDest();
      mockSearchHits(
        storedHit({
          ...aiIndexDocument,
          id: 'elastic',
          managed: false,
        })
      );

      await expect(
        service.putManaged('elastic', DEFAULT_SPACE, managedProperties)
      ).rejects.toBeInstanceOf(AiIndexIdConflictError);
      expect(storageClient.index).not.toHaveBeenCalled();
    });

    it('accepts a dot-prefixed managed index dest', async () => {
      esClient.indices.resolveIndex.mockResponse({
        indices: [{ name: '.ai-index-idx-elastic-index', attributes: ['open'] }],
        aliases: [],
        data_streams: [],
      });

      await expect(
        service.putManaged('elastic', DEFAULT_SPACE, {
          ...managedProperties,
          dest: { type: 'index', value: '.ai-index-idx-elastic-index' },
        })
      ).resolves.toBe('created');
      expect(storageClient.index).toHaveBeenCalled();
    });

    it('accepts a dot-prefixed managed data_stream dest', async () => {
      esClient.indices.resolveIndex.mockResponse({
        indices: [],
        aliases: [],
        data_streams: [
          {
            name: '.ai-index-ds-elastic-stream',
            backing_indices: [],
            timestamp_field: '@timestamp',
          },
        ],
      });

      await expect(
        service.putManaged('elastic', DEFAULT_SPACE, {
          ...managedProperties,
          dest: { type: 'data_stream', value: '.ai-index-ds-elastic-stream' },
        })
      ).resolves.toBe('created');
      expect(storageClient.index).toHaveBeenCalled();
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
      mockSearchHits(storedHit(document));
    };

    it('writes the block and leaves the rest of the entry untouched', async () => {
      mockStored(aiIndexDocument);

      await expect(
        service.setFeedbackAnalysis('customer_support', DEFAULT_SPACE, feedbackAnalysis)
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

      await service.setFeedbackAnalysis('customer_support', DEFAULT_SPACE, feedbackAnalysis);

      const [indexArgs] = storageClient.index.mock.calls[0];
      expect(indexArgs.if_seq_no).toBe(7);
      expect(indexArgs.if_primary_term).toBe(2);
    });

    it('is permitted on managed AI indices, and preserves the managed flag', async () => {
      mockStored({ ...aiIndexDocument, managed: true });

      await expect(
        service.setFeedbackAnalysis('customer_support', DEFAULT_SPACE, feedbackAnalysis)
      ).resolves.toEqual(feedbackAnalysis);

      const [indexArgs] = storageClient.index.mock.calls[0];
      expect(indexArgs.document?.managed).toBe(true);
    });

    it('replaces the previous block rather than merging into it', async () => {
      mockStored({
        ...aiIndexDocument,
        feedback_analysis: { enabled: true, agent_id: 'previous-agent' },
      });

      await service.setFeedbackAnalysis('customer_support', DEFAULT_SPACE, { enabled: false });

      const [indexArgs] = storageClient.index.mock.calls[0];
      expect(indexArgs.document?.feedback_analysis).toEqual({ enabled: false });
    });

    it('does not re-validate the dest, so a stale backing store can still be switched off', async () => {
      mockStored(aiIndexDocument);

      await service.setFeedbackAnalysis('customer_support', DEFAULT_SPACE, { enabled: false });

      expect(esClient.indices.resolveIndex).not.toHaveBeenCalled();
    });

    it('throws AiIndexNotFoundError when the AI index does not exist', async () => {
      await expect(
        service.setFeedbackAnalysis('missing', DEFAULT_SPACE, feedbackAnalysis)
      ).rejects.toBeInstanceOf(AiIndexNotFoundError);
      expect(storageClient.index).not.toHaveBeenCalled();
    });

    it('throws AiIndexConflictError when a concurrent write wins (409)', async () => {
      mockStored(aiIndexDocument);
      storageClient.index.mockRejectedValue(createConflictError());

      await expect(
        service.setFeedbackAnalysis('customer_support', DEFAULT_SPACE, feedbackAnalysis)
      ).rejects.toBeInstanceOf(AiIndexConflictError);
    });
  });

  describe('get', () => {
    it('returns the AI index with its id', async () => {
      mockSearchHits(storedHit(aiIndexDocument));

      await expect(service.get('customer_support', DEFAULT_SPACE)).resolves.toEqual(
        toHttpItem(aiIndexDocument)
      );
    });

    it('defaults memory_enabled to false for legacy documents without the field', async () => {
      mockSearchHits(storedHit(aiIndexDocument));

      await expect(service.get('customer_support', DEFAULT_SPACE)).resolves.toEqual(
        expect.objectContaining({ id: 'customer_support', memory_enabled: false })
      );
    });

    it('round-trips memory_enabled from the stored document to the item', async () => {
      mockSearchHits(storedHit({ ...aiIndexDocument, memory_enabled: true }));

      await expect(service.get('customer_support', DEFAULT_SPACE)).resolves.toEqual(
        expect.objectContaining({ id: 'customer_support', memory_enabled: true })
      );
    });

    it('defaults managed to false for legacy documents without the field', async () => {
      const { managed: _managed, ...legacyDocument } = aiIndexDocument;
      mockSearchHits(storedHit(legacyDocument));

      await expect(service.get('customer_support', DEFAULT_SPACE)).resolves.toEqual(
        expect.objectContaining({ id: 'customer_support', managed: false })
      );
    });

    it('round-trips feedback_analysis from the stored document to the item', async () => {
      mockSearchHits(
        storedHit({
          ...aiIndexDocument,
          feedback_analysis: {
            enabled: true,
            agent_id: 'my-analysis-agent',
            schedule: { interval: '24h' },
            signal_time_range: { type: 'relative' as const, from: 'now-30d' },
          },
        })
      );

      await expect(service.get('customer_support', DEFAULT_SPACE)).resolves.toEqual(
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
      mockSearchHits(storedHit(aiIndexDocument));

      await expect(service.get('customer_support', DEFAULT_SPACE)).resolves.not.toHaveProperty(
        'feedback_analysis'
      );
    });

    it('persists feedback_analysis when creating an AI index', async () => {
      await service.create('customer_support', DEFAULT_SPACE, {
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
      await expect(service.get('missing', DEFAULT_SPACE)).rejects.toBeInstanceOf(
        AiIndexNotFoundError
      );
    });

    it('throws AiIndexNotFoundError when the stored document belongs to another space', async () => {
      await expect(service.get('ops_logs', 'team_ops')).rejects.toBeInstanceOf(
        AiIndexNotFoundError
      );
      expect(storageClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          query: {
            bool: {
              filter: [
                createSpaceDslFilter('team_ops'),
                expect.objectContaining({
                  bool: expect.objectContaining({
                    should: [{ term: { id: 'ops_logs' } }, { ids: { values: ['ops_logs'] } }],
                  }),
                }),
              ],
            },
          },
        })
      );
    });

    it('rethrows unexpected errors', async () => {
      storageClient.search.mockRejectedValue(new Error('boom'));

      await expect(service.get('customer_support', DEFAULT_SPACE)).rejects.toThrow('boom');
    });

    it('attaches derived queries to stored traces', async () => {
      const documentWithTraces: AiIndexDocument = {
        ...aiIndexDocument,
        space: 'marketing',
        traces: [
          { type: 'index', value: 'logs-*' },
          { type: 'esql', value: 'FROM foo | LIMIT 1' },
          { type: 'elastic_agent', value: 'my-agent' },
        ],
      };
      mockSearchHits(storedHit(documentWithTraces));

      await expect(service.get('customer_support', 'marketing')).resolves.toEqual(
        expect.objectContaining({
          traces: [
            { type: 'index', value: 'logs-*', query: 'FROM logs-*' },
            { type: 'esql', value: 'FROM foo | LIMIT 1', query: 'FROM foo | LIMIT 1' },
            expect.objectContaining({
              type: 'elastic_agent',
              value: 'my-agent',
              query: expect.stringContaining('FROM traces-agent_builder.otel-marketing'),
            }),
          ],
        })
      );
    });

    it('ensures a missing managed AI index and returns it', async () => {
      const managedDocument: AiIndexDocument = {
        ...aiIndexDocument,
        id: 'elastic',
        managed: true,
      };
      const ensure = jest.fn().mockImplementation(async () => {
        mockSearchHits(
          storedHit(managedDocument, { id: buildManagedAiIndexDocId(DEFAULT_SPACE, 'elastic') })
        );
      });
      mockSearchHitsOnce();
      service = new AiIndexService({
        esClient,
        logger: loggingSystemMock.createLogger(),
        managedBootstrap: {
          isManaged: (id) => id === 'elastic',
          getManagedIds: () => ['elastic'],
          ensure,
        },
      });

      await expect(service.get('elastic', DEFAULT_SPACE)).resolves.toEqual(
        toHttpItem(managedDocument)
      );
      expect(ensure).toHaveBeenCalledWith('elastic', DEFAULT_SPACE);
    });

    it('throws AiIndexNotFoundError when managed ensure succeeds but the document is still missing', async () => {
      const ensure = jest.fn().mockResolvedValue(undefined);
      service = new AiIndexService({
        esClient,
        logger: loggingSystemMock.createLogger(),
        managedBootstrap: {
          isManaged: (id) => id === 'elastic',
          getManagedIds: () => ['elastic'],
          ensure,
        },
      });

      await expect(service.get('elastic', DEFAULT_SPACE)).rejects.toBeInstanceOf(
        AiIndexNotFoundError
      );
      expect(ensure).toHaveBeenCalledWith('elastic', DEFAULT_SPACE);
    });

    it('rethrows when managed ensure fails', async () => {
      const ensure = jest.fn().mockRejectedValue(new InvalidAiIndexDestError('dest not ready'));
      service = new AiIndexService({
        esClient,
        logger: loggingSystemMock.createLogger(),
        managedBootstrap: {
          isManaged: (id) => id === 'elastic',
          getManagedIds: () => ['elastic'],
          ensure,
        },
      });

      await expect(service.get('elastic', DEFAULT_SPACE)).rejects.toBeInstanceOf(
        InvalidAiIndexDestError
      );
    });
  });

  describe('list', () => {
    it('returns AI indices mapped from search hits, in the order they came back', async () => {
      const billingDocument: AiIndexDocument = {
        ...aiIndexDocument,
        id: 'billing',
      };
      mockSearchHits(storedHit(billingDocument, { id: 'billing' }), storedHit(aiIndexDocument));

      await expect(service.list(DEFAULT_SPACE)).resolves.toEqual([
        toHttpItem(billingDocument),
        toHttpItem(aiIndexDocument),
      ]);
    });

    it('leaves the ordering to Elasticsearch, placing pre-upgrade documents last', async () => {
      mockSearchHits(storedHit(aiIndexDocument));

      await service.list(DEFAULT_SPACE);

      expect(storageClient.search).toHaveBeenCalledWith({
        size: 100,
        track_total_hits: false,
        query: createSpaceDslFilter(DEFAULT_SPACE),
        sort: [{ id: { order: 'asc', missing: '_last' } }, { _doc: { order: 'asc' } }],
      });
    });

    it("derives elastic_agent trace queries from the document's own stored space", async () => {
      const otherSpaceDocument: AiIndexDocument = {
        ...aiIndexDocument,
        space: 'other',
        traces: [{ type: 'elastic_agent', value: 'my-agent' }],
      };
      mockSearchHits(storedHit(otherSpaceDocument));

      const [item] = await service.list('marketing');

      expect(item.traces[0]).toEqual(
        expect.objectContaining({
          query: expect.stringContaining('FROM traces-agent_builder.otel-other'),
        })
      );
    });

    it('ensures missing managed AI indices and re-lists', async () => {
      const managedDocument: AiIndexDocument = {
        ...aiIndexDocument,
        id: 'elastic',
        managed: true,
      };
      const ensure = jest.fn().mockResolvedValue(undefined);
      mockSearchHitsOnce();
      mockSearchHitsOnce(
        storedHit(managedDocument, { id: buildManagedAiIndexDocId(DEFAULT_SPACE, 'elastic') })
      );
      service = new AiIndexService({
        esClient,
        logger: loggingSystemMock.createLogger(),
        managedBootstrap: {
          isManaged: (id) => id === 'elastic',
          getManagedIds: () => ['elastic'],
          ensure,
        },
      });

      await expect(service.list(DEFAULT_SPACE)).resolves.toEqual([toHttpItem(managedDocument)]);
      expect(ensure).toHaveBeenCalledWith('elastic', DEFAULT_SPACE);
      expect(storageClient.search).toHaveBeenCalledTimes(2);
    });

    it('logs and continues when one managed AI index fails to bootstrap, returning the rest', async () => {
      const okDocument: AiIndexDocument = { ...aiIndexDocument, id: 'ok', managed: true };
      mockSearchHitsOnce();
      mockSearchHitsOnce(storedHit(okDocument, { id: 'ok' }));
      const logger = loggingSystemMock.createLogger();
      const ensure = jest.fn().mockImplementation(async (id: string) => {
        if (id === 'broken') {
          throw new InvalidAiIndexDestError('dest is invalid');
        }
      });
      service = new AiIndexService({
        esClient,
        logger,
        managedBootstrap: {
          isManaged: (id) => id === 'ok' || id === 'broken',
          getManagedIds: () => ['ok', 'broken'],
          ensure,
        },
      });

      await expect(service.list(DEFAULT_SPACE)).resolves.toEqual([toHttpItem(okDocument)]);
      expect(ensure).toHaveBeenCalledWith('ok', DEFAULT_SPACE);
      expect(ensure).toHaveBeenCalledWith('broken', DEFAULT_SPACE);
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('broken'));
    });

    it('treats a missing traces field as an empty list', async () => {
      const { traces: _traces, ...documentWithoutTraces } = aiIndexDocument;
      mockSearchHits(storedHit(documentWithoutTraces));

      await expect(service.list(DEFAULT_SPACE)).resolves.toEqual([
        toHttpItem({ ...documentWithoutTraces, traces: [] }),
      ]);
    });
  });

  describe('traces persistence', () => {
    it('stores the traces sent on create', async () => {
      const traces = [{ type: 'index' as const, value: 'logs-*' }];
      await service.create('customer_support', DEFAULT_SPACE, { ...properties, traces });

      expect(storageClient.index).toHaveBeenCalledWith(
        expect.objectContaining({
          document: expect.objectContaining({ traces }),
        })
      );
    });

    it('replaces stored traces on put', async () => {
      mockSearchHits(
        storedHit({ ...aiIndexDocument, traces: [{ type: 'index' as const, value: 'old-*' }] })
      );

      const traces = [{ type: 'elastic_agent' as const, value: 'my-agent' }];
      await expect(
        service.put('customer_support', DEFAULT_SPACE, { ...properties, traces })
      ).resolves.toBe('updated');

      expect(storageClient.index).toHaveBeenCalledWith(
        expect.objectContaining({
          document: expect.objectContaining({ traces }),
        })
      );
    });
  });

  describe('delete', () => {
    it('resolves when the AI index is deleted', async () => {
      mockSearchHits(storedHit(aiIndexDocument, { id: 'auto-gen-1' }));
      storageClient.delete.mockResolvedValue({ acknowledged: true, result: 'deleted' });

      await expect(service.delete('customer_support', DEFAULT_SPACE)).resolves.toBeUndefined();
      expect(storageClient.delete).toHaveBeenCalledWith({ id: 'auto-gen-1' });
    });

    it('throws AiIndexNotFoundError when the AI index does not exist', async () => {
      await expect(service.delete('missing', DEFAULT_SPACE)).rejects.toBeInstanceOf(
        AiIndexNotFoundError
      );
      expect(storageClient.delete).not.toHaveBeenCalled();
    });

    it('throws AiIndexManagedError when the entry is managed', async () => {
      mockSearchHits(storedHit({ ...aiIndexDocument, managed: true }));

      await expect(service.delete('customer_support', DEFAULT_SPACE)).rejects.toBeInstanceOf(
        AiIndexManagedError
      );
      expect(storageClient.delete).not.toHaveBeenCalled();
    });

    it('throws AiIndexNotFoundError when the entry is removed concurrently', async () => {
      mockSearchHits(storedHit(aiIndexDocument));
      storageClient.delete.mockResolvedValue({ acknowledged: true, result: 'not_found' });

      await expect(service.delete('customer_support', DEFAULT_SPACE)).rejects.toBeInstanceOf(
        AiIndexNotFoundError
      );
    });
  });

  describe('assertCanAcceptAutomation', () => {
    it('throws AiIndexNotFoundError when the AI index does not exist', async () => {
      await expect(
        service.assertCanAcceptAutomation('missing', DEFAULT_SPACE)
      ).rejects.toBeInstanceOf(AiIndexNotFoundError);
    });

    it('throws AiIndexManagedError when the entry is managed', async () => {
      mockSearchHits(
        storedHit({ ...aiIndexDocument, managed: true }, { seqNo: 1, primaryTerm: 1 })
      );

      await expect(
        service.assertCanAcceptAutomation('customer_support', DEFAULT_SPACE, {
          type: 'workflow',
          value: 'wf-new',
        })
      ).rejects.toBeInstanceOf(AiIndexManagedError);
    });

    it('rejects when the automation limit is reached', async () => {
      mockSearchHits(
        storedHit(
          {
            ...aiIndexDocument,
            automations: Array.from({ length: MAX_AI_INDEX_AUTOMATIONS }, (_, index) => ({
              type: 'workflow' as const,
              value: `wf-${index}`,
            })),
          },
          { seqNo: 1, primaryTerm: 1 }
        )
      );

      await expect(
        service.assertCanAcceptAutomation('customer_support', DEFAULT_SPACE, {
          type: 'workflow',
          value: 'wf-new',
        })
      ).rejects.toThrow(/maximum number of automations/);
    });

    it('allows already attached workflows when the automation limit is reached', async () => {
      mockSearchHits(
        storedHit(
          {
            ...aiIndexDocument,
            automations: Array.from({ length: MAX_AI_INDEX_AUTOMATIONS }, (_, index) => ({
              type: 'workflow' as const,
              value: index === 0 ? 'nightly-refresh' : `wf-${index}`,
            })),
          },
          { seqNo: 1, primaryTerm: 1 }
        )
      );

      await expect(
        service.assertCanAcceptAutomation('customer_support', DEFAULT_SPACE, {
          type: 'workflow',
          value: 'nightly-refresh',
        })
      ).resolves.toBeUndefined();
    });
  });

  describe('addAutomation', () => {
    it('appends a workflow automation to the AI index', async () => {
      mockSearchHits(storedHit(aiIndexDocument, { id: 'auto-gen-1' }));
      storageClient.index.mockResolvedValue({
        _id: 'auto-gen-1',
        _index: AI_INDICES_INDEX,
        _seq_no: 8,
        _primary_term: 2,
        _shards: { total: 1, successful: 1, failed: 0 },
        _version: 2,
        result: 'updated',
      } as Awaited<ReturnType<AiIndexStorageClient['index']>>);

      await expect(
        service.addAutomation('customer_support', DEFAULT_SPACE, {
          type: 'workflow',
          value: 'wf-new',
        })
      ).resolves.toBe('attached');

      expect(storageClient.index).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'auto-gen-1',
          if_seq_no: 7,
          if_primary_term: 2,
          document: expect.objectContaining({
            automations: [
              { type: 'workflow', value: 'nightly-refresh' },
              { type: 'workflow', value: 'wf-new' },
            ],
          }),
        })
      );
    });

    it('returns already_attached when the workflow is already linked', async () => {
      mockSearchHits(storedHit(aiIndexDocument));

      await expect(
        service.addAutomation('customer_support', DEFAULT_SPACE, {
          type: 'workflow',
          value: 'nightly-refresh',
        })
      ).resolves.toBe('already_attached');
      expect(storageClient.index).not.toHaveBeenCalled();
    });

    it('retries on concurrent writes', async () => {
      mockSearchHitsOnce(
        storedHit(aiIndexDocument, { id: 'auto-gen-1', seqNo: 7, primaryTerm: 2 })
      );
      mockSearchHitsOnce(
        storedHit(
          {
            ...aiIndexDocument,
            automations: [
              ...aiIndexDocument.automations,
              { type: 'workflow', value: 'wf-concurrent' },
            ],
          },
          { id: 'auto-gen-1', seqNo: 8, primaryTerm: 2 }
        )
      );
      storageClient.index.mockRejectedValueOnce(createConflictError()).mockResolvedValueOnce({
        _id: 'auto-gen-1',
        _index: AI_INDICES_INDEX,
        _seq_no: 9,
        _primary_term: 2,
        _shards: { total: 1, successful: 1, failed: 0 },
        _version: 3,
        result: 'updated',
      } as Awaited<ReturnType<AiIndexStorageClient['index']>>);

      await expect(
        service.addAutomation('customer_support', DEFAULT_SPACE, {
          type: 'workflow',
          value: 'wf-new',
        })
      ).resolves.toBe('attached');
      expect(storageClient.index).toHaveBeenCalledTimes(2);
    });

    it('throws AiIndexManagedError when the entry is managed', async () => {
      mockSearchHits(
        storedHit({ ...aiIndexDocument, managed: true }, { seqNo: 1, primaryTerm: 1 })
      );

      await expect(
        service.addAutomation('customer_support', DEFAULT_SPACE, {
          type: 'workflow',
          value: 'wf-new',
        })
      ).rejects.toBeInstanceOf(AiIndexManagedError);
    });

    it('rejects when the automation limit is reached', async () => {
      mockSearchHits(
        storedHit(
          {
            ...aiIndexDocument,
            automations: Array.from({ length: MAX_AI_INDEX_AUTOMATIONS }, (_, index) => ({
              type: 'workflow' as const,
              value: `wf-${index}`,
            })),
          },
          { seqNo: 1, primaryTerm: 1 }
        )
      );

      await expect(
        service.addAutomation('customer_support', DEFAULT_SPACE, {
          type: 'workflow',
          value: 'wf-new',
        })
      ).rejects.toThrow(/maximum number of automations/);
    });
  });

  describe('pre-upgrade documents', () => {
    const preUpgradeDocument: StoredAiIndexDocument = {
      description: 'legacy orders',
      dest: { type: 'data_stream', value: 'ai-index-ds-customer_support*' },
      automations: [],
      sources: [],
      date_created: '2026-01-01T00:00:00.000Z',
      date_modified: '2026-01-01T00:00:00.000Z',
    };

    it('finds, lists, and updates a pre-upgrade document in place in the default space', async () => {
      mockSearchHits(storedHit(preUpgradeDocument, { id: 'orders', seqNo: 3, primaryTerm: 1 }));

      await expect(service.get('orders', DEFAULT_SPACE)).resolves.toEqual(
        expect.objectContaining({ id: 'orders', managed: false })
      );
      await expect(service.list(DEFAULT_SPACE)).resolves.toEqual([
        expect.objectContaining({ id: 'orders' }),
      ]);

      await expect(service.put('orders', DEFAULT_SPACE, properties)).resolves.toBe('updated');
      expect(storageClient.index).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'orders',
          if_seq_no: 3,
          if_primary_term: 1,
          document: expect.objectContaining({
            id: 'orders',
            space: DEFAULT_SPACE,
          }),
        })
      );
    });

    it('is not visible from another space', async () => {
      await expect(service.get('orders', 'team')).rejects.toBeInstanceOf(AiIndexNotFoundError);
      expect(storageClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          query: {
            bool: {
              filter: [
                createSpaceDslFilter('team'),
                expect.objectContaining({
                  bool: expect.objectContaining({
                    should: [{ term: { id: 'orders' } }, { ids: { values: ['orders'] } }],
                  }),
                }),
              ],
            },
          },
        })
      );
    });
  });

  describe('space isolation', () => {
    it('treats the same logical id as independent across spaces', async () => {
      const defaultDocument: AiIndexDocument = {
        ...aiIndexDocument,
        id: 'orders',
        space: DEFAULT_SPACE,
        description: 'default orders',
      };
      const teamDocument: AiIndexDocument = {
        ...aiIndexDocument,
        id: 'orders',
        space: 'team',
        description: 'team orders',
      };

      mockSearchHitsOnce(storedHit(defaultDocument, { id: 'es-default' }));
      mockSearchHitsOnce(storedHit(teamDocument, { id: 'es-team' }));

      await expect(service.get('orders', DEFAULT_SPACE)).resolves.toEqual(
        toHttpItem(defaultDocument)
      );
      await expect(service.get('orders', 'team')).resolves.toEqual(toHttpItem(teamDocument));

      mockSearchHits();
      await expect(service.create('orders', 'team', properties)).resolves.toBeUndefined();
      expect(storageClient.index).toHaveBeenCalledWith(
        expect.objectContaining({
          document: expect.objectContaining({ id: 'orders', space: 'team' }),
        })
      );
      expect(storageClient.index.mock.calls[0][0]).not.toHaveProperty('id');
    });
  });
});
