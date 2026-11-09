/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import type { DiagnosticResult } from '@elastic/elasticsearch';
import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { ES_AI_INDEX_PATH, MAX_AI_INDEX_AUTOMATIONS } from '../../common/constants';
import { AiIndexService } from './service';
import {
  InvalidAiIndexDestError,
  AiIndexConflictError,
  AiIndexManagedError,
  AiIndexNotFoundError,
  AiIndexIdConflictError,
  AiIndexAlreadyExistsError,
} from './errors';
import type { AiIndexRecord, AiIndexRecordWrite } from './registry_api';

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

const createNotFoundError = () => createResponseError('resource_not_found_exception', 404);
const createConflictError = () => createResponseError('version_conflict_engine_exception', 409);

const DEFAULT_SPACE = 'default';
const NOW = '2026-07-09T08:00:00.000Z';

const aiIndexRecord: AiIndexRecord = {
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

const toHttpItem = (record: AiIndexRecord) => {
  const { space: _space, ...item } = record;
  return {
    ...item,
    managed: record.managed ?? false,
    memory_enabled:
      record.memory_enabled !== undefined ? record.memory_enabled : record.managed !== true,
    traces: record.traces ?? [],
  };
};

interface RequestParams {
  method: string;
  path: string;
  querystring?: Record<string, unknown>;
  body?: AiIndexRecordWrite;
}

describe('AiIndexService', () => {
  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
  let service: AiIndexService;
  /** In-memory stand-in for the ES registry, keyed `<space>:<id>` like the real one. */
  let registry: Map<string, AiIndexRecord>;
  /** When set, the next write rejects with it, standing in for a concurrent writer. */
  let nextWriteError: Error | undefined;

  const key = (space: string, id: string) => `${space}:${id}`;
  const seed = (...records: AiIndexRecord[]) =>
    records.forEach((record) => registry.set(key(record.space, record.id), record));
  const stored = (id: string, space = DEFAULT_SPACE) => registry.get(key(space, id));

  const requests = () => esClient.transport.request.mock.calls.map(([params]) => params);
  const writes = () => requests().filter((params) => params.method === 'PUT');
  const lastWrite = () => {
    const [params] = writes().slice(-1) as RequestParams[];
    return params;
  };

  const fakeRegistry = async (params: RequestParams) => {
    const { method, path, querystring = {}, body } = params;
    const id = path.startsWith(`${ES_AI_INDEX_PATH}/`)
      ? decodeURIComponent(path.slice(ES_AI_INDEX_PATH.length + 1))
      : undefined;
    if (method === 'PUT' && id !== undefined && body !== undefined) {
      if (nextWriteError) {
        const error = nextWriteError;
        nextWriteError = undefined;
        throw error;
      }
      const existing = registry.get(key(body.space, id));
      if (existing && querystring.create) {
        throw createConflictError();
      }
      const record: AiIndexRecord = {
        ...body,
        id,
        date_created: existing?.date_created ?? NOW,
        date_modified: NOW,
      };
      registry.set(key(body.space, id), record);
      return { result: existing ? 'updated' : 'created', ai_index: record };
    }
    if (method === 'GET' && id !== undefined) {
      const record = registry.get(key(String(querystring.space), id));
      if (!record) {
        throw createNotFoundError();
      }
      return record;
    }
    if (method === 'GET') {
      const results = [...registry.values()]
        .filter(
          (record) =>
            (querystring.space === undefined || record.space === querystring.space) &&
            (querystring.dest === undefined || record.dest.value === querystring.dest)
        )
        .sort((a, b) => a.id.localeCompare(b.id))
        .slice(0, Number(querystring.size));
      return { count: results.length, results };
    }
    if (method === 'DELETE' && id !== undefined) {
      if (!registry.delete(key(String(querystring.space), id))) {
        throw createNotFoundError();
      }
      return { acknowledged: true };
    }
    throw new Error(`Unexpected request ${method} ${path}`);
  };

  const createService = (
    managedBootstrap?: ConstructorParameters<typeof AiIndexService>[0]['managedBootstrap']
  ) => new AiIndexService({ esClient, logger: loggingSystemMock.createLogger(), managedBootstrap });

  beforeEach(() => {
    jest.clearAllMocks();
    registry = new Map();
    nextWriteError = undefined;
    esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.transport.request.mockImplementation(fakeRegistry as never);
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
    service = createService();
  });

  const properties = {
    description: 'KIs representing previously answered, commonly asked questions',
    dest: { type: 'data_stream' as const, value: 'ai-index-ds-customer_support' },
    automations: [{ type: 'workflow' as const, value: 'nightly-refresh' }],
    sources: [{ type: 'esql' as const, value: 'FROM ai-index-customer_support | LIMIT 10' }],
    traces: [],
  };

  describe('create', () => {
    it('creates the record through the API with create=true and no dates', async () => {
      await expect(
        service.create('customer_support', DEFAULT_SPACE, properties)
      ).resolves.toBeUndefined();

      expect(lastWrite()).toEqual({
        method: 'PUT',
        path: `${ES_AI_INDEX_PATH}/customer_support`,
        querystring: { create: true },
        body: { ...properties, space: DEFAULT_SPACE, managed: false, memory_enabled: true },
      });
      expect(lastWrite().body).not.toHaveProperty('date_created');
      expect(lastWrite().body).not.toHaveProperty('date_modified');
      expect(stored('customer_support')).toEqual(
        expect.objectContaining({ id: 'customer_support', space: DEFAULT_SPACE })
      );
    });

    it('defaults memory_enabled to true', async () => {
      await service.create('customer_support', DEFAULT_SPACE, properties);

      expect(lastWrite().body).toEqual(expect.objectContaining({ memory_enabled: true }));
    });

    it('throws AiIndexAlreadyExistsError when the id already exists', async () => {
      seed(aiIndexRecord);

      await expect(
        service.create('customer_support', DEFAULT_SPACE, properties)
      ).rejects.toBeInstanceOf(AiIndexAlreadyExistsError);
      expect(writes()).toHaveLength(0);
    });

    it('throws AiIndexConflictError when a concurrent create wins (409)', async () => {
      nextWriteError = createConflictError();

      await expect(
        service.create('customer_support', DEFAULT_SPACE, properties)
      ).rejects.toBeInstanceOf(AiIndexConflictError);
    });

    it('refuses to create a reserved managed id', async () => {
      service = createService({
        isManaged: (id) => id === 'elastic',
        getManagedIds: () => ['elastic'],
        getRegistration: () => undefined,
        ensure: jest.fn(),
      });

      await expect(service.create('elastic', DEFAULT_SPACE, properties)).rejects.toBeInstanceOf(
        AiIndexManagedError
      );
      expect(requests()).toHaveLength(0);
    });

    it('rejects an invalid dest before writing', async () => {
      await expect(
        service.create('customer_support', DEFAULT_SPACE, {
          ...properties,
          dest: { type: 'data_stream', value: 'customer_support' },
        })
      ).rejects.toBeInstanceOf(InvalidAiIndexDestError);
      expect(requests()).toHaveLength(0);
    });

    it('rejects a dot-prefixed index dest on create', async () => {
      await expect(
        service.create('customer_support', DEFAULT_SPACE, {
          ...properties,
          dest: { type: 'index', value: '.ai-index-idx-elastic-index' },
        })
      ).rejects.toBeInstanceOf(InvalidAiIndexDestError);
      expect(requests()).toHaveLength(0);
    });

    it('persists feedback_analysis and traces sent on create', async () => {
      const traces = [{ type: 'index' as const, value: 'logs-*' }];
      await service.create('customer_support', DEFAULT_SPACE, {
        ...properties,
        traces,
        feedback_analysis: { enabled: false, agent_id: 'my-analysis-agent' },
      });

      expect(lastWrite().body).toEqual(
        expect.objectContaining({
          traces,
          feedback_analysis: { enabled: false, agent_id: 'my-analysis-agent' },
        })
      );
    });
  });

  describe('put', () => {
    it('creates an AI index when none exists', async () => {
      await expect(service.put('customer_support', DEFAULT_SPACE, properties)).resolves.toBe(
        'created'
      );

      expect(lastWrite()).toEqual({
        method: 'PUT',
        path: `${ES_AI_INDEX_PATH}/customer_support`,
        body: { ...properties, space: DEFAULT_SPACE, managed: false, memory_enabled: true },
      });
    });

    it('replaces an existing AI index, leaving date_created to the server', async () => {
      seed(aiIndexRecord);

      await expect(service.put('customer_support', DEFAULT_SPACE, properties)).resolves.toBe(
        'updated'
      );

      expect(lastWrite().querystring).toBeUndefined();
      expect(lastWrite().body).not.toHaveProperty('date_created');
      expect(stored('customer_support')?.date_created).toBe(aiIndexRecord.date_created);
      expect(stored('customer_support')?.date_modified).toBe(NOW);
    });

    it('persists feedback_analysis, memory_enabled, and traces when replacing', async () => {
      seed({ ...aiIndexRecord, traces: [{ type: 'index', value: 'old-*' }] });
      const traces = [{ type: 'elastic_agent' as const, value: 'my-agent' }];

      await service.put('customer_support', DEFAULT_SPACE, {
        ...properties,
        traces,
        memory_enabled: false,
        feedback_analysis: { enabled: true, agent_id: 'my-analysis-agent' },
      });

      expect(lastWrite().body).toEqual(
        expect.objectContaining({
          traces,
          memory_enabled: false,
          feedback_analysis: { enabled: true, agent_id: 'my-analysis-agent' },
        })
      );
    });

    it('throws AiIndexConflictError when a concurrent write wins (409)', async () => {
      nextWriteError = createConflictError();

      await expect(
        service.put('customer_support', DEFAULT_SPACE, properties)
      ).rejects.toBeInstanceOf(AiIndexConflictError);
    });

    it('throws AiIndexManagedError when the entry is managed', async () => {
      seed({ ...aiIndexRecord, managed: true });

      await expect(
        service.put('customer_support', DEFAULT_SPACE, properties)
      ).rejects.toBeInstanceOf(AiIndexManagedError);
      expect(writes()).toHaveLength(0);
    });

    it('refuses to put a reserved managed id that does not exist yet', async () => {
      service = createService({
        isManaged: (id) => id === 'elastic',
        getManagedIds: () => ['elastic'],
        getRegistration: () => undefined,
        ensure: jest.fn(),
      });

      await expect(service.put('elastic', DEFAULT_SPACE, properties)).rejects.toBeInstanceOf(
        AiIndexManagedError
      );
      expect(writes()).toHaveLength(0);
    });

    it('allows a data_stream dest with no matches yet (lazy creation)', async () => {
      esClient.indices.resolveIndex.mockResponse({ indices: [], aliases: [], data_streams: [] });

      await expect(service.put('customer_support', DEFAULT_SPACE, properties)).resolves.toBe(
        'created'
      );
      expect(writes()).toHaveLength(1);
    });

    it('allows a data_stream dest when resolveIndex returns 404', async () => {
      esClient.indices.resolveIndex.mockRejectedValue(createNotFoundError());

      await expect(service.put('customer_support', DEFAULT_SPACE, properties)).resolves.toBe(
        'created'
      );
      expect(writes()).toHaveLength(1);
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
      expect(writes()).toHaveLength(0);
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
      expect(writes()).toHaveLength(0);
    });

    it('rejects a data_stream dest value not prefixed with ai-index-ds- without resolving it', async () => {
      await expect(
        service.put('customer_support', DEFAULT_SPACE, {
          ...properties,
          dest: { type: 'data_stream', value: 'customer_support' },
        })
      ).rejects.toBeInstanceOf(InvalidAiIndexDestError);
      expect(esClient.indices.resolveIndex).not.toHaveBeenCalled();
      expect(writes()).toHaveLength(0);
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
      expect(writes()).toHaveLength(0);
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
      expect(writes()).toHaveLength(1);
    });

    it('allows an index dest that matches no index yet (lazy creation)', async () => {
      esClient.indices.resolveIndex.mockResponse({ indices: [], aliases: [], data_streams: [] });

      await expect(service.put('logs', DEFAULT_SPACE, indexProperties)).resolves.toBe('created');
      expect(writes()).toHaveLength(1);
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
      expect(writes()).toHaveLength(0);
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
      expect(writes()).toHaveLength(0);
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
      expect(writes()).toHaveLength(0);
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
      expect(writes()).toHaveLength(1);
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
      expect(writes()).toHaveLength(1);
    });

    it('rejects a wildcard index dest without resolving it', async () => {
      await expect(
        service.put('logs', DEFAULT_SPACE, {
          ...indexProperties,
          dest: { type: 'index', value: 'ai-index-idx-logs-*' },
        })
      ).rejects.toThrow(/must name a single index or data stream, not a pattern/);
      expect(esClient.indices.resolveIndex).not.toHaveBeenCalled();
      expect(writes()).toHaveLength(0);
    });

    it('rejects a comma-separated index dest without resolving it', async () => {
      await expect(
        service.put('logs', DEFAULT_SPACE, {
          ...indexProperties,
          dest: { type: 'index', value: 'ai-index-idx-logs,ai-index-idx-kibana' },
        })
      ).rejects.toBeInstanceOf(InvalidAiIndexDestError);
      expect(esClient.indices.resolveIndex).not.toHaveBeenCalled();
      expect(writes()).toHaveLength(0);
    });

    it('rejects an index dest whose id has invalid characters', async () => {
      await expect(
        service.put('logs', DEFAULT_SPACE, {
          ...indexProperties,
          dest: { type: 'index', value: 'ai-index-idx-logs?' },
        })
      ).rejects.toThrow(/the part after 'ai-index-idx-' must be a valid AI index id/);
      expect(esClient.indices.resolveIndex).not.toHaveBeenCalled();
      expect(writes()).toHaveLength(0);
    });

    it('rejects an index dest value not prefixed with ai-index-idx- without resolving it', async () => {
      await expect(
        service.put('logs', DEFAULT_SPACE, {
          ...indexProperties,
          dest: { type: 'index', value: '.kibana' },
        })
      ).rejects.toBeInstanceOf(InvalidAiIndexDestError);
      expect(esClient.indices.resolveIndex).not.toHaveBeenCalled();
      expect(writes()).toHaveLength(0);
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
      expect(writes()).toHaveLength(0);
    });

    it('rejects a dot-prefixed index dest on put', async () => {
      await expect(
        service.put('elastic', DEFAULT_SPACE, {
          ...indexProperties,
          dest: { type: 'index', value: '.ai-index-idx-elastic-index' },
        })
      ).rejects.toBeInstanceOf(InvalidAiIndexDestError);
      expect(esClient.indices.resolveIndex).not.toHaveBeenCalled();
      expect(writes()).toHaveLength(0);
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

    it('creates a managed AI index with create=true and memory off by default', async () => {
      mockValidIndexDest();

      await expect(service.putManaged('elastic', DEFAULT_SPACE, managedProperties)).resolves.toBe(
        'created'
      );

      expect(lastWrite()).toEqual({
        method: 'PUT',
        path: `${ES_AI_INDEX_PATH}/elastic`,
        querystring: { create: true },
        body: { ...managedProperties, space: DEFAULT_SPACE, managed: true, memory_enabled: false },
      });
    });

    it('persists an explicit memory opt-in for a managed AI index', async () => {
      mockValidIndexDest();

      await service.putManaged('elastic', DEFAULT_SPACE, {
        ...managedProperties,
        memory_enabled: true,
      });

      expect(lastWrite().body).toEqual(
        expect.objectContaining({ managed: true, memory_enabled: true })
      );
    });

    it('tolerates an existing managed entry without rewriting it', async () => {
      mockValidIndexDest();
      seed({ ...aiIndexRecord, id: 'elastic', managed: true });

      await expect(service.putManaged('elastic', DEFAULT_SPACE, managedProperties)).resolves.toBe(
        'updated'
      );
      expect(writes()).toHaveLength(0);
      expect(stored('elastic')?.description).toBe(aiIndexRecord.description);
    });

    it('tolerates losing a concurrent create of the same managed entry', async () => {
      mockValidIndexDest();
      nextWriteError = createConflictError();

      await expect(service.putManaged('elastic', DEFAULT_SPACE, managedProperties)).resolves.toBe(
        'updated'
      );
    });

    it('throws AiIndexIdConflictError when the id is taken by an unmanaged entry', async () => {
      mockValidIndexDest();
      seed({ ...aiIndexRecord, id: 'elastic', managed: false });

      await expect(
        service.putManaged('elastic', DEFAULT_SPACE, managedProperties)
      ).rejects.toBeInstanceOf(AiIndexIdConflictError);
      expect(writes()).toHaveLength(0);
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
      expect(writes()).toHaveLength(1);
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
      expect(writes()).toHaveLength(1);
    });
  });

  describe('setFeedbackAnalysis', () => {
    const feedbackAnalysis = {
      enabled: true,
      agent_id: 'my-analysis-agent',
      schedule: { interval: '24h' },
      signal_time_range: { type: 'relative' as const, from: 'now-30d' },
    };

    it('writes the block and leaves the rest of the entry untouched', async () => {
      seed(aiIndexRecord);

      await expect(
        service.setFeedbackAnalysis('customer_support', DEFAULT_SPACE, feedbackAnalysis)
      ).resolves.toEqual(feedbackAnalysis);

      expect(lastWrite().body).toEqual({
        space: DEFAULT_SPACE,
        description: aiIndexRecord.description,
        managed: false,
        memory_enabled: true,
        dest: aiIndexRecord.dest,
        automations: aiIndexRecord.automations,
        sources: aiIndexRecord.sources,
        traces: [],
        feedback_analysis: feedbackAnalysis,
      });
      expect(lastWrite().querystring).toBeUndefined();
    });

    it('is permitted on managed AI indices, and preserves the managed flag', async () => {
      seed({ ...aiIndexRecord, managed: true });

      await expect(
        service.setFeedbackAnalysis('customer_support', DEFAULT_SPACE, feedbackAnalysis)
      ).resolves.toEqual(feedbackAnalysis);

      expect(lastWrite().body).toEqual(expect.objectContaining({ managed: true }));
    });

    it('preserves the disabled fallback for a managed AI index without the memory flag', async () => {
      seed({ ...aiIndexRecord, managed: true });

      await service.setFeedbackAnalysis('customer_support', DEFAULT_SPACE, feedbackAnalysis);

      expect(lastWrite().body).toEqual(expect.objectContaining({ memory_enabled: false }));
    });

    it('replaces the previous block rather than merging into it', async () => {
      seed({ ...aiIndexRecord, feedback_analysis: { enabled: true, agent_id: 'previous-agent' } });

      await service.setFeedbackAnalysis('customer_support', DEFAULT_SPACE, { enabled: false });

      expect(lastWrite().body?.feedback_analysis).toEqual({ enabled: false });
    });

    it('does not re-validate the dest, so a stale backing store can still be switched off', async () => {
      seed(aiIndexRecord);

      await service.setFeedbackAnalysis('customer_support', DEFAULT_SPACE, { enabled: false });

      expect(esClient.indices.resolveIndex).not.toHaveBeenCalled();
    });

    it('throws AiIndexNotFoundError when the AI index does not exist', async () => {
      await expect(
        service.setFeedbackAnalysis('missing', DEFAULT_SPACE, feedbackAnalysis)
      ).rejects.toBeInstanceOf(AiIndexNotFoundError);
      expect(writes()).toHaveLength(0);
    });

    it('throws AiIndexConflictError when a concurrent write wins (409)', async () => {
      seed(aiIndexRecord);
      nextWriteError = createConflictError();

      await expect(
        service.setFeedbackAnalysis('customer_support', DEFAULT_SPACE, feedbackAnalysis)
      ).rejects.toBeInstanceOf(AiIndexConflictError);
    });
  });

  describe('get', () => {
    it('reads the record for the id and space', async () => {
      seed(aiIndexRecord);

      await expect(service.get('customer_support', DEFAULT_SPACE)).resolves.toEqual(
        toHttpItem(aiIndexRecord)
      );
      expect(requests()).toEqual([
        {
          method: 'GET',
          path: `${ES_AI_INDEX_PATH}/customer_support`,
          querystring: { space: DEFAULT_SPACE },
        },
      ]);
    });

    it('defaults memory_enabled to true for user-created records without the flag', async () => {
      seed(aiIndexRecord);

      await expect(service.get('customer_support', DEFAULT_SPACE)).resolves.toEqual(
        expect.objectContaining({ id: 'customer_support', memory_enabled: true })
      );
    });

    it('defaults memory_enabled to false for managed records without the flag', async () => {
      seed({ ...aiIndexRecord, managed: true });

      await expect(service.get('customer_support', DEFAULT_SPACE)).resolves.toEqual(
        expect.objectContaining({ id: 'customer_support', memory_enabled: false })
      );
    });

    it('round-trips memory_enabled from the record to the item', async () => {
      seed({ ...aiIndexRecord, managed: true, memory_enabled: true });

      await expect(service.get('customer_support', DEFAULT_SPACE)).resolves.toEqual(
        expect.objectContaining({ id: 'customer_support', memory_enabled: true })
      );
    });

    it('defaults managed to false for records without the field', async () => {
      const { managed: _managed, ...record } = aiIndexRecord;
      seed(record);

      await expect(service.get('customer_support', DEFAULT_SPACE)).resolves.toEqual(
        expect.objectContaining({ id: 'customer_support', managed: false })
      );
    });

    it('round-trips feedback_analysis and omits it when absent', async () => {
      const feedbackAnalysis = {
        enabled: true,
        agent_id: 'my-analysis-agent',
        schedule: { interval: '24h' },
        signal_time_range: { type: 'relative' as const, from: 'now-30d' },
      };
      seed(aiIndexRecord, {
        ...aiIndexRecord,
        id: 'analyzed',
        feedback_analysis: feedbackAnalysis,
      });

      await expect(service.get('analyzed', DEFAULT_SPACE)).resolves.toEqual(
        expect.objectContaining({ feedback_analysis: feedbackAnalysis })
      );
      await expect(service.get('customer_support', DEFAULT_SPACE)).resolves.not.toHaveProperty(
        'feedback_analysis'
      );
    });

    it('throws AiIndexNotFoundError when the AI index does not exist', async () => {
      await expect(service.get('missing', DEFAULT_SPACE)).rejects.toBeInstanceOf(
        AiIndexNotFoundError
      );
    });

    it('throws AiIndexNotFoundError when the record belongs to another space', async () => {
      seed(aiIndexRecord);

      await expect(service.get('customer_support', 'team_ops')).rejects.toBeInstanceOf(
        AiIndexNotFoundError
      );
      expect(requests()).toEqual([expect.objectContaining({ querystring: { space: 'team_ops' } })]);
    });

    it('rethrows unexpected errors', async () => {
      esClient.transport.request.mockRejectedValue(new Error('boom'));

      await expect(service.get('customer_support', DEFAULT_SPACE)).rejects.toThrow('boom');
    });

    it('attaches derived queries to stored traces', async () => {
      seed({
        ...aiIndexRecord,
        space: 'marketing',
        traces: [
          { type: 'index', value: 'logs-*' },
          { type: 'esql', value: 'FROM foo | LIMIT 1' },
          { type: 'elastic_agent', value: 'my-agent' },
        ],
      });

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

    it('reads dest from the registration for a managed AI index, leaving the rest as stored', async () => {
      const staleRecord: AiIndexRecord = {
        ...aiIndexRecord,
        id: 'elastic',
        managed: true,
        dest: { type: 'index', value: 'ai-index-idx-sml-data' },
      };
      seed(staleRecord);
      service = createService({
        isManaged: (id) => id === 'elastic',
        getManagedIds: () => ['elastic'],
        getRegistration: () => ({
          description: 'from code',
          dest: { type: 'index', value: '.ai-index-idx-elastic-index' },
          automations: [{ type: 'workflow', value: 'from-code' }],
          sources: [{ type: 'esql', value: 'FROM code' }],
          traces: [{ type: 'index', value: 'from-code' }],
        }),
        ensure: jest.fn(),
      });

      await expect(service.get('elastic', DEFAULT_SPACE)).resolves.toEqual(
        toHttpItem({
          ...staleRecord,
          dest: { type: 'index', value: '.ai-index-idx-elastic-index' },
        })
      );
    });

    it('returns a user-owned AI index squatting a managed id as stored', async () => {
      const squatter: AiIndexRecord = { ...aiIndexRecord, id: 'elastic', managed: false };
      seed(squatter);
      const getRegistration = jest.fn();
      service = createService({
        isManaged: (id) => id === 'elastic',
        getManagedIds: () => ['elastic'],
        getRegistration,
        ensure: jest.fn(),
      });

      await expect(service.get('elastic', DEFAULT_SPACE)).resolves.toEqual(toHttpItem(squatter));
      expect(getRegistration).not.toHaveBeenCalled();
    });

    it('ensures a missing managed AI index and returns it', async () => {
      const managedRecord: AiIndexRecord = { ...aiIndexRecord, id: 'elastic', managed: true };
      const ensure = jest.fn().mockImplementation(async () => seed(managedRecord));
      service = createService({
        isManaged: (id) => id === 'elastic',
        getManagedIds: () => ['elastic'],
        getRegistration: () => undefined,
        ensure,
      });

      await expect(service.get('elastic', DEFAULT_SPACE)).resolves.toEqual(
        toHttpItem(managedRecord)
      );
      expect(ensure).toHaveBeenCalledWith('elastic', DEFAULT_SPACE);
    });

    it('throws AiIndexNotFoundError when managed ensure succeeds but the record is still missing', async () => {
      const ensure = jest.fn().mockResolvedValue(undefined);
      service = createService({
        isManaged: (id) => id === 'elastic',
        getManagedIds: () => ['elastic'],
        getRegistration: () => undefined,
        ensure,
      });

      await expect(service.get('elastic', DEFAULT_SPACE)).rejects.toBeInstanceOf(
        AiIndexNotFoundError
      );
      expect(ensure).toHaveBeenCalledWith('elastic', DEFAULT_SPACE);
    });

    it('rethrows when managed ensure fails', async () => {
      service = createService({
        isManaged: (id) => id === 'elastic',
        getManagedIds: () => ['elastic'],
        getRegistration: () => undefined,
        ensure: jest.fn().mockRejectedValue(new InvalidAiIndexDestError('dest not ready')),
      });

      await expect(service.get('elastic', DEFAULT_SPACE)).rejects.toBeInstanceOf(
        InvalidAiIndexDestError
      );
    });
  });

  describe('list', () => {
    it('lists the space through the API, sorted by id', async () => {
      const billingRecord: AiIndexRecord = { ...aiIndexRecord, id: 'billing' };
      seed(aiIndexRecord, billingRecord);

      await expect(service.list(DEFAULT_SPACE)).resolves.toEqual([
        toHttpItem(billingRecord),
        toHttpItem(aiIndexRecord),
      ]);
      expect(requests()).toEqual([
        { method: 'GET', path: ES_AI_INDEX_PATH, querystring: { space: DEFAULT_SPACE, size: 100 } },
      ]);
    });

    it('does not list records from other spaces', async () => {
      seed(aiIndexRecord, { ...aiIndexRecord, id: 'other', space: 'marketing' });

      await expect(service.list(DEFAULT_SPACE)).resolves.toEqual([toHttpItem(aiIndexRecord)]);
    });

    it("derives elastic_agent trace queries from the record's own space", async () => {
      seed({
        ...aiIndexRecord,
        space: 'other',
        traces: [{ type: 'elastic_agent', value: 'my-agent' }],
      });

      const [item] = await service.list('other');

      expect(item.traces[0]).toEqual(
        expect.objectContaining({
          query: expect.stringContaining('FROM traces-agent_builder.otel-other'),
        })
      );
    });

    it('ensures missing managed AI indices and re-lists', async () => {
      const managedRecord: AiIndexRecord = { ...aiIndexRecord, id: 'elastic', managed: true };
      const ensure = jest.fn().mockImplementation(async () => seed(managedRecord));
      service = createService({
        isManaged: (id) => id === 'elastic',
        getManagedIds: () => ['elastic'],
        getRegistration: () => undefined,
        ensure,
      });

      await expect(service.list(DEFAULT_SPACE)).resolves.toEqual([toHttpItem(managedRecord)]);
      expect(ensure).toHaveBeenCalledWith('elastic', DEFAULT_SPACE);
      expect(requests().filter(({ path }) => path === ES_AI_INDEX_PATH)).toHaveLength(2);
    });

    it('resolves managed AI indices against their registration, leaving user-owned ones as stored', async () => {
      const managedRecord: AiIndexRecord = {
        ...aiIndexRecord,
        id: 'elastic',
        managed: true,
        dest: { type: 'index', value: 'ai-index-idx-sml-data' },
      };
      seed(managedRecord, aiIndexRecord);
      service = createService({
        isManaged: (id) => id === 'elastic',
        getManagedIds: () => ['elastic'],
        getRegistration: () => ({
          dest: { type: 'index', value: '.ai-index-idx-elastic-index' },
          automations: [],
          sources: [],
          traces: [],
        }),
        ensure: jest.fn(),
      });

      await expect(service.list(DEFAULT_SPACE)).resolves.toEqual([
        toHttpItem(aiIndexRecord),
        toHttpItem({
          ...managedRecord,
          dest: { type: 'index', value: '.ai-index-idx-elastic-index' },
        }),
      ]);
      expect(requests()).toHaveLength(1);
    });

    it('logs and continues when one managed AI index fails to bootstrap, returning the rest', async () => {
      const okRecord: AiIndexRecord = { ...aiIndexRecord, id: 'ok', managed: true };
      const logger = loggingSystemMock.createLogger();
      const ensure = jest.fn().mockImplementation(async (id: string) => {
        if (id === 'broken') {
          throw new InvalidAiIndexDestError('dest is invalid');
        }
        seed(okRecord);
      });
      service = new AiIndexService({
        esClient,
        logger,
        managedBootstrap: {
          isManaged: (id) => id === 'ok' || id === 'broken',
          getManagedIds: () => ['ok', 'broken'],
          getRegistration: () => undefined,
          ensure,
        },
      });

      await expect(service.list(DEFAULT_SPACE)).resolves.toEqual([toHttpItem(okRecord)]);
      expect(ensure).toHaveBeenCalledWith('ok', DEFAULT_SPACE);
      expect(ensure).toHaveBeenCalledWith('broken', DEFAULT_SPACE);
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('broken'));
    });

    it('treats a missing traces field as an empty list', async () => {
      const { traces: _traces, ...recordWithoutTraces } = aiIndexRecord;
      seed(recordWithoutTraces);

      await expect(service.list(DEFAULT_SPACE)).resolves.toEqual([
        toHttpItem({ ...recordWithoutTraces, traces: [] }),
      ]);
    });
  });

  describe('delete', () => {
    it('deletes the record for the id and space', async () => {
      seed(aiIndexRecord);

      await expect(service.delete('customer_support', DEFAULT_SPACE)).resolves.toBeUndefined();
      expect(requests()).toContainEqual({
        method: 'DELETE',
        path: `${ES_AI_INDEX_PATH}/customer_support`,
        querystring: { space: DEFAULT_SPACE },
      });
      expect(stored('customer_support')).toBeUndefined();
    });

    it('throws AiIndexNotFoundError when the AI index does not exist', async () => {
      await expect(service.delete('missing', DEFAULT_SPACE)).rejects.toBeInstanceOf(
        AiIndexNotFoundError
      );
      expect(requests().filter(({ method }) => method === 'DELETE')).toHaveLength(0);
    });

    it('throws AiIndexManagedError when the entry is managed', async () => {
      seed({ ...aiIndexRecord, managed: true });

      await expect(service.delete('customer_support', DEFAULT_SPACE)).rejects.toBeInstanceOf(
        AiIndexManagedError
      );
      expect(requests().filter(({ method }) => method === 'DELETE')).toHaveLength(0);
    });

    it('throws AiIndexNotFoundError when the entry is removed concurrently', async () => {
      seed(aiIndexRecord);
      esClient.transport.request.mockImplementation((async (params: RequestParams) => {
        if (params.method === 'DELETE') {
          throw createNotFoundError();
        }
        return fakeRegistry(params);
      }) as never);

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
      seed({ ...aiIndexRecord, managed: true });

      await expect(
        service.assertCanAcceptAutomation('customer_support', DEFAULT_SPACE, {
          type: 'workflow',
          value: 'wf-new',
        })
      ).rejects.toBeInstanceOf(AiIndexManagedError);
    });

    it('rejects when the automation limit is reached', async () => {
      seed({
        ...aiIndexRecord,
        automations: Array.from({ length: MAX_AI_INDEX_AUTOMATIONS }, (_, index) => ({
          type: 'workflow' as const,
          value: `wf-${index}`,
        })),
      });

      await expect(
        service.assertCanAcceptAutomation('customer_support', DEFAULT_SPACE, {
          type: 'workflow',
          value: 'wf-new',
        })
      ).rejects.toThrow(/maximum number of automations/);
    });

    it('allows already attached workflows when the automation limit is reached', async () => {
      seed({
        ...aiIndexRecord,
        automations: Array.from({ length: MAX_AI_INDEX_AUTOMATIONS }, (_, index) => ({
          type: 'workflow' as const,
          value: index === 0 ? 'nightly-refresh' : `wf-${index}`,
        })),
      });

      await expect(
        service.assertCanAcceptAutomation('customer_support', DEFAULT_SPACE, {
          type: 'workflow',
          value: 'nightly-refresh',
        })
      ).resolves.toBeUndefined();
    });
  });

  describe('addAutomation', () => {
    it('appends a workflow automation with a read-then-replace', async () => {
      seed(aiIndexRecord);

      await expect(
        service.addAutomation('customer_support', DEFAULT_SPACE, {
          type: 'workflow',
          value: 'wf-new',
        })
      ).resolves.toBe('attached');

      expect(lastWrite().querystring).toBeUndefined();
      expect(lastWrite().body).toEqual(
        expect.objectContaining({
          space: DEFAULT_SPACE,
          automations: [
            { type: 'workflow', value: 'nightly-refresh' },
            { type: 'workflow', value: 'wf-new' },
          ],
        })
      );
      expect(lastWrite().body).not.toHaveProperty('id');
      expect(lastWrite().body).not.toHaveProperty('date_created');
    });

    it('returns already_attached when the workflow is already linked', async () => {
      seed(aiIndexRecord);

      await expect(
        service.addAutomation('customer_support', DEFAULT_SPACE, {
          type: 'workflow',
          value: 'nightly-refresh',
        })
      ).resolves.toBe('already_attached');
      expect(writes()).toHaveLength(0);
    });

    it('throws AiIndexConflictError when a concurrent write wins (409)', async () => {
      seed(aiIndexRecord);
      nextWriteError = createConflictError();

      await expect(
        service.addAutomation('customer_support', DEFAULT_SPACE, {
          type: 'workflow',
          value: 'wf-new',
        })
      ).rejects.toBeInstanceOf(AiIndexConflictError);
    });

    it('throws AiIndexManagedError when the entry is managed', async () => {
      seed({ ...aiIndexRecord, managed: true });

      await expect(
        service.addAutomation('customer_support', DEFAULT_SPACE, {
          type: 'workflow',
          value: 'wf-new',
        })
      ).rejects.toBeInstanceOf(AiIndexManagedError);
    });

    it('rejects when the automation limit is reached', async () => {
      seed({
        ...aiIndexRecord,
        automations: Array.from({ length: MAX_AI_INDEX_AUTOMATIONS }, (_, index) => ({
          type: 'workflow' as const,
          value: `wf-${index}`,
        })),
      });

      await expect(
        service.addAutomation('customer_support', DEFAULT_SPACE, {
          type: 'workflow',
          value: 'wf-new',
        })
      ).rejects.toThrow(/maximum number of automations/);
    });
  });

  describe('space isolation', () => {
    it('treats the same logical id as independent across spaces', async () => {
      const defaultRecord: AiIndexRecord = {
        ...aiIndexRecord,
        id: 'orders',
        description: 'default orders',
      };
      const teamRecord: AiIndexRecord = {
        ...aiIndexRecord,
        id: 'orders',
        space: 'team',
        description: 'team orders',
      };
      seed(defaultRecord, teamRecord);

      await expect(service.get('orders', DEFAULT_SPACE)).resolves.toEqual(
        toHttpItem(defaultRecord)
      );
      await expect(service.get('orders', 'team')).resolves.toEqual(toHttpItem(teamRecord));

      await expect(service.create('orders', 'marketing', properties)).resolves.toBeUndefined();
      expect(lastWrite()).toEqual(
        expect.objectContaining({
          path: `${ES_AI_INDEX_PATH}/orders`,
          querystring: { create: true },
          body: expect.objectContaining({ space: 'marketing' }),
        })
      );
      expect(stored('orders', 'marketing')).toBeDefined();
      expect(stored('orders')?.description).toBe('default orders');
    });
  });
});
