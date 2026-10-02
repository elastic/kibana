/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TaskManagerSetupContract } from '@kbn/task-manager-plugin/server';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { loggerMock, type MockedLogger } from '@kbn/logging-mocks';

import {
  registerStatusReportTask,
  getEntityRiskScoreDistribution,
  getEntitySourceDistribution,
  getResolutionState,
} from './status_report_task';
import { createAssetManagerClient } from './factories';
import {
  ENTITY_STORE_METADATA_USAGE_EVENT,
  ENTITY_STORE_RESOLUTION_STATE_EVENT,
  ENTITY_STORE_USAGE_EVENT,
} from '../telemetry/events';
import { ENTITY_STORE_STATUS } from '../domain/constants';
import { getMetadataEntitiesDataStreamName } from '../domain/asset_manager/metadata_data_stream';
import { ALL_ENTITY_TYPES } from '../../common/domain/definitions/entity_schema';
import { getLatestEntitiesIndexName } from '../../common/domain/entity_index';
import type { EntityStoreCoreSetup } from '../types';
import { buildEaExecutionContext, EA_EXECUTION_CONTEXT_NAMES } from './execution_context';

jest.mock('./factories');
jest.mock('./should_delete_orphaned_task', () => ({
  shouldDeleteOrphanedEntityStoreTask: jest.fn().mockResolvedValue(false),
}));
// wrapTaskRun adds a tracing span around the run callback; here it just invokes it.
jest.mock('../telemetry/traces', () => ({
  wrapTaskRun: jest.fn(({ run }: { run: () => Promise<unknown> }) => run()),
}));

const createAssetManagerClientMock = createAssetManagerClient as jest.Mock;

const NAMESPACE = 'default';
const METADATA_INDEX = getMetadataEntitiesDataStreamName(NAMESPACE);
const LATEST_INDEX = getLatestEntitiesIndexName(NAMESPACE);

const makeEsqlResponse = (values: Array<Array<number | null>>) => ({
  columns: [
    { name: 'resolvedEntities', type: 'long' },
    { name: 'resolutionGroups', type: 'long' },
    { name: 'maxGroupAliases', type: 'long' },
  ],
  values,
});

describe('getEntityRiskScoreDistribution', () => {
  let logger: MockedLogger;
  beforeEach(() => {
    logger = loggerMock.create();
  });

  it('counts every entity of the type, including entities with no risk band', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.search.mockResolvedValue({
      aggregations: {
        bands: {
          buckets: [
            { key: 'Critical', doc_count: 1 },
            { key: 'High', doc_count: 2 },
            { key: 'Unknown', doc_count: 3 },
            { key: 'Severe', doc_count: 1 },
          ],
        },
        scorePercentiles: { values: { '50.0': 40, '90.0': '88.5' } },
      },
    } as never);

    const { signal } = new AbortController();
    const result = await getEntityRiskScoreDistribution(
      esClient,
      'my-index',
      'host',
      logger,
      signal
    );

    expect(esClient.search).toHaveBeenCalledWith(
      {
        index: 'my-index',
        size: 0,
        track_total_hits: false,
        query: { term: { 'entity.EngineMetadata.Type': 'host' } },
        aggs: {
          bands: {
            terms: {
              field: 'entity.risk.calculated_level',
              size: 10,
              missing: 'Unknown',
            },
          },
          scorePercentiles: {
            percentiles: {
              field: 'entity.risk.calculated_score_norm',
              percents: [50, 90],
            },
          },
        },
      },
      { signal }
    );
    expect(result).toEqual({
      critical: 1,
      high: 2,
      moderate: 0,
      low: 0,
      unknown: 4,
      normP50: 40,
      normP90: 88.5,
    });
  });

  it('omits percentiles when the search has no score values', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.search.mockResolvedValue({
      aggregations: {
        bands: { buckets: [] },
        scorePercentiles: { values: { '50.0': null, '90.0': 'NaN' } },
      },
    } as never);

    const result = await getEntityRiskScoreDistribution(
      esClient,
      'my-index',
      'user',
      logger,
      new AbortController().signal
    );

    expect(result).toEqual({
      critical: 0,
      high: 0,
      moderate: 0,
      low: 0,
      unknown: 0,
    });
  });

  it('aggregates resolution risk fields when asked for the resolution score', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.search.mockResolvedValue({
      aggregations: {
        bands: { buckets: [{ key: 'Critical', doc_count: 4 }] },
        scorePercentiles: { values: { '50.0': 61, '90.0': 95 } },
      },
    } as never);

    const { signal } = new AbortController();
    const result = await getEntityRiskScoreDistribution(
      esClient,
      'my-index',
      'user',
      logger,
      signal,
      'resolution'
    );

    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        aggs: {
          bands: {
            terms: {
              field: 'entity.relationships.resolution.risk.calculated_level',
              size: 10,
              missing: 'Unknown',
            },
          },
          scorePercentiles: {
            percentiles: {
              field: 'entity.relationships.resolution.risk.calculated_score_norm',
              percents: [50, 90],
            },
          },
        },
      }),
      { signal }
    );
    expect(result).toEqual({
      critical: 4,
      high: 0,
      moderate: 0,
      low: 0,
      unknown: 0,
      normP50: 61,
      normP90: 95,
    });
  });

  describe('malformed responses', () => {
    it('returns all-zero distribution when the search has no aggregations', async () => {
      const esClient = elasticsearchServiceMock.createElasticsearchClient();
      esClient.search.mockResolvedValue({} as never);

      const result = await getEntityRiskScoreDistribution(
        esClient,
        'my-index',
        'host',
        logger,
        new AbortController().signal
      );

      expect(result).toEqual({ critical: 0, high: 0, moderate: 0, low: 0, unknown: 0 });
    });

    it('returns all-zero distribution when aggregations has no bands', async () => {
      const esClient = elasticsearchServiceMock.createElasticsearchClient();
      esClient.search.mockResolvedValue({ aggregations: {} } as never);

      const result = await getEntityRiskScoreDistribution(
        esClient,
        'my-index',
        'host',
        logger,
        new AbortController().signal
      );

      expect(result).toEqual({ critical: 0, high: 0, moderate: 0, low: 0, unknown: 0 });
    });

    it('returns all-zero distribution when bands has no buckets', async () => {
      const esClient = elasticsearchServiceMock.createElasticsearchClient();
      esClient.search.mockResolvedValue({
        aggregations: { bands: {}, scorePercentiles: { values: {} } },
      } as never);

      const result = await getEntityRiskScoreDistribution(
        esClient,
        'my-index',
        'host',
        logger,
        new AbortController().signal
      );

      expect(result).toEqual({ critical: 0, high: 0, moderate: 0, low: 0, unknown: 0 });
    });

    it('maps a bucket with an undefined key to unknown', async () => {
      const esClient = elasticsearchServiceMock.createElasticsearchClient();
      esClient.search.mockResolvedValue({
        aggregations: {
          bands: { buckets: [{ doc_count: 5 }, { key: 'Critical', doc_count: 2 }] },
          scorePercentiles: { values: {} },
        },
      } as never);

      const result = await getEntityRiskScoreDistribution(
        esClient,
        'my-index',
        'host',
        logger,
        new AbortController().signal
      );

      expect(result).toEqual({ critical: 2, high: 0, moderate: 0, low: 0, unknown: 5 });
    });

    it('skips a bucket whose doc_count is not a number', async () => {
      const esClient = elasticsearchServiceMock.createElasticsearchClient();
      esClient.search.mockResolvedValue({
        aggregations: {
          bands: {
            buckets: [
              { key: 'High', doc_count: 'bad' },
              { key: 'Critical', doc_count: null },
              { key: 'Low', doc_count: 3 },
            ],
          },
          scorePercentiles: { values: {} },
        },
      } as never);

      const result = await getEntityRiskScoreDistribution(
        esClient,
        'my-index',
        'host',
        logger,
        new AbortController().signal
      );

      expect(result).toEqual({ critical: 0, high: 0, moderate: 0, low: 3, unknown: 0 });
    });

    it('omits percentiles when scorePercentiles is absent', async () => {
      const esClient = elasticsearchServiceMock.createElasticsearchClient();
      esClient.search.mockResolvedValue({
        aggregations: { bands: { buckets: [{ key: 'High', doc_count: 1 }] } },
      } as never);

      const result = await getEntityRiskScoreDistribution(
        esClient,
        'my-index',
        'host',
        logger,
        new AbortController().signal
      );

      expect(result).toEqual({ critical: 0, high: 1, moderate: 0, low: 0, unknown: 0 });
    });
  });

  it('returns empty distribution and logs a warning when the search rejects', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.search.mockRejectedValue(new Error('es_down'));

    const result = await getEntityRiskScoreDistribution(
      esClient,
      'my-index',
      'host',
      logger,
      new AbortController().signal
    );

    expect(result).toEqual({});
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('es_down'));
  });

  it('returns empty resolution distribution and logs a warning when the resolution search rejects', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.search.mockRejectedValue(new Error('es_down'));

    const result = await getEntityRiskScoreDistribution(
      esClient,
      'my-index',
      'host',
      logger,
      new AbortController().signal,
      'resolution'
    );

    expect(result).toEqual({});
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('es_down'));
  });
});

describe('getEntitySourceDistribution', () => {
  let logger: MockedLogger;
  beforeEach(() => {
    logger = loggerMock.create();
  });

  it('maps source buckets, the missing bucket, and the overflow count', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.search.mockResolvedValue({
      aggregations: {
        sources: {
          buckets: [
            { key: 'aws', doc_count: 4 },
            { key: 'logs-endpoint.alerts', doc_count: 3 },
            { key: 'logs-endpoint__alerts', doc_count: 1 },
            { key: 'unknown', doc_count: 1 },
            { key: 12, doc_count: 2 },
          ],
          sum_other_doc_count: 9,
        },
      },
    } as never);

    const { signal } = new AbortController();
    const result = await getEntitySourceDistribution(esClient, 'my-index', 'host', logger, signal);

    expect(esClient.search).toHaveBeenCalledWith(
      {
        index: 'my-index',
        size: 0,
        track_total_hits: false,
        query: { term: { 'entity.EngineMetadata.Type': 'host' } },
        aggs: {
          sources: {
            terms: {
              field: 'entity.source',
              size: 100,
              missing: 'unknown',
            },
          },
        },
      },
      { signal }
    );
    expect(result).toEqual({
      sources: {
        aws: 4,
        'logs-endpoint__alerts': 4,
        unknown: 1,
        '12': 2,
        other: 9,
      },
    });
  });

  describe('malformed responses', () => {
    it('returns an empty map when the search has no aggregations', async () => {
      const esClient = elasticsearchServiceMock.createElasticsearchClient();
      esClient.search.mockResolvedValue({} as never);

      const result = await getEntitySourceDistribution(
        esClient,
        'my-index',
        'user',
        logger,
        new AbortController().signal
      );

      expect(result).toEqual({ sources: {} });
    });

    it('returns an empty map when aggregations are present but sources is missing', async () => {
      const esClient = elasticsearchServiceMock.createElasticsearchClient();
      esClient.search.mockResolvedValue({ aggregations: {} } as never);

      const result = await getEntitySourceDistribution(
        esClient,
        'my-index',
        'user',
        logger,
        new AbortController().signal
      );

      expect(result).toEqual({ sources: {} });
    });

    it('returns an empty map when aggregations.sources has no buckets', async () => {
      const esClient = elasticsearchServiceMock.createElasticsearchClient();
      esClient.search.mockResolvedValue({
        aggregations: { sources: { sum_other_doc_count: 0 } },
      } as never);

      const result = await getEntitySourceDistribution(
        esClient,
        'my-index',
        'user',
        logger,
        new AbortController().signal
      );

      expect(result).toEqual({ sources: {} });
    });

    it('skips buckets where key is undefined', async () => {
      const esClient = elasticsearchServiceMock.createElasticsearchClient();
      esClient.search.mockResolvedValue({
        aggregations: {
          sources: {
            buckets: [{ doc_count: 5 }, { key: 'aws', doc_count: 3 }],
            sum_other_doc_count: 0,
          },
        },
      } as never);

      const result = await getEntitySourceDistribution(
        esClient,
        'my-index',
        'user',
        logger,
        new AbortController().signal
      );

      expect(result).toEqual({ sources: { aws: 3 } });
    });

    it('skips buckets where doc_count is not a number', async () => {
      const esClient = elasticsearchServiceMock.createElasticsearchClient();
      esClient.search.mockResolvedValue({
        aggregations: {
          sources: {
            buckets: [
              { key: 'aws', doc_count: 'not-a-number' },
              { key: 'gcp', doc_count: null },
              { key: 'azure', doc_count: 7 },
            ],
            sum_other_doc_count: 0,
          },
        },
      } as never);

      const result = await getEntitySourceDistribution(
        esClient,
        'my-index',
        'user',
        logger,
        new AbortController().signal
      );

      expect(result).toEqual({ sources: { azure: 7 } });
    });
  });

  it('returns an empty sources map and logs a warning when the search rejects', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.search.mockRejectedValue(new Error('es_down'));

    const result = await getEntitySourceDistribution(
      esClient,
      'my-index',
      'host',
      logger,
      new AbortController().signal
    );

    expect(result).toEqual({ sources: {} });
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('es_down'));
  });
});

describe('getResolutionState', () => {
  it('returns correct values for a populated resolution state', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.esql.query.mockResolvedValue(makeEsqlResponse([[4, 2, 3]]));

    const result = await getResolutionState(
      esClient,
      'test-index',
      'user',
      new AbortController().signal
    );

    expect(result).toEqual({
      resolvedEntities: 4,
      targetEntities: 2,
      maxGroupSize: 4,
      avgGroupSize: 3,
    });
  });

  it('returns all zeros when the ESQL summary row has null counts', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.esql.query.mockResolvedValue(makeEsqlResponse([[null, 0, null]]));

    const result = await getResolutionState(
      esClient,
      'test-index',
      'user',
      new AbortController().signal
    );

    expect(result).toEqual({
      resolvedEntities: 0,
      targetEntities: 0,
      maxGroupSize: 0,
      avgGroupSize: 0,
    });
  });

  it('returns all zeros when the ESQL response has no rows', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.esql.query.mockResolvedValue(makeEsqlResponse([]));

    const result = await getResolutionState(
      esClient,
      'test-index',
      'user',
      new AbortController().signal
    );

    expect(result).toEqual({
      resolvedEntities: 0,
      targetEntities: 0,
      maxGroupSize: 0,
      avgGroupSize: 0,
    });
  });

  it('maps summary values by column name regardless of column order', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.esql.query.mockResolvedValue({
      columns: [
        { name: 'maxGroupAliases', type: 'long' },
        { name: 'resolvedEntities', type: 'long' },
        { name: 'resolutionGroups', type: 'long' },
      ],
      values: [[3, 4, 2]],
    });

    const result = await getResolutionState(
      esClient,
      'test-index',
      'user',
      new AbortController().signal
    );

    expect(result).toEqual({
      resolvedEntities: 4,
      targetEntities: 2,
      maxGroupSize: 4,
      avgGroupSize: 3,
    });
  });

  it('passes the abort controller signal to the ESQL query call', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.esql.query.mockResolvedValue(makeEsqlResponse([[0, 0, 0]]));
    const { signal } = new AbortController();

    await getResolutionState(esClient, 'my-index', 'generic', signal);

    expect(esClient.esql.query).toHaveBeenCalledWith(expect.any(Object), {
      signal,
    });
  });

  it('queries the given index and scopes to the entity type in the ESQL pipeline', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.esql.query.mockResolvedValue(makeEsqlResponse([[0, 0, 0]]));

    await getResolutionState(esClient, 'my-index', 'host', new AbortController().signal);

    const [queryParams] = esClient.esql.query.mock.calls[0];
    expect(queryParams.query).toContain('FROM my-index');
    expect(queryParams.query).toContain('entity.EngineMetadata.Type == "host"');
    expect(queryParams.query).toContain('entity.relationships.resolution.resolved_to IS NOT NULL');
    expect(queryParams.query).toContain(
      'STATS resolvedEntities = SUM(aliasCount), resolutionGroups = COUNT(*), maxGroupAliases = MAX(aliasCount)'
    );
  });
});

describe('status report task — usage, resolution state & metadata telemetry', () => {
  let logger: MockedLogger;
  let reportEvent: jest.Mock;
  let count: jest.Mock;
  let esqlQuery: jest.Mock;
  let getStatus: jest.Mock;
  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
  let withContextSpy: jest.Mock;

  // Drives the task the way task-manager does: register, grab the definition,
  // build the runner and run it once.
  const runStatusReportTask = async () => {
    const taskManager = {
      registerTaskDefinitions: jest.fn(),
    } as unknown as TaskManagerSetupContract;
    const core = {
      analytics: { reportEvent },
      getStartServices: jest.fn().mockResolvedValue([
        {
          executionContext: { withContext: withContextSpy },
          savedObjects: {
            createInternalRepository: jest.fn().mockReturnValue({
              find: jest.fn().mockResolvedValue({ saved_objects: [{ id: 'engine' }], total: 1 }),
            }),
          },
        },
        {},
      ]),
    } as unknown as EntityStoreCoreSetup;

    registerStatusReportTask({ taskManager, logger, core });

    const [definitions] = (taskManager.registerTaskDefinitions as jest.Mock).mock.calls[0];
    const [taskType] = Object.keys(definitions);
    const runner = definitions[taskType].createTaskRunner({
      taskInstance: { id: `status:${NAMESPACE}`, state: { namespace: NAMESPACE } },
      fakeRequest: {},
      signal: new AbortController().signal,
    });
    return runner.run();
  };

  beforeEach(() => {
    jest.clearAllMocks();
    logger = loggerMock.create();
    reportEvent = jest.fn();
    withContextSpy = jest.fn(<T>(_ctx: unknown, fn: () => T) => fn());
    getStatus = jest.fn().mockResolvedValue({ status: ENTITY_STORE_STATUS.NOT_INSTALLED });
    // Store-usage counts carry a `query`; the metadata-datastream count does not.
    count = jest.fn(async (params: { query?: unknown }) =>
      params.query ? { count: 5 } : { count: 42 }
    );
    // Default resolution state: 3 resolved entities in 1 group, max bucket = 2 aliases
    esqlQuery = jest.fn().mockResolvedValue(makeEsqlResponse([[3, 1, 2]]));
    esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.count.mockImplementation(count);
    esClient.esql.query.mockImplementation(esqlQuery);

    createAssetManagerClientMock.mockResolvedValue({
      assetManagerClient: { getStatus },
      esClient,
    });
  });

  it('reports the metadata datastream doc count when the datastream exists', async () => {
    await runStatusReportTask();

    expect(reportEvent).toHaveBeenCalledWith(ENTITY_STORE_METADATA_USAGE_EVENT.eventType, {
      namespace: NAMESPACE,
      docCount: 42,
    });
  });

  it('counts the namespace-scoped metadata datastream with the abort signal', async () => {
    await runStatusReportTask();

    const metadataCountCall = count.mock.calls.find(([params]) => !params.query);
    expect(metadataCountCall).toBeDefined();
    expect(metadataCountCall![0]).toEqual({ index: METADATA_INDEX });
    expect(metadataCountCall![1]).toEqual({ signal: expect.any(AbortSignal) });
  });

  it('does not report metadata usage and does not throw when the datastream is absent (v2 FF off)', async () => {
    count.mockImplementation(async (params: { query?: unknown }) => {
      if (params.query) return { count: 5 };
      throw new Error('index_not_found_exception');
    });

    await expect(runStatusReportTask()).resolves.toEqual({ state: { namespace: NAMESPACE } });

    const reportedMetadata = reportEvent.mock.calls.some(
      ([eventType]) => eventType === ENTITY_STORE_METADATA_USAGE_EVENT.eventType
    );
    expect(reportedMetadata).toBe(false);
    expect(logger.debug).toHaveBeenCalledWith(
      expect.stringContaining('Metadata datastream not present')
    );
  });

  it('fires one resolution state event per entity type with correctly computed payload', async () => {
    // storeSize = 7, resolvedEntities=4, targetEntities=2
    // standaloneEntities = max(0, 7 - 4 - 2) = 1
    // avgGroupSize = 4/2 + 1 = 3
    // maxGroupSize = 3 + 1 = 4
    count.mockImplementation(async (params: { query?: unknown }) =>
      params.query ? { count: 7 } : { count: 42 }
    );
    esqlQuery.mockResolvedValue(makeEsqlResponse([[4, 2, 3]]));

    await runStatusReportTask();

    const resolutionStateCalls = reportEvent.mock.calls.filter(
      ([eventType]) => eventType === ENTITY_STORE_RESOLUTION_STATE_EVENT.eventType
    );

    // Exactly one event per entity type, covering every type — a skipped or
    // duplicated type would change the count or the set of entityType values.
    expect(resolutionStateCalls).toHaveLength(ALL_ENTITY_TYPES.length);
    const reportedTypes = resolutionStateCalls.map(([, payload]) => payload.entityType);
    expect(new Set(reportedTypes)).toEqual(new Set(ALL_ENTITY_TYPES));

    resolutionStateCalls.forEach(([, payload]) => {
      expect(payload).toMatchObject({
        namespace: NAMESPACE,
        totalEntities: 7,
        resolvedEntities: 4,
        targetEntities: 2,
        standaloneEntities: 1,
        resolutionGroups: 2,
        avgGroupSize: 3,
        maxGroupSize: 4,
      });
    });
  });

  it('reports zeros for the no-resolution case and treats all entities as standalone', async () => {
    // storeSize = 5, no resolution groups → standaloneEntities = totalEntities, avgGroupSize = 0
    esqlQuery.mockResolvedValue(makeEsqlResponse([[null, 0, null]]));

    await runStatusReportTask();

    const [, payload] = reportEvent.mock.calls.find(
      ([eventType]) => eventType === ENTITY_STORE_RESOLUTION_STATE_EVENT.eventType
    )!;

    expect(payload).toMatchObject({
      totalEntities: 5,
      resolvedEntities: 0,
      targetEntities: 0,
      standaloneEntities: 5,
      resolutionGroups: 0,
      avgGroupSize: 0,
      maxGroupSize: 0,
    });
  });

  it('reports a fractional avgGroupSize when the average is non-integer', async () => {
    // resolvedEntities=5 across resolutionGroups=2 → avgGroupSize = 5/2 + 1 = 3.5 (float field)
    esqlQuery.mockResolvedValue(makeEsqlResponse([[5, 2, 3]]));

    await runStatusReportTask();

    const [, payload] = reportEvent.mock.calls.find(
      ([eventType]) => eventType === ENTITY_STORE_RESOLUTION_STATE_EVENT.eventType
    )!;

    expect(payload.avgGroupSize).toBe(3.5);
  });

  it('collects the error, does not report resolution state, and rethrows when the ESQL query fails', async () => {
    esqlQuery.mockRejectedValue(new Error('boom'));

    await expect(runStatusReportTask()).rejects.toThrow('boom');

    const reportedResolutionState = reportEvent.mock.calls.some(
      ([eventType]) => eventType === ENTITY_STORE_RESOLUTION_STATE_EVENT.eventType
    );
    expect(reportedResolutionState).toBe(false);
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Error reporting store usage for')
    );
  });

  it('clamps standaloneEntities to 0 when arithmetic would go negative', async () => {
    // storeSize = 5, resolvedEntities=4, targetEntities=3 → 5 - 4 - 3 = -2 → clamped to 0
    esqlQuery.mockResolvedValue(makeEsqlResponse([[4, 3, 1]]));

    await runStatusReportTask();

    const [, payload] = reportEvent.mock.calls.find(
      ([eventType]) => eventType === ENTITY_STORE_RESOLUTION_STATE_EVENT.eventType
    )!;

    expect(payload.standaloneEntities).toBe(0);
  });

  it('queries the latest entities index for both the store size and the resolution state', async () => {
    await runStatusReportTask();

    const storeSizeCountCalls = count.mock.calls.filter(([params]) => params.query);
    expect(storeSizeCountCalls).toHaveLength(ALL_ENTITY_TYPES.length);
    storeSizeCountCalls.forEach(([params]) => {
      expect(params.index).toBe(LATEST_INDEX);
    });

    expect(esqlQuery).toHaveBeenCalledTimes(ALL_ENTITY_TYPES.length);
    esqlQuery.mock.calls.forEach(([params]) => {
      expect(params.query).toContain(`FROM ${LATEST_INDEX}`);
    });
  });

  it('collects the error and reports neither usage nor resolution state when the store-size count fails', async () => {
    // Store-size counts carry a `query`; fail those while leaving the metadata count intact.
    count.mockImplementation(async (params: { query?: unknown }) => {
      if (params.query) throw new Error('count_boom');
      return { count: 42 };
    });

    await expect(runStatusReportTask()).rejects.toThrow('count_boom');

    const usageReported = reportEvent.mock.calls.some(
      ([eventType]) => eventType === ENTITY_STORE_USAGE_EVENT.eventType
    );
    const resolutionReported = reportEvent.mock.calls.some(
      ([eventType]) => eventType === ENTITY_STORE_RESOLUTION_STATE_EVENT.eventType
    );
    expect(usageReported).toBe(false);
    expect(resolutionReported).toBe(false);
    // getResolutionState is never reached when getStoreSize throws first.
    expect(esqlQuery).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Error reporting store usage for')
    );
  });

  it('isolates failures per entity type — a failure for one type still reports the others', async () => {
    const [failingType] = ALL_ENTITY_TYPES;
    esqlQuery.mockImplementation(async ({ query }: { query: string }) => {
      if (query.includes(`"${failingType}"`)) throw new Error('boom');
      return makeEsqlResponse([[3, 1, 2]]);
    });

    await expect(runStatusReportTask()).rejects.toThrow('boom');

    const resolutionStateTypes = reportEvent.mock.calls
      .filter(([eventType]) => eventType === ENTITY_STORE_RESOLUTION_STATE_EVENT.eventType)
      .map(([, payload]) => payload.entityType);

    // The failing type is skipped; every other type still emits its event.
    expect(resolutionStateTypes).not.toContain(failingType);
    expect(new Set(resolutionStateTypes)).toEqual(
      new Set(ALL_ENTITY_TYPES.filter((type) => type !== failingType))
    );
    // Usage events are unaffected — they fire before the resolution query for every type.
    const usageTypes = reportEvent.mock.calls
      .filter(([eventType]) => eventType === ENTITY_STORE_USAGE_EVENT.eventType)
      .map(([, payload]) => payload.entityType);
    expect(new Set(usageTypes)).toEqual(new Set(ALL_ENTITY_TYPES));
  });

  it('runs the registered runner inside the status-report execution context', async () => {
    await runStatusReportTask();

    expect(withContextSpy).toHaveBeenCalledWith(
      buildEaExecutionContext(
        EA_EXECUTION_CONTEXT_NAMES.ENTITY_STORE_STATUS_REPORT_TASK,
        `status:${NAMESPACE}`
      ),
      expect.any(Function)
    );
  });

  it('adds per-source counts to the usage event', async () => {
    esClient.search.mockResolvedValue({
      aggregations: {
        sources: {
          buckets: [{ key: 'elastic_defend', doc_count: 3 }],
          sum_other_doc_count: 1,
        },
      },
    } as never);

    await runStatusReportTask();

    const usageCalls = reportEvent.mock.calls.filter(
      ([eventType]) => eventType === ENTITY_STORE_USAGE_EVENT.eventType
    );
    expect(usageCalls).toHaveLength(ALL_ENTITY_TYPES.length);
    usageCalls.forEach(([, payload]) => {
      expect(payload).toMatchObject({
        namespace: NAMESPACE,
        storeSize: 5,
        sources: { elastic_defend: 3, other: 1 },
      });
    });
    expect(esClient.search).toHaveBeenCalledTimes(ALL_ENTITY_TYPES.length * 3);
  });

  it('adds base and resolution risk score distributions to the usage event', async () => {
    esClient.search.mockImplementation(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (async (params: any) => {
        const levelField = params?.aggs?.bands?.terms?.field;
        if (levelField === 'entity.risk.calculated_level') {
          return {
            aggregations: {
              bands: { buckets: [{ key: 'High', doc_count: 2 }] },
              scorePercentiles: { values: { '50.0': 72, '90.0': 91 } },
            },
          };
        }
        if (levelField === 'entity.relationships.resolution.risk.calculated_level') {
          return {
            aggregations: {
              bands: { buckets: [{ key: 'Critical', doc_count: 1 }] },
              scorePercentiles: { values: { '50.0': 40, '90.0': 80 } },
            },
          };
        }
        return {
          aggregations: {
            sources: { buckets: [], sum_other_doc_count: 0 },
          },
        };
      }) as any
    );

    await runStatusReportTask();

    const usageCall = reportEvent.mock.calls.find(
      ([eventType]) => eventType === ENTITY_STORE_USAGE_EVENT.eventType
    );
    expect(usageCall?.[1].baseScoreDistribution).toEqual({
      critical: 0,
      high: 2,
      moderate: 0,
      low: 0,
      unknown: 0,
      normP50: 72,
      normP90: 91,
    });
    expect(usageCall?.[1].resolutionScoreDistribution).toEqual({
      critical: 1,
      high: 0,
      moderate: 0,
      low: 0,
      unknown: 0,
      normP50: 40,
      normP90: 80,
    });
    expect(usageCall?.[1]).not.toHaveProperty('riskScoreDistribution');
  });

  it('reports empty distributions and logs a warning when the search queries fail for an entity type', async () => {
    const [failingType] = ALL_ENTITY_TYPES;
    esClient.search.mockImplementation(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (async (params: any) => {
        if (params?.query?.term?.['entity.EngineMetadata.Type'] === failingType) {
          throw new Error('source_boom');
        }
        return {
          aggregations: {
            sources: { buckets: [{ key: 'aws', doc_count: 2 }], sum_other_doc_count: 0 },
          },
        };
      }) as any
    );

    // Task resolves — errors are caught inside each distribution function.
    await expect(runStatusReportTask()).resolves.toBeDefined();

    // Usage and resolution state events fire for every type, including the failing one.
    const usageTypes = reportEvent.mock.calls
      .filter(([eventType]) => eventType === ENTITY_STORE_USAGE_EVENT.eventType)
      .map(([, payload]) => payload.entityType);
    expect(new Set(usageTypes)).toEqual(new Set(ALL_ENTITY_TYPES));

    const resolutionTypes = reportEvent.mock.calls
      .filter(([eventType]) => eventType === ENTITY_STORE_RESOLUTION_STATE_EVENT.eventType)
      .map(([, payload]) => payload.entityType);
    expect(new Set(resolutionTypes)).toEqual(new Set(ALL_ENTITY_TYPES));

    // The failing type emits empty distributions.
    const failingUsageCall = reportEvent.mock.calls.find(
      ([eventType, payload]) =>
        eventType === ENTITY_STORE_USAGE_EVENT.eventType && payload.entityType === failingType
    );
    expect(failingUsageCall?.[1].sources).toEqual({});
    expect(failingUsageCall?.[1].baseScoreDistribution).toEqual({});

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('source_boom'));
  });
});
