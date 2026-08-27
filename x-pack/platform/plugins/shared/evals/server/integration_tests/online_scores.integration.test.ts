/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kibanaResponseFactory } from '@kbn/core/server';
import { createRootWithCorePlugins, createTestServers } from '@kbn/core-test-helpers-kbn-server';
import type { TestElasticsearchUtils } from '@kbn/core-test-helpers-kbn-server';
import { clearTimeout as nodeClearTimeout, setTimeout as nodeSetTimeout } from 'node:timers';
import { httpServerMock, httpServiceMock } from '@kbn/core/server/mocks';
import type { MockedVersionedRouter } from '@kbn/core-http-router-server-mocks';
import type { DataStreamsStart } from '@kbn/core-data-streams-server';
import type { ElasticsearchClient } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import {
  API_VERSIONS,
  EVALS_ONLINE_SCORES_URL,
  EvaluationIndices,
  type IngestOnlineScoresRequestBodyInput,
} from '@kbn/evals-common';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import { createEvaluatorRegistry } from '../evaluators/registry';
import { onlineScoresDataStreamDefinition } from '../storage/scores/online_scores_index_template';
import {
  computeOnlineScoreDocumentId,
  OnlineScoreService,
} from '../storage/scores/online_score_service';
import { registerIngestOnlineScoresRoute } from '../routes/online_scores/ingest_online_scores';
import { registerListOnlineScoresRoute } from '../routes/online_scores/list_online_scores';

const logger = loggingSystemMock.createLogger();

const getPayload = (): IngestOnlineScoresRequestBodyInput => ({
  monitor: {
    id: 'workflow-online-1',
    name: 'Online eval monitor',
  },
  trace_id: 'trace-online-1',
  connector_id: 'connector-online-1',
  results: [
    {
      status: 'ok',
      evaluator: {
        name: 'correctness',
        version: '1.0.0',
        kind: 'llm',
      },
      scores: [
        {
          name: 'factuality',
          score: 0.91,
          label: 'pass',
          explanation: 'Evidence fully supports the answer.',
          metadata: { bucket: 'facts' },
        },
        {
          name: 'relevance',
          score: 0.89,
          label: 'pass',
          explanation: 'Answer remains on topic.',
        },
        {
          name: 'sequence_accuracy',
          score: 0.76,
          label: 'partial',
        },
      ],
    },
    {
      status: 'error',
      evaluator: {
        name: 'groundedness',
        version: '2.0.0',
        kind: 'llm',
      },
      error: {
        message: 'evaluator timed out',
      },
    },
  ],
});

const cleanupOnlineScoresStorage = async (esClient: ElasticsearchClient) => {
  await esClient.indices
    .deleteDataStream({ name: EvaluationIndices.ONLINE_SCORES })
    .catch(() => {});
  await esClient.indices
    .deleteIndexTemplate({ name: EvaluationIndices.ONLINE_SCORES })
    .catch(() => {});
};

describe('online scores ingestion and listing integration', () => {
  jest.setTimeout(180000);

  let manageES: TestElasticsearchUtils;
  let esClient: ElasticsearchClient;
  let coreDataStreams: DataStreamsStart;
  let root: ReturnType<typeof createRootWithCorePlugins>;
  let initializeDataStreamClient: () => Promise<unknown>;
  let onlineScoreService: OnlineScoreService;
  let ingestHandler: ReturnType<
    MockedVersionedRouter['getRoute']
  >['versions'][typeof API_VERSIONS.internal.v1]['handler'];
  let listHandler: ReturnType<
    MockedVersionedRouter['getRoute']
  >['versions'][typeof API_VERSIONS.internal.v1]['handler'];
  let originalSetTimeout: typeof global.setTimeout;
  let originalClearTimeout: typeof global.clearTimeout;
  let activeSpaceId = 'space-a';

  beforeAll(async () => {
    jest.useRealTimers();
    originalSetTimeout = global.setTimeout;
    originalClearTimeout = global.clearTimeout;
    global.setTimeout = nodeSetTimeout as unknown as typeof global.setTimeout;
    global.clearTimeout = nodeClearTimeout as unknown as typeof global.clearTimeout;

    const { startES } = createTestServers({ adjustTimeout: jest.setTimeout });
    manageES = await startES();
    root = createRootWithCorePlugins({}, { oss: true });
    await root.preboot();
    const coreSetup = await root.setup();
    coreSetup.dataStreams.registerDataStream(onlineScoresDataStreamDefinition);
    const coreStart = await root.start();

    esClient = coreStart.elasticsearch.client.asInternalUser;
    coreDataStreams = coreStart.dataStreams;
    initializeDataStreamClient = () =>
      coreDataStreams.initializeClient(EvaluationIndices.ONLINE_SCORES);
    onlineScoreService = new OnlineScoreService(logger, coreDataStreams);

    const router = httpServiceMock.createRouter();
    registerIngestOnlineScoresRoute({
      router,
      logger,
      canEncrypt: false,
      evaluatorRegistry: createEvaluatorRegistry(),
      getInferenceStart: async () => ({ getClient: jest.fn() } as unknown as InferenceServerStart),
      getEncryptedSavedObjectsStart: async () => encryptedSavedObjectsMock.createStart(),
      getInternalRemoteConfigsSoClient: async () => savedObjectsClientMock.create(),
      getSpaceId: async () => activeSpaceId,
    });
    registerListOnlineScoresRoute({
      router,
      logger,
      canEncrypt: false,
      evaluatorRegistry: createEvaluatorRegistry(),
      getInferenceStart: async () => ({ getClient: jest.fn() } as unknown as InferenceServerStart),
      getEncryptedSavedObjectsStart: async () => encryptedSavedObjectsMock.createStart(),
      getInternalRemoteConfigsSoClient: async () => savedObjectsClientMock.create(),
      getSpaceId: async () => activeSpaceId,
    });
    const versionedRouter = router.versioned as MockedVersionedRouter;
    ingestHandler = versionedRouter.getRoute('post', EVALS_ONLINE_SCORES_URL).versions[
      API_VERSIONS.internal.v1
    ].handler;
    listHandler = versionedRouter.getRoute('get', EVALS_ONLINE_SCORES_URL).versions[
      API_VERSIONS.internal.v1
    ].handler;
  });

  afterAll(async () => {
    global.setTimeout = originalSetTimeout;
    global.clearTimeout = originalClearTimeout;
    await root?.shutdown().catch(() => {});
    await manageES?.stop().catch(() => {});
  });

  beforeEach(async () => {
    jest.useRealTimers();
    activeSpaceId = 'space-a';
    if (esClient) {
      await cleanupOnlineScoresStorage(esClient);
      await initializeDataStreamClient();
    }
  });

  afterEach(async () => {
    if (esClient) {
      await cleanupOnlineScoresStorage(esClient);
    }
  });

  it('isolates score ingestion and listing by space while remaining idempotent', async () => {
    const payload = getPayload();
    const context = {
      evals: Promise.resolve({
        onlineScoreService,
      }),
    } as Parameters<typeof ingestHandler>[0];

    const firstIngestResponse = await ingestHandler(
      context,
      httpServerMock.createKibanaRequest({
        method: 'post',
        path: EVALS_ONLINE_SCORES_URL,
        body: payload,
      }) as Parameters<typeof ingestHandler>[1],
      kibanaResponseFactory
    );

    expect(firstIngestResponse.status).toBe(200);
    expect(firstIngestResponse.payload).toEqual({
      created: 3,
      skipped: 0,
      failed_evaluators: 1,
    });

    const storedHits = await onlineScoreService.search({
      size: 10,
      sort: [{ '@timestamp': { order: 'desc' } }],
      query: {
        term: {
          'monitor.id': payload.monitor.id,
        },
      },
    });
    expect(storedHits.hits.hits).toHaveLength(3);

    const actualIds = storedHits.hits.hits.map((hit) => hit._id).sort();
    const expectedIds = ['factuality', 'relevance', 'sequence_accuracy']
      .map((scoreName) =>
        computeOnlineScoreDocumentId({
          space_ids: ['space-a'],
          monitor: payload.monitor,
          trace_id: payload.trace_id,
          evaluator: payload.results[0].evaluator,
          score: { name: scoreName, value: null, label: 'unused' },
        })
      )
      .sort();
    expect(actualIds).toEqual(expectedIds);

    const secondIngestResponse = await ingestHandler(
      context,
      httpServerMock.createKibanaRequest({
        method: 'post',
        path: EVALS_ONLINE_SCORES_URL,
        body: payload,
      }) as Parameters<typeof ingestHandler>[1],
      kibanaResponseFactory
    );

    expect(secondIngestResponse.status).toBe(200);
    expect(secondIngestResponse.payload).toEqual({
      created: 0,
      skipped: 3,
      failed_evaluators: 1,
    });

    const listResponse = await listHandler(
      context as Parameters<typeof listHandler>[0],
      httpServerMock.createKibanaRequest({
        method: 'get',
        path: EVALS_ONLINE_SCORES_URL,
        query: {
          monitor_id: payload.monitor.id,
          page: 1,
          per_page: 10,
        },
      }) as Parameters<typeof listHandler>[1],
      kibanaResponseFactory
    );

    expect(listResponse.status).toBe(200);
    expect(listResponse.payload.total).toBe(3);
    expect(listResponse.payload.data).toHaveLength(3);
    expect(
      listResponse.payload.data.map((doc: { score: { name: string } }) => doc.score.name).sort()
    ).toEqual(['factuality', 'relevance', 'sequence_accuracy']);
    expect(listResponse.payload.data[0]).not.toHaveProperty('space_ids');
    expect(listResponse.payload.data[0].score).not.toHaveProperty('metadata');

    activeSpaceId = 'space-b';
    const crossSpaceListResponse = await listHandler(
      context as Parameters<typeof listHandler>[0],
      httpServerMock.createKibanaRequest({
        method: 'get',
        path: EVALS_ONLINE_SCORES_URL,
        query: {
          monitor_id: payload.monitor.id,
          page: 1,
          per_page: 10,
        },
      }) as Parameters<typeof listHandler>[1],
      kibanaResponseFactory
    );

    expect(crossSpaceListResponse.status).toBe(200);
    expect(crossSpaceListResponse.payload).toEqual({ total: 0, data: [] });

    const secondSpaceIngestResponse = await ingestHandler(
      context,
      httpServerMock.createKibanaRequest({
        method: 'post',
        path: EVALS_ONLINE_SCORES_URL,
        body: payload,
      }) as Parameters<typeof ingestHandler>[1],
      kibanaResponseFactory
    );

    expect(secondSpaceIngestResponse.status).toBe(200);
    expect(secondSpaceIngestResponse.payload).toEqual({
      created: 3,
      skipped: 0,
      failed_evaluators: 1,
    });

    await expect(
      onlineScoreService.list({
        monitorId: payload.monitor.id,
        spaceId: 'space-b',
        page: 1,
        perPage: 10,
      })
    ).resolves.toMatchObject({ total: 3 });
    await expect(
      onlineScoreService.list({
        monitorId: payload.monitor.id,
        spaceId: 'space-a',
        page: 1,
        perPage: 10,
      })
    ).resolves.toMatchObject({ total: 3 });
  });
});
