/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TaskManagerSetupContract } from '@kbn/task-manager-plugin/server';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { loggerMock, type MockedLogger } from '@kbn/logging-mocks';

import {
  registerStatusReportTask,
  getEntityRiskScoreDistribution,
  getEntitySourceDistribution,
  getResolutionRulesState,
  getResolutionState,
} from './status_report_task';
import { createAssetManagerClient, createLogsExtractionClient } from './factories';
import {
  ENTITY_STORE_METADATA_USAGE_EVENT,
  ENTITY_STORE_ENTITY_METADATA_EVENT,
  ENTITY_STORE_LOG_COVERAGE_EVENT,
  ENTITY_STORE_SOURCE_STATE_EVENT,
  ENTITY_STORE_RESOLUTION_RULES_STATE_EVENT,
  ENTITY_STORE_RESOLUTION_STATE_EVENT,
  ENTITY_STORE_USAGE_EVENT,
} from '../telemetry/events';
import { RESOLUTION_RULE_CONFIGS, ResolutionRulesClient } from '../domain/resolution/rules';
import {
  RESOLUTION_RULE_IDS,
  RESOLUTION_RULE_KINDS,
} from '../../common/domain/resolution_rules/constants';
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
const createLogsExtractionClientMock = createLogsExtractionClient as jest.Mock;

const NAMESPACE = 'default';
const METADATA_INDEX = getMetadataEntitiesDataStreamName(NAMESPACE);
const LATEST_INDEX = getLatestEntitiesIndexName(NAMESPACE);

const EMAIL_RULE_DISABLED_OVERRIDE = {
  attributes: {
    id: RESOLUTION_RULE_IDS.EMAIL_EXACT_MATCH,
    kind: RESOLUTION_RULE_KINDS.SAME_FIELD,
    managed: true,
    enabled: false,
  },
};

// Rows are [groups, size]: how many resolution groups have this size (target + aliases).
const makeEsqlResponse = (values: Array<Array<number | null>>) => ({
  columns: [
    { name: 'groups', type: 'long' },
    { name: 'size', type: 'long' },
  ],
  values,
});

const isResolutionStateQuery = ({ query }: { query: string }) => query.includes('aliasCount');

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
    // Two groups: a target with 3 aliases (size 4) and a target with 1 alias (size 2)
    esClient.esql.query.mockResolvedValue(
      makeEsqlResponse([
        [1, 4],
        [1, 2],
      ])
    );

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
      groupSizes: [
        { size: 2, groups: 1 },
        { size: 4, groups: 1 },
      ],
    });
  });

  it('returns all zeros when the ESQL rows have null counts', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.esql.query.mockResolvedValue(makeEsqlResponse([[null, null]]));

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
      groupSizes: [],
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
      groupSizes: [],
    });
  });

  it('maps summary values by column name regardless of column order', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.esql.query.mockResolvedValue({
      columns: [
        { name: 'size', type: 'long' },
        { name: 'groups', type: 'long' },
      ],
      values: [
        [4, 1],
        [2, 1],
      ],
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
      groupSizes: [
        { size: 2, groups: 1 },
        { size: 4, groups: 1 },
      ],
    });
  });

  it('passes the abort controller signal to the ESQL query call', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.esql.query.mockResolvedValue(makeEsqlResponse([]));
    const { signal } = new AbortController();

    await getResolutionState(esClient, 'my-index', 'generic', signal);

    expect(esClient.esql.query).toHaveBeenCalledWith(expect.any(Object), {
      signal,
    });
  });

  it('queries the given index and scopes to the entity type in the ESQL pipeline', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.esql.query.mockResolvedValue(makeEsqlResponse([]));

    await getResolutionState(esClient, 'my-index', 'host', new AbortController().signal);

    const [queryParams] = esClient.esql.query.mock.calls[0];
    expect(queryParams.query).toContain('FROM my-index');
    expect(queryParams.query).toContain('entity.EngineMetadata.Type == "host"');
    expect(queryParams.query).toContain('entity.relationships.resolution.resolved_to IS NOT NULL');
    expect(queryParams.query).toContain('STATS groups = COUNT(*) BY size = aliasCount + 1');
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
  let soFind: jest.Mock;
  let getIndexTemplate: jest.Mock;
  let getLocalIndexPatterns: jest.Mock;

  // Drives the task the way task-manager does: register, grab the definition,
  // build the runner and run it once.
  const runStatusReportTask = async (extraState: Record<string, unknown> = {}) => {
    const taskManager = {
      registerTaskDefinitions: jest.fn(),
    } as unknown as TaskManagerSetupContract;
    const core = {
      analytics: { reportEvent },
      getStartServices: jest.fn().mockResolvedValue([
        {
          executionContext: { withContext: withContextSpy },
          elasticsearch: {
            client: { asInternalUser: { indices: { getIndexTemplate } } },
          },
          savedObjects: {
            createInternalRepository: jest.fn().mockReturnValue({
              find: jest.fn().mockResolvedValue({ saved_objects: [{ id: 'engine' }], total: 1 }),
            }),
            getScopedClient: jest.fn().mockReturnValue({ find: soFind }),
          },
        },
        {},
      ]),
    } as unknown as EntityStoreCoreSetup;

    registerStatusReportTask({ taskManager, logger, core });

    const [definitions] = (taskManager.registerTaskDefinitions as jest.Mock).mock.calls[0];
    const [taskType] = Object.keys(definitions);
    const runner = definitions[taskType].createTaskRunner({
      taskInstance: {
        id: `status:${NAMESPACE}`,
        state: { namespace: NAMESPACE, ...extraState },
      },
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
    soFind = jest.fn().mockResolvedValue({ saved_objects: [] });
    getIndexTemplate = jest.fn().mockResolvedValue({ index_templates: [] });
    getStatus = jest.fn().mockResolvedValue({ status: ENTITY_STORE_STATUS.NOT_INSTALLED });
    // Store-usage counts carry a `query`; the metadata-datastream count does not.
    count = jest.fn(async (params: { query?: unknown }) =>
      params.query ? { count: 5 } : { count: 42 }
    );
    // Default resolution state: one group of 3 (a target and 2 aliases)
    esqlQuery = jest.fn().mockResolvedValue(makeEsqlResponse([[1, 3]]));
    esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.count.mockImplementation(count);
    esClient.esql.query.mockImplementation(esqlQuery);

    // No index patterns by default, so the log probe is skipped and sends no ES|QL.
    getLocalIndexPatterns = jest.fn().mockResolvedValue([]);
    createLogsExtractionClientMock.mockResolvedValue({
      logsExtractionClient: { getLocalIndexPatterns },
    });

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

    await expect(runStatusReportTask()).resolves.toEqual({
      state: { namespace: NAMESPACE, logCoverageTargetDocs: expect.any(Number) },
    });

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
    esqlQuery.mockResolvedValue(
      makeEsqlResponse([
        [1, 4],
        [1, 2],
      ])
    );

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
    esqlQuery.mockResolvedValue(makeEsqlResponse([]));

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
    // resolvedEntities=5 across 2 groups (sizes 4 and 3) → avgGroupSize = 5/2 + 1 = 3.5 (float field)
    esqlQuery.mockResolvedValue(
      makeEsqlResponse([
        [1, 4],
        [1, 3],
      ])
    );

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
    // Three groups (sizes 3, 2, 2): resolvedEntities = 4, targetEntities = 3
    esqlQuery.mockResolvedValue(
      makeEsqlResponse([
        [1, 3],
        [2, 2],
      ])
    );

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

    const resolutionStateCalls = esqlQuery.mock.calls.filter(([params]) =>
      isResolutionStateQuery(params)
    );
    expect(resolutionStateCalls).toHaveLength(ALL_ENTITY_TYPES.length);
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
      if (isResolutionStateQuery({ query }) && query.includes(`"${failingType}"`)) {
        throw new Error('boom');
      }
      return makeEsqlResponse([[1, 3]]);
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
    // Three usage searches per type. The metadata searches are counted in their own tests.
    const usageSearches = esClient.search.mock.calls.filter(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ([params]: any) => !params?.aggs?.withoutSource && !params?.runtime_mappings
    );
    expect(usageSearches).toHaveLength(ALL_ENTITY_TYPES.length * 3);
  });

  describe('log coverage', () => {
    const reportedCoverage = () =>
      reportEvent.mock.calls
        .filter(([eventType]) => eventType === ENTITY_STORE_LOG_COVERAGE_EVENT.eventType)
        .map(([, payload]) => payload);

    it('reports a skipped outcome when there are no index patterns', async () => {
      await runStatusReportTask();

      expect(reportedCoverage()).toEqual([
        expect.objectContaining({ namespace: NAMESPACE, outcome: 'skipped', windowHours: 12 }),
      ]);
    });

    it('counts, samples with the configured patterns and excluded users, and reports the sources', async () => {
      getLocalIndexPatterns.mockResolvedValue(['logs-*', 'extra-*']);
      getStatus.mockResolvedValue({
        status: ENTITY_STORE_STATUS.RUNNING,
        engines: [],
        logsExtractionConfigByType: {
          user: { additionalIndexPatterns: ['extra-*'], excludedIndexPatterns: ['skip-*'] },
        },
        excludedUserNames: ['svc_backup'],
      });
      esqlQuery.mockImplementation(async (params: { query: string }) => {
        if (isResolutionStateQuery(params)) return makeEsqlResponse([[1, 3]]);
        if (params.query.includes('totalDocs')) {
          return { columns: [{ name: 'totalDocs', type: 'long' }], values: [[1_000_000]] };
        }
        return {
          columns: [
            'sampledDocs',
            'withUserName',
            'withUserEmail',
            'withUserId',
            'withHostId',
            'withHostName',
            'matchesCreationRule',
            'entity.source',
          ].map((name) => ({ name, type: 'long' })),
          values: [
            [400, 390, 10, 20, 300, 350, 5, 'system.auth'],
            [100, 0, 0, 0, 0, 0, 0, null],
          ],
        };
      });

      const result = await runStatusReportTask();

      expect(getLocalIndexPatterns).toHaveBeenCalledWith(['extra-*'], ['skip-*']);
      const sampleQuery = esqlQuery.mock.calls
        .map(([params]) => params.query as string)
        .find((query) => query.includes('sampledDocs'))!;
      expect(sampleQuery).toContain('SAMPLE 0.05');
      expect(sampleQuery).toContain('"svc_backup"');
      expect(reportedCoverage()).toEqual([
        {
          namespace: NAMESPACE,
          outcome: 'complete',
          windowHours: 12,
          durationMs: expect.any(Number),
          totalDocs: 1_000_000,
          sampleRate: 0.05,
          sampledDocs: 500,
          sources: [
            {
              source: 'system.auth',
              sampledDocs: 400,
              withUserName: 390,
              withUserEmail: 10,
              withUserId: 20,
              withHostId: 300,
              withHostName: 350,
              matchesCreationRule: 5,
            },
            expect.objectContaining({ source: 'unknown', sampledDocs: 100 }),
          ],
        },
      ]);
      // A successful sample grows the next one, up to the cap.
      expect(result).toEqual({
        state: { namespace: NAMESPACE, logCoverageTargetDocs: 50_000 },
      });
    });

    it('reports failed, keeps the sample size and does not fail the task when the probe breaks', async () => {
      getLocalIndexPatterns.mockResolvedValue(['logs-*']);
      esqlQuery.mockImplementation(async (params: { query: string }) => {
        if (isResolutionStateQuery(params)) return makeEsqlResponse([[1, 3]]);
        throw new Error('esql_boom');
      });

      await expect(runStatusReportTask()).resolves.toEqual({
        state: { namespace: NAMESPACE, logCoverageTargetDocs: 50_000 },
      });

      expect(reportedCoverage()).toEqual([expect.objectContaining({ outcome: 'failed' })]);
    });

    it('reports failed when the index patterns cannot be resolved', async () => {
      getLocalIndexPatterns.mockRejectedValue(new Error('data_view_boom'));

      await runStatusReportTask();

      expect(reportedCoverage()).toEqual([expect.objectContaining({ outcome: 'failed' })]);
    });

    it('reads the sample size from the task state', async () => {
      getLocalIndexPatterns.mockResolvedValue(['logs-*']);
      esqlQuery.mockImplementation(async (params: { query: string }) => {
        if (isResolutionStateQuery(params)) return makeEsqlResponse([[1, 3]]);
        return params.query.includes('totalDocs')
          ? { columns: [{ name: 'totalDocs', type: 'long' }], values: [[100_000]] }
          : { columns: [], values: [] };
      });

      await runStatusReportTask({ logCoverageTargetDocs: 10_000 });

      const sampleQuery = esqlQuery.mock.calls
        .map(([params]) => params.query as string)
        .find((query) => query.includes('sampledDocs'))!;
      // 10k target over 100k docs
      expect(sampleQuery).toContain('SAMPLE 0.1');
    });
  });

  describe('entity metadata', () => {
    const metadataAggregations = {
      sources: {
        buckets: [
          {
            key: 'okta',
            doc_count: 6,
            resolved: { doc_count: 2 },
            withRiskScore: { doc_count: 3 },
            watchlistManaged: { doc_count: 1 },
            watchlistCustom: { doc_count: 4 },
          },
          { key: 'my_app', doc_count: 2 },
        ],
      },
      withoutSource: { doc_count: 1 },
      withMultipleSources: { doc_count: 2 },
      byCreator: {
        buckets: [
          { key: 'logs_extraction', doc_count: 7 },
          { key: 'risk_score_maintainer', doc_count: 1 },
        ],
      },
      byIdentityProvider: { buckets: [{ key: 'okta', doc_count: 6 }] },
      activity: {
        buckets: {
          seenLast24h: { doc_count: 3 },
          seenLast7d: { doc_count: 5 },
          seenLast30d: { doc_count: 7 },
          notSeenIn30d: { doc_count: 1 },
        },
      },
      criticality: { buckets: [{ key: 'high_impact', doc_count: 2 }] },
      onAnyWatchlist: { doc_count: 5 },
      relationships: { buckets: { owns: { doc_count: 2 } } },
      attr_asset: {
        buckets: [
          { key: 1, key_as_string: 'true', doc_count: 4 },
          { key: 0, key_as_string: 'false', doc_count: 1 },
        ],
      },
    };

    const reportedMetadata = () =>
      reportEvent.mock.calls
        .filter(([eventType]) => eventType === ENTITY_STORE_ENTITY_METADATA_EVENT.eventType)
        .map(([, payload]) => payload);

    beforeEach(() => {
      esClient.search.mockImplementation(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (async (params: any) =>
          params?.aggs?.withoutSource
            ? { aggregations: metadataAggregations }
            : { aggregations: {} }) as never
      );
      getIndexTemplate.mockResolvedValue({
        index_templates: [
          { index_template: { _meta: { managed_by: 'fleet', package: { name: 'okta' } } } },
          { index_template: { _meta: { managed_by: 'custom', package: { name: 'my_app' } } } },
        ],
      });
    });

    it('reports one metadata event per entity type with the resolution group sizes', async () => {
      esqlQuery.mockImplementation(async (params: { query: string }) =>
        isResolutionStateQuery(params)
          ? makeEsqlResponse([
              [1, 4],
              [1, 2],
            ])
          : makeEsqlResponse([])
      );

      await runStatusReportTask();

      const events = reportedMetadata();
      expect(events.map((event) => event.entityType).sort()).toEqual([...ALL_ENTITY_TYPES].sort());
      events.forEach((event) => {
        expect(event).toMatchObject({
          namespace: NAMESPACE,
          totalEntities: 5,
          resolution: {
            groupSizes: [
              { size: 2, groups: 1 },
              { size: 4, groups: 1 },
            ],
          },
          origin: { withMultipleSources: 2, withoutSource: 1 },
          activity: { seenLast24h: 3, seenLast7d: 5, seenLast30d: 7, notSeenIn30d: 1 },
          securityContext: { onAnyWatchlist: 5, criticality: { highImpact: 2, lowImpact: 0 } },
        });
        expect(event.enrichment.attributes).toContainEqual({
          attribute: 'asset',
          setTrue: 4,
          setFalse: 1,
        });
        expect(event.enrichment.relationships).toContainEqual({ type: 'owns', entities: 2 });
      });
    });

    it('only reports type-specific fields for the types they apply to', async () => {
      await runStatusReportTask();

      const byType = Object.fromEntries(
        reportedMetadata().map((event) => [event.entityType, event])
      );
      expect(byType.user.origin.byIdentityProvider).toEqual([{ provider: 'okta', entities: 6 }]);
      expect(byType.host.origin.byIdentityProvider).toBeUndefined();
      expect(byType.service.origin.byIdentityProvider).toBeUndefined();
      expect(byType.generic.origin.byIdentityProvider).toBeUndefined();
      expect(byType.generic.unlinkedDuplicates).toEqual({});
      expect(byType.generic.identifiers).toBeUndefined();
    });

    it('reports a missing creator as logs_extraction and tags the source kind', async () => {
      await runStatusReportTask();

      const sourceStates = reportEvent.mock.calls
        .filter(([eventType]) => eventType === ENTITY_STORE_SOURCE_STATE_EVENT.eventType)
        .map(([, payload]) => payload)
        .filter((payload) => payload.entityType === 'user');
      expect(sourceStates).toHaveLength(2);
      expect(sourceStates.find((payload) => payload.source === 'okta')).toMatchObject({
        sourceKind: 'integration',
        entities: 6,
        resolved: 2,
        withRiskScore: 3,
        onWatchlist: { managed: 1, custom: 4 },
      });
      expect(sourceStates.find((payload) => payload.source === 'my_app')).toMatchObject({
        sourceKind: 'custom',
        entities: 2,
      });
      expect(reportedMetadata()[0].origin.byCreator).toContainEqual({
        creator: 'logs_extraction',
        entities: 7,
      });
    });

    it('still reports the event when an expensive part fails, and says which one', async () => {
      esqlQuery.mockImplementation(async (params: { query: string }) => {
        if (isResolutionStateQuery(params)) return makeEsqlResponse([[1, 3]]);
        throw new Error('esql_boom');
      });

      await expect(runStatusReportTask()).resolves.toEqual({
        state: { namespace: NAMESPACE, logCoverageTargetDocs: expect.any(Number) },
      });

      const user = reportedMetadata().find((event) => event.entityType === 'user');
      expect(user).toBeDefined();
      expect(user.unlinkedDuplicates).toEqual({});
      expect(user.collection).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ part: 'sameIdDifferentCase', outcome: 'failed' }),
          expect.objectContaining({ part: 'sameValueAcrossSources.user.email', outcome: 'failed' }),
          expect.objectContaining({ part: 'sourceResolution', outcome: 'failed' }),
        ])
      );
    });

    it('does not report metadata when the cheap pass search fails', async () => {
      esClient.search.mockImplementation(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (async (params: any) => {
          if (params?.aggs?.withoutSource) throw new Error('search_boom');
          return { aggregations: {} };
        }) as never
      );

      await expect(runStatusReportTask()).resolves.toEqual({
        state: { namespace: NAMESPACE, logCoverageTargetDocs: expect.any(Number) },
      });

      expect(reportedMetadata()).toHaveLength(0);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to report entity metadata for')
      );
    });
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

  it('reports the resolution rules state once per namespace', async () => {
    soFind.mockResolvedValue({ saved_objects: [EMAIL_RULE_DISABLED_OVERRIDE] });

    await runStatusReportTask();

    const rulesStateCalls = reportEvent.mock.calls.filter(
      ([eventType]) => eventType === ENTITY_STORE_RESOLUTION_RULES_STATE_EVENT.eventType
    );
    expect(rulesStateCalls).toHaveLength(1);
    expect(rulesStateCalls[0][1].namespace).toBe(NAMESPACE);
    expect(rulesStateCalls[0][1].rules).toHaveLength(RESOLUTION_RULE_CONFIGS.length);
    expect(rulesStateCalls[0][1].rules).toContainEqual({
      id: RESOLUTION_RULE_IDS.EMAIL_EXACT_MATCH,
      enabled: false,
      defaultEnabled: true,
    });
  });

  it('keeps reporting other events when the resolution rules lookup fails', async () => {
    soFind.mockRejectedValue(new Error('so_boom'));

    await expect(runStatusReportTask()).resolves.toEqual({
      state: { namespace: NAMESPACE, logCoverageTargetDocs: expect.any(Number) },
    });

    const reportedRulesState = reportEvent.mock.calls.some(
      ([eventType]) => eventType === ENTITY_STORE_RESOLUTION_RULES_STATE_EVENT.eventType
    );
    expect(reportedRulesState).toBe(false);
    expect(reportEvent).toHaveBeenCalledWith(
      ENTITY_STORE_METADATA_USAGE_EVENT.eventType,
      expect.any(Object)
    );
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('so_boom'));
  });
});

describe('getResolutionRulesState', () => {
  it('returns every rule with its effective and default enabled state', async () => {
    const soClient = {
      find: jest.fn().mockResolvedValue({ saved_objects: [EMAIL_RULE_DISABLED_OVERRIDE] }),
    } as unknown as SavedObjectsClientContract;
    const rulesClient = new ResolutionRulesClient(soClient, NAMESPACE, loggerMock.create());

    const rules = await getResolutionRulesState(rulesClient);

    expect(rules).toEqual(
      RESOLUTION_RULE_CONFIGS.map(({ id, defaultEnabled }) => ({
        id,
        enabled: id === RESOLUTION_RULE_IDS.EMAIL_EXACT_MATCH ? false : defaultEnabled,
        defaultEnabled,
      }))
    );
  });
});
