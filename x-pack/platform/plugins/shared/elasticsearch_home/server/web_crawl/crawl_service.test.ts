/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type { ElasticsearchClientMock } from '@kbn/core/server/mocks';
import {
  elasticsearchServiceMock,
  httpServerMock,
  loggingSystemMock,
} from '@kbn/core/server/mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { WEB_CRAWLS_LIST_SIZE } from '../../common/constants';
import type { CrawlServiceDeps } from './crawl_service';
import {
  INTERRUPTED_AFTER_MS,
  INTERRUPTED_ERROR,
  WebCrawlError,
  cancelCrawl,
  deleteCrawl,
  getCrawl,
  listCrawls,
  startCrawl,
  toWebCrawl,
} from './crawl_service';
import type { CrawlDocument, CrawlStorage, StoredCrawl } from './crawl_storage';
import { findDocumentExtractionEndpoint } from './document_extraction';
import { WEB_CRAWL_TASK_TYPE } from './task';

jest.mock('./document_extraction');

const mockFindEndpoint = jest.mocked(findDocumentExtractionEndpoint);

const NOW = Date.parse('2026-03-01T12:00:00.000Z');
const NOW_ISO = new Date(NOW).toISOString();
const CRAWL_URL = 'https://example.com/';
const INDEX_NAME = 'web-crawl-example.com';
const OTHER_INDEX_NAME = 'web-crawl-other.org';
const INFERENCE_ID = '.jina-reader';
const CRAWL_ID = 'crawl-1';
const LOWEST_ID = '00000000-0000-0000-0000-000000000000';
const HIGHEST_ID = 'ffffffff-ffff-ffff-ffff-ffffffffffff';
const ALREADY_RUNNING = `A crawl into ${INDEX_NAME} is already running`;

const msAgo = (ms: number): string => new Date(NOW - ms).toISOString();

const RUNNING: CrawlDocument = {
  url: CRAWL_URL,
  index_name: INDEX_NAME,
  status: 'running',
  max_depth: 2,
  max_documents: 500,
  started_at: msAgo(10 * 60_000),
  updated_at: msAgo(1_000),
  documents_count: 4,
  failed_count: 1,
  requested_count: 9,
  queued_count: 20,
};

const STALE: CrawlDocument = { ...RUNNING, updated_at: msAgo(INTERRUPTED_AFTER_MS) };

const COMPLETED: CrawlDocument = {
  ...RUNNING,
  status: 'completed',
  finished_at: msAgo(5 * 60_000),
  updated_at: msAgo(5 * 60_000),
  documents_count: 42,
  queued_count: 0,
};

const createEsError = (statusCode: number) =>
  Object.assign(new Error(`status ${statusCode}`), { statusCode });

const createFakeStorage = () => {
  const documents = new Map<string, CrawlDocument>();
  const toStored = (id: string): StoredCrawl | undefined => {
    const document = documents.get(id);
    return document ? { ...document, id } : undefined;
  };
  const storage: jest.Mocked<CrawlStorage> = {
    create: jest.fn(async (id, document) => {
      documents.set(id, { ...document });
    }),
    get: jest.fn(async (id) => toStored(id)),
    update: jest.fn(async (id, patch) => {
      const current = documents.get(id);
      if (!current) {
        return undefined;
      }
      documents.set(id, { ...current, ...patch });
      return toStored(id);
    }),
    find: jest.fn(async ({ indexName, statuses, size }) =>
      [...documents.keys()]
        .flatMap((id) => toStored(id) ?? [])
        .filter((crawl) => !indexName || crawl.index_name === indexName)
        .filter((crawl) => !statuses || statuses.includes(crawl.status))
        .sort((left, right) => right.started_at.localeCompare(left.started_at))
        .slice(0, size)
    ),
    delete: jest.fn(async (id) => documents.delete(id)),
  };
  return { storage, documents };
};

describe('toWebCrawl', () => {
  it('maps a stored crawl to the API shape', () => {
    expect(
      toWebCrawl({
        ...COMPLETED,
        id: CRAWL_ID,
        error: 'boom',
        started_by: 'elastic',
        workflow_id: 'workflow-1',
      })
    ).toEqual({
      id: CRAWL_ID,
      indexName: INDEX_NAME,
      url: CRAWL_URL,
      status: 'completed',
      maxDepth: 2,
      maxDocuments: 500,
      documentsCount: 42,
      failedCount: 1,
      requestedCount: 9,
      queuedCount: 0,
      startedAt: COMPLETED.started_at,
      finishedAt: COMPLETED.finished_at,
      error: 'boom',
      isStopping: false,
      startedBy: 'elastic',
      workflowId: 'workflow-1',
    });
  });

  it('reports a running crawl as stopping once a stop was requested', () => {
    expect(toWebCrawl({ ...RUNNING, id: CRAWL_ID }).isStopping).toBe(false);
    expect(toWebCrawl({ ...RUNNING, id: CRAWL_ID, cancel_requested: false }).isStopping).toBe(
      false
    );
    expect(toWebCrawl({ ...RUNNING, id: CRAWL_ID, cancel_requested: true }).isStopping).toBe(true);
  });

  it.each(['completed', 'failed', 'canceled'] as const)(
    'does not report a %s crawl as stopping',
    (status) => {
      expect(
        toWebCrawl({ ...RUNNING, id: CRAWL_ID, status, cancel_requested: true }).isStopping
      ).toBe(false);
    }
  );
});

describe('WebCrawlError', () => {
  it('carries the status code that describes it', () => {
    const error = new WebCrawlError('Nope', 409);

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('WebCrawlError');
    expect(error.message).toBe('Nope');
    expect(error.statusCode).toBe(409);
  });
});

describe('crawl service', () => {
  let esClient: ElasticsearchClientMock;
  let storage: jest.Mocked<CrawlStorage>;
  let documents: Map<string, CrawlDocument>;
  let taskManager: ReturnType<typeof taskManagerMock.createStart>;
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  let deps: CrawlServiceDeps;
  let request: KibanaRequest;
  let unreadable: Set<string>;
  let unwritable: Set<string>;

  const expectWebCrawlError = async (
    promise: Promise<unknown>,
    statusCode: number,
    message: string
  ) => {
    const error = await promise.then(
      () => undefined,
      (rejection: unknown) => rejection
    );
    expect(error).toBeInstanceOf(WebCrawlError);
    expect(error).toEqual(expect.objectContaining({ statusCode, message }));
  };

  const mockIndexMissing = () => {
    esClient.indices.getMapping.mockRejectedValue(createEsError(404));
  };

  const mockIndexMeta = (meta?: Record<string, unknown>) => {
    esClient.indices.getMapping.mockResolvedValue({
      [INDEX_NAME]: { mappings: meta ? { _meta: meta } : {} },
    });
  };

  const mockCrawlIndexExists = () => mockIndexMeta({ web_crawl: { url: CRAWL_URL } });

  const mockTaskMissing = () => {
    taskManager.get.mockRejectedValue(
      SavedObjectsErrorHelpers.createGenericNotFoundError('task', CRAWL_ID)
    );
  };

  const getPrivilegeChecks = () =>
    esClient.security.hasPrivileges.mock.calls.map(([params]) => params?.index);

  const start = (
    overrides: Partial<Parameters<typeof startCrawl>[1]> = {}
  ): ReturnType<typeof startCrawl> =>
    startCrawl(deps, { request, url: CRAWL_URL, maxDepth: 2, maxDocuments: 500, ...overrides });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(NOW);

    esClient = elasticsearchServiceMock.createElasticsearchClient();
    ({ storage, documents } = createFakeStorage());
    taskManager = taskManagerMock.createStart();
    logger = loggingSystemMock.createLogger();
    request = httpServerMock.createKibanaRequest();
    deps = { esClient, storage, taskManager, logger };
    unreadable = new Set();
    unwritable = new Set();

    mockFindEndpoint.mockResolvedValue(INFERENCE_ID);
    taskManager.get.mockResolvedValue(taskManagerMock.createTask());
    taskManager.schedule.mockResolvedValue(taskManagerMock.createTask());
    esClient.security.hasPrivileges.mockImplementation(async (params) => {
      const [{ names, privileges }] = params?.index ?? [];
      const [privilege] = privileges;
      const denied = privilege === 'read' ? unreadable : unwritable;
      const indexNames = Array.isArray(names) ? names : [names];
      return {
        username: 'elastic',
        has_all_requested: indexNames.every((name) => !denied.has(name)),
        cluster: {},
        application: {},
        index: Object.fromEntries(
          indexNames.map((name) => [name, { [privilege]: !denied.has(name) }])
        ),
      };
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('startCrawl', () => {
    it.each([
      'not a url',
      'example.com',
      'ftp://example.com/',
      ['javascript', 'alert(1)'].join(':'),
    ])('rejects the invalid URL %p with a 400 before touching Elasticsearch', async (url) => {
      await expectWebCrawlError(start({ url }), 400, 'Enter a valid http or https URL');

      expect(mockFindEndpoint).not.toHaveBeenCalled();
      expect(esClient.indices.getMapping).not.toHaveBeenCalled();
      expect(storage.create).not.toHaveBeenCalled();
      expect(taskManager.schedule).not.toHaveBeenCalled();
    });

    it('rejects with a 400 when there is no document_extraction inference endpoint', async () => {
      mockFindEndpoint.mockResolvedValue(undefined);
      mockIndexMissing();

      await expectWebCrawlError(
        start(),
        400,
        'No document_extraction inference endpoint is available'
      );

      expect(mockFindEndpoint).toHaveBeenCalledWith(esClient);
      expect(esClient.indices.getMapping).not.toHaveBeenCalled();
      expect(esClient.indices.create).not.toHaveBeenCalled();
      expect(storage.create).not.toHaveBeenCalled();
      expect(taskManager.schedule).not.toHaveBeenCalled();
    });

    it.each([
      ['has no metadata', undefined],
      ['has metadata that does not come from a crawl', { managed_by: 'something else' }],
    ])('rejects with a 409 when the index already exists and %s', async (_, meta) => {
      mockIndexMeta(meta);

      await expectWebCrawlError(
        start(),
        409,
        `Index ${INDEX_NAME} already exists and was not created by a crawl`
      );

      expect(esClient.indices.create).not.toHaveBeenCalled();
      expect(storage.find).not.toHaveBeenCalled();
      expect(storage.create).not.toHaveBeenCalled();
      expect(taskManager.schedule).not.toHaveBeenCalled();
    });

    it('propagates a failure to read the index', async () => {
      const error = createEsError(403);
      esClient.indices.getMapping.mockRejectedValue(error);

      await expect(start()).rejects.toBe(error);

      expect(storage.create).not.toHaveBeenCalled();
      expect(taskManager.schedule).not.toHaveBeenCalled();
    });

    describe('when the index does not exist', () => {
      beforeEach(() => {
        mockIndexMissing();
      });

      it('creates the index as the user, records the crawl and schedules its task', async () => {
        const crawl = await start({ maxDepth: 3, maxDocuments: 50 });

        expect(esClient.indices.getMapping).toHaveBeenCalledWith({ index: INDEX_NAME });
        expect(esClient.indices.create).toHaveBeenCalledTimes(1);
        const [{ index, mappings }] = esClient.indices.create.mock.calls[0];
        expect(index).toBe(INDEX_NAME);
        expect(mappings?._meta).toEqual({ web_crawl: { url: CRAWL_URL } });
        expect(esClient.security.hasPrivileges).not.toHaveBeenCalled();

        const expectedDocument: CrawlDocument = {
          url: CRAWL_URL,
          index_name: INDEX_NAME,
          status: 'running',
          max_depth: 3,
          max_documents: 50,
          started_at: NOW_ISO,
          updated_at: NOW_ISO,
          documents_count: 0,
          failed_count: 0,
          requested_count: 0,
          queued_count: 0,
          started_by: undefined,
          workflow_id: undefined,
        };
        expect(storage.create).toHaveBeenCalledTimes(1);
        expect(storage.create).toHaveBeenCalledWith(crawl.id, expectedDocument);
        expect(crawl).toEqual({ ...expectedDocument, id: expect.any(String) });

        expect(taskManager.schedule).toHaveBeenCalledTimes(1);
        expect(taskManager.schedule).toHaveBeenCalledWith(
          {
            id: crawl.id,
            taskType: WEB_CRAWL_TASK_TYPE,
            params: {
              url: CRAWL_URL,
              indexName: INDEX_NAME,
              inferenceId: INFERENCE_ID,
              maxDepth: 3,
              maxDocuments: 50,
            },
            state: {},
          },
          { request }
        );
        expect(storage.delete).not.toHaveBeenCalled();
        expect(storage.update).not.toHaveBeenCalled();
      });

      it('creates the index before recording the crawl, and records it before scheduling', async () => {
        await start();

        const [createIndexOrder] = esClient.indices.create.mock.invocationCallOrder;
        const [recordOrder] = storage.create.mock.invocationCallOrder;
        const [scheduleOrder] = taskManager.schedule.mock.invocationCallOrder;
        expect(createIndexOrder).toBeLessThan(recordOrder);
        expect(recordOrder).toBeLessThan(scheduleOrder);
      });

      it('normalizes the URL before deriving the index and scheduling the crawl', async () => {
        const crawl = await start({ url: 'https://user:secret@www.Example.com/docs#intro' });

        expect(crawl.url).toBe('https://www.example.com/docs');
        expect(crawl.index_name).toBe(INDEX_NAME);
        expect(taskManager.schedule.mock.calls[0][0].params).toEqual(
          expect.objectContaining({ url: 'https://www.example.com/docs', indexName: INDEX_NAME })
        );
      });

      it('records who started the crawl and the workflow that did', async () => {
        const crawl = await start({ startedBy: 'elastic', workflowId: 'workflow-1' });

        expect(documents.get(crawl.id)).toEqual(
          expect.objectContaining({ started_by: 'elastic', workflow_id: 'workflow-1' })
        );
      });

      it('uses a new ID for every crawl', async () => {
        const first = await start();
        documents.clear();
        const second = await start();

        expect(first.id).not.toBe(second.id);
      });

      it('does not record or schedule a crawl when the index cannot be created', async () => {
        const error = createEsError(403);
        esClient.indices.create.mockRejectedValue(error);

        await expect(start()).rejects.toBe(error);

        expect(storage.create).not.toHaveBeenCalled();
        expect(taskManager.schedule).not.toHaveBeenCalled();
      });

      it('does not schedule a crawl that could not be recorded', async () => {
        const error = createEsError(503);
        storage.create.mockRejectedValue(error);

        await expect(start()).rejects.toBe(error);

        expect(taskManager.schedule).not.toHaveBeenCalled();
      });
    });

    describe('when the crawl index exists', () => {
      beforeEach(() => {
        mockCrawlIndexExists();
      });

      it('crawls into it again without recreating it when the user can write to it', async () => {
        documents.set(CRAWL_ID, COMPLETED);

        const crawl = await start();

        expect(esClient.indices.create).not.toHaveBeenCalled();
        expect(getPrivilegeChecks()).toEqual([[{ names: [INDEX_NAME], privileges: ['write'] }]]);
        expect(crawl.id).not.toBe(CRAWL_ID);
        expect(documents.get(crawl.id)?.status).toBe('running');
        expect(documents.get(CRAWL_ID)).toEqual(COMPLETED);
        expect(taskManager.get).not.toHaveBeenCalled();
        expect(taskManager.schedule).toHaveBeenCalledTimes(1);
      });

      it('rejects with a 403 before looking at running crawls when the user cannot write to it', async () => {
        documents.set(CRAWL_ID, STALE);
        unwritable.add(INDEX_NAME);
        mockTaskMissing();

        await expectWebCrawlError(start(), 403, `Missing the write privilege on ${INDEX_NAME}`);

        expect(taskManager.get).not.toHaveBeenCalled();
        expect(storage.update).not.toHaveBeenCalled();
      });

      it('rejects with a 403 when the user cannot write to it', async () => {
        unwritable.add(INDEX_NAME);

        await expectWebCrawlError(start(), 403, `Missing the write privilege on ${INDEX_NAME}`);

        expect(esClient.indices.create).not.toHaveBeenCalled();
        expect(storage.create).not.toHaveBeenCalled();
        expect(taskManager.schedule).not.toHaveBeenCalled();
      });

      it('rejects with a 409 while a crawl into it is running', async () => {
        documents.set(CRAWL_ID, STALE);

        await expectWebCrawlError(start(), 409, ALREADY_RUNNING);

        expect(storage.find).toHaveBeenCalledWith({
          indexName: INDEX_NAME,
          statuses: ['running'],
          size: 10,
        });
        expect(taskManager.get).toHaveBeenCalledWith(CRAWL_ID);
        expect(documents.get(CRAWL_ID)).toEqual(STALE);
        expect(storage.create).not.toHaveBeenCalled();
        expect(taskManager.schedule).not.toHaveBeenCalled();
      });

      it('rejects with a 409 for a crawl whose task is gone but that reported progress recently', async () => {
        documents.set(CRAWL_ID, { ...STALE, updated_at: msAgo(INTERRUPTED_AFTER_MS - 1) });
        mockTaskMissing();

        await expectWebCrawlError(start(), 409, ALREADY_RUNNING);

        expect(taskManager.get).not.toHaveBeenCalled();
        expect(storage.update).not.toHaveBeenCalled();
        expect(storage.create).not.toHaveBeenCalled();
      });

      it('settles a running crawl whose task is gone as failed and starts a new one', async () => {
        documents.set(CRAWL_ID, STALE);
        mockTaskMissing();

        const crawl = await start();

        expect(documents.get(CRAWL_ID)).toEqual({
          ...STALE,
          status: 'failed',
          finished_at: NOW_ISO,
          updated_at: NOW_ISO,
          error: INTERRUPTED_ERROR,
        });
        expect(crawl.id).not.toBe(CRAWL_ID);
        expect(documents.get(crawl.id)?.status).toBe('running');
        expect(taskManager.schedule).toHaveBeenCalledTimes(1);
        expect(taskManager.schedule.mock.calls[0][0].id).toBe(crawl.id);
      });

      it('does not start a crawl when the task of the running crawl cannot be read', async () => {
        documents.set(CRAWL_ID, STALE);
        taskManager.get.mockRejectedValue(new Error('task manager unavailable'));

        await expect(start()).rejects.toThrow('task manager unavailable');

        expect(documents.get(CRAWL_ID)).toEqual(STALE);
        expect(storage.create).not.toHaveBeenCalled();
        expect(taskManager.schedule).not.toHaveBeenCalled();
      });

      it('is not blocked by a crawl of another site', async () => {
        documents.set(CRAWL_ID, { ...RUNNING, index_name: OTHER_INDEX_NAME });

        const crawl = await start();

        expect(taskManager.get).not.toHaveBeenCalled();
        expect(documents.get(crawl.id)?.status).toBe('running');
        expect(documents.get(CRAWL_ID)?.status).toBe('running');
        expect(taskManager.schedule).toHaveBeenCalledTimes(1);
      });
    });

    describe('when two requests start a crawl of the same site at once', () => {
      const recordCompetitor = (competitorId: string, startedAt: string) => {
        storage.create.mockImplementationOnce(async (id, document) => {
          documents.set(id, document);
          documents.set(competitorId, { ...document, started_at: startedAt });
        });
      };

      beforeEach(() => {
        mockIndexMissing();
      });

      it('gives way to a crawl that was recorded earlier', async () => {
        recordCompetitor(HIGHEST_ID, msAgo(1));

        await expectWebCrawlError(start(), 409, ALREADY_RUNNING);

        const [ownId] = storage.create.mock.calls[0];
        expect(storage.delete).toHaveBeenCalledTimes(1);
        expect(storage.delete).toHaveBeenCalledWith(ownId);
        expect([...documents.keys()]).toEqual([HIGHEST_ID]);
        expect(taskManager.schedule).not.toHaveBeenCalled();
      });

      it('gives way to a crawl that was recorded later, as that one may not have seen this one', async () => {
        recordCompetitor(LOWEST_ID, new Date(NOW + 1).toISOString());

        await expectWebCrawlError(start(), 409, ALREADY_RUNNING);

        expect([...documents.keys()]).toEqual([LOWEST_ID]);
        expect(taskManager.schedule).not.toHaveBeenCalled();
      });

      it('gives way whatever the IDs when both were recorded at the same time', async () => {
        recordCompetitor(HIGHEST_ID, NOW_ISO);

        await expectWebCrawlError(start(), 409, ALREADY_RUNNING);

        expect([...documents.keys()]).toEqual([HIGHEST_ID]);
        expect(taskManager.schedule).not.toHaveBeenCalled();
      });

      it('does not give way to a crawl of another site', async () => {
        storage.create.mockImplementationOnce(async (id, document) => {
          documents.set(id, document);
          documents.set(LOWEST_ID, {
            ...document,
            index_name: OTHER_INDEX_NAME,
            started_at: msAgo(1),
          });
        });

        await expect(start()).resolves.toEqual(expect.objectContaining({ status: 'running' }));

        expect(storage.delete).not.toHaveBeenCalled();
      });
    });

    describe('when the task cannot be scheduled', () => {
      const schedulingError = new Error('task manager unavailable');

      beforeEach(() => {
        mockIndexMissing();
        taskManager.schedule.mockRejectedValue(schedulingError);
      });

      it('marks the crawl as failed and rethrows the scheduling error', async () => {
        await expect(start()).rejects.toBe(schedulingError);

        const [crawlId] = storage.create.mock.calls[0];
        expect(storage.update).toHaveBeenCalledWith(
          crawlId,
          {
            status: 'failed',
            finished_at: NOW_ISO,
            updated_at: NOW_ISO,
            error: 'The crawl could not be scheduled',
          },
          { refresh: true }
        );
        expect(documents.get(crawlId)).toEqual(
          expect.objectContaining({ status: 'failed', error: 'The crawl could not be scheduled' })
        );
        expect(logger.warn).not.toHaveBeenCalled();
      });

      it('rethrows the scheduling error when the failure cannot be recorded either', async () => {
        storage.update.mockRejectedValue(createEsError(503));

        await expect(start()).rejects.toBe(schedulingError);

        expect(logger.warn).toHaveBeenCalledTimes(1);
        expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('status 503'));
      });

      it('lets the site be crawled again right away', async () => {
        await expect(start()).rejects.toBe(schedulingError);
        mockCrawlIndexExists();
        taskManager.schedule.mockResolvedValue(taskManagerMock.createTask());

        await expect(start()).resolves.toEqual(expect.objectContaining({ status: 'running' }));
      });
    });
  });

  describe('getCrawl', () => {
    it('rejects with a 404 when the crawl does not exist', async () => {
      await expectWebCrawlError(
        getCrawl(deps, CRAWL_ID),
        404,
        `No crawl found with ID ${CRAWL_ID}`
      );

      expect(esClient.security.hasPrivileges).not.toHaveBeenCalled();
    });

    it('reports a crawl into an index the user cannot read as missing', async () => {
      documents.set(CRAWL_ID, STALE);
      unreadable.add(INDEX_NAME);
      mockTaskMissing();

      await expectWebCrawlError(
        getCrawl(deps, CRAWL_ID),
        404,
        `No crawl found with ID ${CRAWL_ID}`
      );

      expect(getPrivilegeChecks()).toEqual([[{ names: [INDEX_NAME], privileges: ['read'] }]]);
      expect(taskManager.get).not.toHaveBeenCalled();
      expect(storage.update).not.toHaveBeenCalled();
    });

    it('returns a finished crawl without looking for its task', async () => {
      documents.set(CRAWL_ID, COMPLETED);

      await expect(getCrawl(deps, CRAWL_ID)).resolves.toEqual({ ...COMPLETED, id: CRAWL_ID });

      expect(getPrivilegeChecks()).toEqual([[{ names: [INDEX_NAME], privileges: ['read'] }]]);
      expect(taskManager.get).not.toHaveBeenCalled();
    });

    it('only needs the read privilege', async () => {
      documents.set(CRAWL_ID, COMPLETED);
      unwritable.add(INDEX_NAME);

      await expect(getCrawl(deps, CRAWL_ID)).resolves.toEqual({ ...COMPLETED, id: CRAWL_ID });
    });

    it('reports a stale crawl that was deleted while its task was looked up as missing', async () => {
      documents.set(CRAWL_ID, STALE);
      taskManager.get.mockImplementation(async () => {
        documents.delete(CRAWL_ID);
        throw SavedObjectsErrorHelpers.createGenericNotFoundError('task', CRAWL_ID);
      });

      await expectWebCrawlError(
        getCrawl(deps, CRAWL_ID),
        404,
        `No crawl found with ID ${CRAWL_ID}`
      );

      expect(storage.update).not.toHaveBeenCalled();
    });

    it('propagates a failure to check privileges', async () => {
      documents.set(CRAWL_ID, COMPLETED);
      const error = createEsError(503);
      esClient.security.hasPrivileges.mockRejectedValue(error);

      await expect(getCrawl(deps, CRAWL_ID)).rejects.toBe(error);
    });

    describe('reconciliation', () => {
      beforeEach(() => {
        mockTaskMissing();
      });

      it('leaves a crawl that reported progress within the grace period alone', async () => {
        documents.set(CRAWL_ID, { ...STALE, updated_at: msAgo(INTERRUPTED_AFTER_MS - 1) });

        await expect(getCrawl(deps, CRAWL_ID)).resolves.toEqual(
          expect.objectContaining({ status: 'running' })
        );

        expect(taskManager.get).not.toHaveBeenCalled();
        expect(storage.update).not.toHaveBeenCalled();
      });

      it('settles the crawl once the grace period has passed', async () => {
        documents.set(CRAWL_ID, { ...STALE, updated_at: msAgo(INTERRUPTED_AFTER_MS - 1) });

        jest.advanceTimersByTime(1);

        await expect(getCrawl(deps, CRAWL_ID)).resolves.toEqual(
          expect.objectContaining({ status: 'failed', error: INTERRUPTED_ERROR })
        );
      });

      it('leaves a silent crawl alone while its task still exists', async () => {
        documents.set(CRAWL_ID, STALE);
        taskManager.get.mockResolvedValue(taskManagerMock.createTask());

        await expect(getCrawl(deps, CRAWL_ID)).resolves.toEqual({ ...STALE, id: CRAWL_ID });

        expect(taskManager.get).toHaveBeenCalledWith(CRAWL_ID);
        expect(storage.update).not.toHaveBeenCalled();
      });

      it('records a silent crawl whose task is gone as failed', async () => {
        documents.set(CRAWL_ID, STALE);

        const crawl = await getCrawl(deps, CRAWL_ID);

        expect(storage.update).toHaveBeenCalledTimes(1);
        expect(storage.update).toHaveBeenCalledWith(
          CRAWL_ID,
          { status: 'failed', finished_at: NOW_ISO, updated_at: NOW_ISO, error: INTERRUPTED_ERROR },
          { refresh: true }
        );
        expect(crawl).toEqual({
          ...STALE,
          id: CRAWL_ID,
          status: 'failed',
          finished_at: NOW_ISO,
          updated_at: NOW_ISO,
          error: INTERRUPTED_ERROR,
        });
        expect(documents.get(CRAWL_ID)?.status).toBe('failed');
      });

      it('records it as canceled when a stop had been requested', async () => {
        documents.set(CRAWL_ID, { ...STALE, cancel_requested: true });

        const crawl = await getCrawl(deps, CRAWL_ID);

        expect(storage.update).toHaveBeenCalledWith(
          CRAWL_ID,
          { status: 'canceled', finished_at: NOW_ISO, updated_at: NOW_ISO },
          { refresh: true }
        );
        expect(crawl.status).toBe('canceled');
        expect(crawl.error).toBeUndefined();
      });

      it('honors a stop that was requested after the crawl was first read', async () => {
        documents.set(CRAWL_ID, STALE);
        storage.get.mockResolvedValueOnce({ ...STALE, id: CRAWL_ID });
        storage.get.mockResolvedValueOnce({ ...STALE, id: CRAWL_ID, cancel_requested: true });

        await expect(getCrawl(deps, CRAWL_ID)).resolves.toEqual(
          expect.objectContaining({ status: 'canceled' })
        );
      });

      it('returns the outcome the task recorded just before it was removed', async () => {
        storage.get.mockResolvedValueOnce({ ...STALE, id: CRAWL_ID });
        storage.get.mockResolvedValueOnce({ ...COMPLETED, id: CRAWL_ID });

        await expect(getCrawl(deps, CRAWL_ID)).resolves.toEqual({ ...COMPLETED, id: CRAWL_ID });

        expect(storage.get).toHaveBeenCalledTimes(2);
        expect(storage.update).not.toHaveBeenCalled();
      });

      it('propagates a failure to read the task', async () => {
        documents.set(CRAWL_ID, STALE);
        taskManager.get.mockRejectedValue(new Error('task manager unavailable'));

        await expect(getCrawl(deps, CRAWL_ID)).rejects.toThrow('task manager unavailable');

        expect(storage.update).not.toHaveBeenCalled();
      });

      it('propagates a failure to record the outcome', async () => {
        documents.set(CRAWL_ID, STALE);
        const error = createEsError(503);
        storage.update.mockRejectedValue(error);

        await expect(getCrawl(deps, CRAWL_ID)).rejects.toBe(error);
      });
    });
  });

  describe('listCrawls', () => {
    it('lists the most recent crawls', async () => {
      documents.set('older', { ...COMPLETED, started_at: msAgo(60 * 60_000) });
      documents.set('newer', RUNNING);

      await expect(listCrawls(deps)).resolves.toEqual([
        { ...RUNNING, id: 'newer' },
        { ...COMPLETED, started_at: msAgo(60 * 60_000), id: 'older' },
      ]);

      expect(storage.find).toHaveBeenCalledTimes(1);
      expect(storage.find).toHaveBeenCalledWith({ size: WEB_CRAWLS_LIST_SIZE });
    });

    it('does not check privileges when there are no crawls', async () => {
      await expect(listCrawls(deps)).resolves.toEqual([]);

      expect(esClient.security.hasPrivileges).not.toHaveBeenCalled();
    });

    it('leaves out crawls into indices the user cannot read, with a single privilege check', async () => {
      documents.set('a', { ...COMPLETED, started_at: msAgo(4_000) });
      documents.set('b', { ...COMPLETED, started_at: msAgo(3_000), index_name: OTHER_INDEX_NAME });
      documents.set('c', { ...COMPLETED, started_at: msAgo(2_000) });
      documents.set('d', { ...RUNNING, started_at: msAgo(1_000), index_name: OTHER_INDEX_NAME });
      unreadable.add(OTHER_INDEX_NAME);

      const crawls = await listCrawls(deps);

      expect(crawls.map(({ id }) => id)).toEqual(['c', 'a']);
      expect(getPrivilegeChecks()).toEqual([
        [{ names: [OTHER_INDEX_NAME, INDEX_NAME], privileges: ['read'] }],
      ]);
    });

    it('settles interrupted crawls, but only the ones the user can read', async () => {
      documents.set('readable', STALE);
      documents.set('hidden', { ...STALE, index_name: OTHER_INDEX_NAME });
      unreadable.add(OTHER_INDEX_NAME);
      mockTaskMissing();

      const crawls = await listCrawls(deps);

      expect(crawls).toEqual([
        expect.objectContaining({ id: 'readable', status: 'failed', error: INTERRUPTED_ERROR }),
      ]);
      expect(taskManager.get).toHaveBeenCalledTimes(1);
      expect(taskManager.get).toHaveBeenCalledWith('readable');
      expect(documents.get('hidden')?.status).toBe('running');
    });

    it('propagates a failure to check privileges', async () => {
      documents.set(CRAWL_ID, COMPLETED);
      const error = createEsError(503);
      esClient.security.hasPrivileges.mockRejectedValue(error);

      await expect(listCrawls(deps)).rejects.toBe(error);
    });
  });

  describe('cancelCrawl', () => {
    it('asks a running crawl to stop and returns it as stored', async () => {
      documents.set(CRAWL_ID, RUNNING);

      const crawl = await cancelCrawl(deps, CRAWL_ID);

      expect(storage.update).toHaveBeenCalledTimes(1);
      expect(storage.update).toHaveBeenCalledWith(
        CRAWL_ID,
        { cancel_requested: true },
        { refresh: true }
      );
      expect(crawl).toEqual({ ...RUNNING, id: CRAWL_ID, cancel_requested: true });
      expect(toWebCrawl(crawl).isStopping).toBe(true);
      expect(getPrivilegeChecks()).toEqual([
        [{ names: [INDEX_NAME], privileges: ['read'] }],
        [{ names: [INDEX_NAME], privileges: ['write'] }],
      ]);
    });

    it.each([
      ['completed', COMPLETED],
      ['failed', { ...COMPLETED, status: 'failed', error: 'boom' } as CrawlDocument],
      ['canceled', { ...COMPLETED, status: 'canceled' } as CrawlDocument],
    ])('does nothing to a %s crawl', async (_, document) => {
      documents.set(CRAWL_ID, document);

      await expect(cancelCrawl(deps, CRAWL_ID)).resolves.toEqual({ ...document, id: CRAWL_ID });

      expect(storage.update).not.toHaveBeenCalled();
      expect(documents.get(CRAWL_ID)).toEqual(document);
    });

    it('rejects with a 404 when the crawl does not exist', async () => {
      await expectWebCrawlError(
        cancelCrawl(deps, CRAWL_ID),
        404,
        `No crawl found with ID ${CRAWL_ID}`
      );
    });

    it('rejects with a 404 when the user cannot read the index', async () => {
      documents.set(CRAWL_ID, RUNNING);
      unreadable.add(INDEX_NAME);

      await expectWebCrawlError(
        cancelCrawl(deps, CRAWL_ID),
        404,
        `No crawl found with ID ${CRAWL_ID}`
      );

      expect(storage.update).not.toHaveBeenCalled();
    });

    it.each([
      ['running', RUNNING],
      ['completed', COMPLETED],
    ])(
      'rejects with a 403 when the user cannot write to the index of a %s crawl',
      async (_, document) => {
        documents.set(CRAWL_ID, document);
        unwritable.add(INDEX_NAME);

        await expectWebCrawlError(
          cancelCrawl(deps, CRAWL_ID),
          403,
          `Missing the write privilege on ${INDEX_NAME}`
        );

        expect(storage.update).not.toHaveBeenCalled();
      }
    );

    it('rejects with a 404 when the crawl is deleted before the stop is recorded', async () => {
      documents.set(CRAWL_ID, RUNNING);
      storage.update.mockResolvedValue(undefined);

      await expectWebCrawlError(
        cancelCrawl(deps, CRAWL_ID),
        404,
        `No crawl found with ID ${CRAWL_ID}`
      );
    });

    it('settles an interrupted crawl instead of asking it to stop', async () => {
      documents.set(CRAWL_ID, STALE);
      mockTaskMissing();

      await expect(cancelCrawl(deps, CRAWL_ID)).resolves.toEqual(
        expect.objectContaining({ status: 'failed', error: INTERRUPTED_ERROR })
      );

      expect(storage.update).toHaveBeenCalledTimes(1);
      expect(documents.get(CRAWL_ID)?.cancel_requested).toBeUndefined();
    });
  });

  describe('deleteCrawl', () => {
    it.each([
      ['completed', COMPLETED],
      ['failed', { ...COMPLETED, status: 'failed', error: 'boom' } as CrawlDocument],
      ['canceled', { ...COMPLETED, status: 'canceled' } as CrawlDocument],
    ])('removes a %s crawl from the history', async (_, document) => {
      documents.set(CRAWL_ID, document);

      await expect(deleteCrawl(deps, CRAWL_ID)).resolves.toBeUndefined();

      expect(storage.delete).toHaveBeenCalledWith(CRAWL_ID);
      expect(documents.has(CRAWL_ID)).toBe(false);
      expect(esClient.indices.delete).not.toHaveBeenCalled();
    });

    it('rejects with a 409 while the crawl is running', async () => {
      documents.set(CRAWL_ID, RUNNING);

      await expectWebCrawlError(
        deleteCrawl(deps, CRAWL_ID),
        409,
        'Stop the crawl before deleting it'
      );

      expect(storage.delete).not.toHaveBeenCalled();
    });

    it('rejects with a 409 while the crawl is stopping', async () => {
      documents.set(CRAWL_ID, { ...RUNNING, cancel_requested: true });

      await expectWebCrawlError(
        deleteCrawl(deps, CRAWL_ID),
        409,
        'Stop the crawl before deleting it'
      );

      expect(storage.delete).not.toHaveBeenCalled();
    });

    it('rejects with a 404 when the crawl does not exist', async () => {
      await expectWebCrawlError(
        deleteCrawl(deps, CRAWL_ID),
        404,
        `No crawl found with ID ${CRAWL_ID}`
      );

      expect(storage.delete).not.toHaveBeenCalled();
    });

    it('rejects with a 404 when the user cannot read the index', async () => {
      documents.set(CRAWL_ID, COMPLETED);
      unreadable.add(INDEX_NAME);

      await expectWebCrawlError(
        deleteCrawl(deps, CRAWL_ID),
        404,
        `No crawl found with ID ${CRAWL_ID}`
      );

      expect(storage.delete).not.toHaveBeenCalled();
    });

    it('rejects with a 403 when the user cannot write to the index', async () => {
      documents.set(CRAWL_ID, COMPLETED);
      unwritable.add(INDEX_NAME);

      await expectWebCrawlError(
        deleteCrawl(deps, CRAWL_ID),
        403,
        `Missing the write privilege on ${INDEX_NAME}`
      );

      expect(storage.delete).not.toHaveBeenCalled();
    });

    it('removes an interrupted crawl once it has been settled', async () => {
      documents.set(CRAWL_ID, STALE);
      mockTaskMissing();

      await expect(deleteCrawl(deps, CRAWL_ID)).resolves.toBeUndefined();

      expect(documents.has(CRAWL_ID)).toBe(false);
    });
  });
});
