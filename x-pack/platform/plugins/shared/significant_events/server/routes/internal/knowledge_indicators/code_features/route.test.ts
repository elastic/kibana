/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_ID_LENGTH, type Feature } from '@kbn/significant-events-schema';
import { getCodePredictiveSourceId } from '../../../../lib/knowledge_indicators/code_intelligence';
import { CodeExtractionScopeConflictError } from '../../../../lib/workflows/code_extraction_scope_conflict_error';
import { internalKICodeFeaturesRoutes } from './route';

const mockClassifyLoggingSites = jest.fn();
const mockClassifyOtelSignals = jest.fn();
const mockDiscoverLoggingSites = jest.fn();
const mockIdentifyCodeQueries = jest.fn();
const mockExtractOtelSignalsResult = jest.fn();
const mockGenerateOtelQueries = jest.fn();
const mockResolveConnectorForFeature = jest.fn();
const mockCodeboxListRepos = jest.fn().mockResolvedValue([]);
const mockCodeboxResolveHead = jest.fn();

jest.mock('../../../utils/assert_significant_events_access', () => ({
  assertSignificantEventsAccess: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../../utils/resolve_connector_for_feature', () => ({
  resolveConnectorForFeature: (...args: unknown[]) => mockResolveConnectorForFeature(...args),
}));
jest.mock('../../../../lib/knowledge_indicators/code_intelligence/codebox_client', () => ({
  getCodeboxClient: jest.fn().mockReturnValue({
    health: jest.fn().mockResolvedValue({ status: 'ok' }),
    listRepos: (...args: unknown[]) => mockCodeboxListRepos(...args),
    resolveHead: (...args: unknown[]) => mockCodeboxResolveHead(...args),
    grep: jest.fn().mockResolvedValue([]),
    show: jest.fn().mockResolvedValue(''),
    tree: jest.fn().mockResolvedValue([]),
    languages: jest.fn().mockResolvedValue({}),
    refs: jest.fn().mockResolvedValue([]),
  }),
  resetCodeboxClient: jest.fn(),
}));

jest.mock('../../../../lib/knowledge_indicators/code_intelligence', () => ({
  ...jest.requireActual('../../../../lib/knowledge_indicators/code_intelligence'),
  classifyLoggingSites: (...args: unknown[]) => mockClassifyLoggingSites(...args),
  classifyOtelSignals: (...args: unknown[]) => mockClassifyOtelSignals(...args),
  discoverLoggingSites: (...args: unknown[]) => mockDiscoverLoggingSites(...args),
  identifyCodeQueries: (...args: unknown[]) => mockIdentifyCodeQueries(...args),
  extractOtelSignalsResult: (...args: unknown[]) => mockExtractOtelSignalsResult(...args),
  generateOtelQueries: (...args: unknown[]) => mockGenerateOtelQueries(...args),
}));

const availabilityRoute =
  internalKICodeFeaturesRoutes['GET /internal/streams/code_intelligence/_availability'];
const listRoute =
  internalKICodeFeaturesRoutes['GET /internal/streams/code_intelligence/_knowledge_indicators'];
const resetRoute = internalKICodeFeaturesRoutes['POST /internal/streams/code_intelligence/_reset'];
const serviceDistributionRoute =
  internalKICodeFeaturesRoutes['GET /internal/streams/code_intelligence/_service_distribution'];
const reconcileRoute =
  internalKICodeFeaturesRoutes['POST /internal/streams/code_intelligence/_reconcile'];
const runRoute = internalKICodeFeaturesRoutes['POST /internal/streams/code_intelligence/_run'];
const listReposRoute =
  internalKICodeFeaturesRoutes['POST /internal/streams/code_intelligence/_list_repos'];
const identifyOtelSignalsRoute =
  internalKICodeFeaturesRoutes['POST /internal/streams/code_intelligence/_identify_otel_signals'];
const runStatusRoute =
  internalKICodeFeaturesRoutes['GET /internal/streams/code_intelligence/_run_status'];

type AvailabilityHandlerParams = Parameters<typeof availabilityRoute.handler>[0];
type ListHandlerParams = Parameters<typeof listRoute.handler>[0];
type ResetHandlerParams = Parameters<typeof resetRoute.handler>[0];
type ServiceDistributionHandlerParams = Parameters<typeof serviceDistributionRoute.handler>[0];
type ReconcileHandlerParams = Parameters<typeof reconcileRoute.handler>[0];
type RunHandlerParams = Parameters<typeof runRoute.handler>[0];
type ListReposHandlerParams = Parameters<typeof listReposRoute.handler>[0];
type IdentifyOtelHandlerParams = Parameters<typeof identifyOtelSignalsRoute.handler>[0];
type RunStatusHandlerParams = Parameters<typeof runStatusRoute.handler>[0];

const codeFeature = (streamName: string, uuid: string): Feature =>
  ({
    uuid,
    id: uuid,
    stream_name: streamName,
    type: 'code_analysis',
    subtype: 'service',
    title: uuid,
    evidence: ['code: repository@sha:path.ts:1'],
    source: ['code'],
  } as Feature);

const createMaintenanceService = () => ({
  getState: jest.fn().mockResolvedValue('enabled'),
});

describe('Code Intelligence routes', () => {
  const enabledFeatureFlags = {
    getBooleanValue: jest.fn().mockResolvedValue(true),
  };
  const defaultTraceSource = getCodePredictiveSourceId('default', 'traces');
  const defaultMetricSource = getCodePredictiveSourceId('default', 'metrics');
  const defaultLogSource = getCodePredictiveSourceId('default', 'logs');
  it('reports unavailable and rejects runs while the code extraction flag is disabled', async () => {
    const featureFlags = { getBooleanValue: jest.fn().mockResolvedValue(false) };
    const codeExtractionClient = {
      isInstalled: jest.fn().mockResolvedValue(true),
      getStatus: jest.fn().mockResolvedValue({ available: true }),
      run: jest.fn(),
    };

    await expect(
      availabilityRoute.handler({
        request: {},
        getScopedClients: jest.fn().mockResolvedValue({ licensing: {} }),
        workflowClients: { codeExtractionClient },
        server: { core: { featureFlags } },
        logger: {},
      } as unknown as AvailabilityHandlerParams)
    ).resolves.toEqual({ available: false, message: 'Code Intelligence extraction is disabled.' });

    await expect(
      runRoute.handler({
        request: {},
        getScopedClients: jest.fn().mockResolvedValue({ licensing: {} }),
        workflowClients: { codeExtractionClient },
        getSpaceId: jest.fn().mockResolvedValue('default'),
        server: { core: { featureFlags } },
        logger: {},
        maintenanceService: createMaintenanceService(),
      } as unknown as RunHandlerParams)
    ).rejects.toThrow('Code Intelligence extraction is disabled.');
    expect(codeExtractionClient.run).not.toHaveBeenCalled();
  });

  it('rejects disabled read surfaces before KI or workflow status reads', async () => {
    const featureFlags = { getBooleanValue: jest.fn().mockResolvedValue(false) };
    const getKnowledgeIndicatorClient = jest.fn();
    const getStatus = jest.fn();

    await expect(
      listRoute.handler({
        request: {},
        getScopedClients: jest
          .fn()
          .mockResolvedValue({ licensing: {}, getKnowledgeIndicatorClient }),
        getSpaceId: jest.fn().mockResolvedValue('default'),
        server: { core: { featureFlags } },
      } as unknown as ListHandlerParams)
    ).rejects.toThrow('Code Intelligence extraction is disabled.');
    await expect(
      runStatusRoute.handler({
        params: {},
        request: {},
        getScopedClients: jest.fn(),
        workflowClients: { codeExtractionClient: { getStatus } },
        getSpaceId: jest.fn(),
        server: { core: { featureFlags } },
      } as unknown as RunStatusHandlerParams)
    ).rejects.toThrow('Code Intelligence extraction is disabled.');
    expect(getKnowledgeIndicatorClient).not.toHaveBeenCalled();
    expect(getStatus).not.toHaveBeenCalled();
  });

  it('lists Code Intelligence KIs without requiring a matching Streams definition', async () => {
    const getFeatures = jest.fn().mockResolvedValue({
      hits: [codeFeature(defaultLogSource, 'one')],
    });
    const getQueryLinks = jest.fn().mockResolvedValue([]);
    const getStreamNamesWithKnowledgeIndicators = jest
      .fn()
      .mockResolvedValue([defaultLogSource, 'logs.visible']);
    const streamsClient = {
      listStreams: jest.fn().mockResolvedValue([]),
    };

    const result = await listRoute.handler({
      request: {},
      getScopedClients: jest.fn().mockResolvedValue({
        licensing: {},
        streamsClient,
        getKnowledgeIndicatorClient: jest.fn().mockResolvedValue({
          getFeatures,
          getQueryLinks,
          getStreamNamesWithKnowledgeIndicators,
        }),
      }),
      getSpaceId: jest.fn().mockResolvedValue('default'),
      server: { core: { featureFlags: enabledFeatureFlags } },
    } as unknown as ListHandlerParams);

    expect(result).toEqual({
      features: [codeFeature(defaultLogSource, 'one')],
      queries: [],
      isTruncated: false,
    });
    expect(getFeatures).toHaveBeenCalledWith(
      [defaultLogSource],
      expect.objectContaining({ includeExcluded: true })
    );
    expect(getQueryLinks).toHaveBeenCalledWith(
      [defaultLogSource],
      expect.objectContaining({ ruleUnbacked: 'include' })
    );
    expect(getStreamNamesWithKnowledgeIndicators).toHaveBeenCalled();
  });

  it('aggregates code and log service provenance across every current-space KI owner', async () => {
    const codeEntity = {
      ...codeFeature(defaultLogSource, 'checkout-code'),
      subtype: 'service',
      properties: { name: 'checkout' },
      source: ['code'],
    } as Feature;
    const matchingLogEntity = {
      ...codeFeature('logs.otel', 'checkout-log'),
      subtype: 'service',
      properties: { name: 'checkout' },
      evidence: ['observed in logs'],
      source: ['logs'],
    } as Feature;
    const logsOnlyEntity = {
      ...codeFeature('logs.ecs', 'catalog-log'),
      subtype: 'service',
      properties: { name: 'catalog' },
      evidence: ['observed in logs'],
      source: ['logs'],
    } as Feature;
    const getFeatures = jest
      .fn()
      .mockResolvedValue({ hits: [codeEntity, matchingLogEntity, logsOnlyEntity] });

    const result = await serviceDistributionRoute.handler({
      request: {},
      getScopedClients: jest.fn().mockResolvedValue({
        licensing: {},
        streamsClient: { listStreams: jest.fn().mockResolvedValue([]) },
        getKnowledgeIndicatorClient: jest.fn().mockResolvedValue({
          getStreamNamesWithKnowledgeIndicators: jest
            .fn()
            .mockResolvedValue([defaultLogSource, 'logs.otel', 'logs.ecs']),
          getFeatures,
        }),
      }),
      server: { core: { featureFlags: enabledFeatureFlags } },
    } as unknown as ServiceDistributionHandlerParams);

    expect(getFeatures).toHaveBeenCalledWith(
      [defaultLogSource, 'logs.otel', 'logs.ecs'],
      expect.anything()
    );
    expect(result).toMatchObject({ codeOnly: 0, both: 1, logsOnly: 1 });
  });

  it('limits reset work to a resumable stream batch', async () => {
    const getScopedIndicators = jest.fn().mockResolvedValue({ features: [], queries: [] });

    const result = await resetRoute.handler({
      params: { body: {} },
      request: {},
      getScopedClients: jest.fn().mockResolvedValue({
        licensing: {},
        streamsClient: {
          listStreams: jest
            .fn()
            .mockResolvedValue(
              Array.from({ length: 11 }, (_, index) => ({ name: `logs.${index}` }))
            ),
        },
        getKnowledgeIndicatorClient: jest.fn().mockResolvedValue({
          getScopedIndicators,
          getScopedStreamNamesWithKnowledgeIndicators: jest
            .fn()
            .mockResolvedValue(Array.from({ length: 11 }, (_, index) => `logs.${index}`)),
          getUnscopedLegacyStreamNamesWithKnowledgeIndicators: jest.fn().mockResolvedValue([]),
          getUnscopedLegacyIndicators: jest.fn().mockResolvedValue({ features: [], queries: [] }),
        }),
      }),
      getSpaceId: jest.fn().mockResolvedValue('default'),
      server: { core: { featureFlags: enabledFeatureFlags } },
      logger: { get: jest.fn().mockReturnValue({ info: jest.fn(), warn: jest.fn() }) },
      maintenanceService: createMaintenanceService(),
    } as unknown as ResetHandlerParams);

    expect(getScopedIndicators).toHaveBeenCalledWith(expect.arrayContaining(['logs.0']));
    expect(getScopedIndicators.mock.calls[0][0]).toHaveLength(10);
    expect(result.nextCursor).toBeDefined();
  });

  it('rejects a combined feature/query result at the reader cap before any write', async () => {
    const bulk = jest.fn();
    const deleteUnscopedLegacyIndicators = jest.fn();
    const features = Array.from({ length: 6000 }, (_, index) =>
      codeFeature(defaultLogSource, `feature-${index}`)
    );
    const queries = Array.from({ length: 4000 }, (_, index) => ({
      stream_name: defaultLogSource,
      rule_backed: false,
      rule_id: `rule-${index}`,
      query: {
        id: `query-${index}`,
        type: 'match' as const,
        title: 'predictive',
        description: 'predictive',
        esql: { query: 'FROM logs-* | WHERE true' },
        evidence: ['code: acme/repo@sha:file.ts:1'],
        source: ['code'] as const,
      },
    }));

    const resetPromise = resetRoute.handler({
      params: { body: {} },
      request: {},
      getScopedClients: jest.fn().mockResolvedValue({
        licensing: {},
        getKnowledgeIndicatorClient: jest.fn().mockResolvedValue({
          getScopedStreamNamesWithKnowledgeIndicators: jest
            .fn()
            .mockResolvedValue([defaultLogSource]),
          getUnscopedLegacyStreamNamesWithKnowledgeIndicators: jest.fn().mockResolvedValue([]),
          getScopedIndicators: jest.fn().mockResolvedValue({ features, queries }),
          getUnscopedLegacyIndicators: jest.fn().mockResolvedValue({ features: [], queries: [] }),
          deleteUnscopedLegacyIndicators,
          bulk,
        }),
      }),
      server: { core: { featureFlags: enabledFeatureFlags } },
      logger: { get: jest.fn().mockReturnValue({ info: jest.fn(), warn: jest.fn() }) },
      maintenanceService: createMaintenanceService(),
    } as unknown as ResetHandlerParams);
    await expect(resetPromise).rejects.toThrow(
      'Code Intelligence reset is unavailable because the feature result reached its maximum size.'
    );
    expect(bulk).not.toHaveBeenCalled();
    expect(deleteUnscopedLegacyIndicators).not.toHaveBeenCalled();
  });

  it('resets root and concrete pure-code legacy predictions without deleting mixed/log KIs', async () => {
    const bulk = jest.fn().mockImplementation(async (_owner: string, operations: unknown[]) => ({
      applied: operations.length,
    }));
    const legacyCodeQuery = {
      stream_name: 'logs.otel',
      rule_backed: false,
      rule_id: 'legacy-code-rule',
      query: {
        id: 'legacy-code-query',
        type: 'match',
        title: 'predictive',
        description: 'predictive',
        esql: { query: 'FROM traces-* | WHERE status.code == "Error"' },
        evidence: ['code: acme/repo@sha:service.ts:1'],
        source: ['code'],
      },
    };
    const rootCodeQuery = {
      ...legacyCodeQuery,
      stream_name: 'logs',
      query: { ...legacyCodeQuery.query, id: 'root-code-query' },
    };
    const logQuery = {
      ...legacyCodeQuery,
      query: {
        ...legacyCodeQuery.query,
        id: 'log-query',
        evidence: ['observed in logs'],
        source: ['logs'],
      },
    };
    const mixedQuery = {
      ...legacyCodeQuery,
      stream_name: 'logs',
      query: {
        ...legacyCodeQuery.query,
        id: 'mixed-query',
        evidence: ['code: acme/repo@sha:service.ts:1', 'observed in logs'],
        source: ['code', 'logs'],
      },
    };

    const deleteUnscopedLegacyIndicators = jest
      .fn()
      .mockImplementation(async (_owner: string, identities: unknown[]) => ({
        applied: identities.length,
      }));
    const result = await resetRoute.handler({
      params: { body: {} },
      request: {},
      getScopedClients: jest.fn().mockResolvedValue({
        licensing: {},
        streamsClient: { listStreams: jest.fn().mockResolvedValue([]) },
        getKnowledgeIndicatorClient: jest.fn().mockResolvedValue({
          getScopedIndicators: jest.fn().mockResolvedValue({ features: [], queries: [] }),
          getScopedStreamNamesWithKnowledgeIndicators: jest.fn().mockResolvedValue([]),
          getUnscopedLegacyStreamNamesWithKnowledgeIndicators: jest
            .fn()
            .mockResolvedValue(['logs', 'logs.otel']),
          getUnscopedLegacyIndicators: jest.fn().mockResolvedValue({
            features: [],
            queries: [legacyCodeQuery, rootCodeQuery, logQuery, mixedQuery],
          }),
          deleteUnscopedLegacyIndicators,
          bulk,
        }),
      }),
      server: { core: { featureFlags: enabledFeatureFlags } },
      logger: {
        get: jest.fn().mockReturnValue({ info: jest.fn(), warn: jest.fn() }),
      },
      maintenanceService: createMaintenanceService(),
    } as unknown as ResetHandlerParams);

    expect(result.deleted).toBe(2);
    expect(deleteUnscopedLegacyIndicators).toHaveBeenCalledWith('logs.otel', [
      { type: 'query', id: 'legacy-code-query' },
    ]);
    expect(deleteUnscopedLegacyIndicators).toHaveBeenCalledWith('logs', [
      { type: 'query', id: 'root-code-query' },
    ]);
    expect(JSON.stringify(deleteUnscopedLegacyIndicators.mock.calls)).not.toContain('log-query');
    expect(JSON.stringify(deleteUnscopedLegacyIndicators.mock.calls)).not.toContain('mixed-query');
    expect(bulk).not.toHaveBeenCalled();
  });

  it('deletes colliding deterministic query IDs through both scoped writer paths', async () => {
    const sharedId = 'deterministic-query-id';
    const currentQuery = {
      stream_name: defaultTraceSource,
      rule_backed: false,
      rule_id: 'current-rule',
      query: {
        id: sharedId,
        type: 'match',
        title: 'current',
        description: 'current',
        esql: { query: 'FROM traces-* | WHERE status.code == "Error"' },
        evidence: ['code: acme/repo@sha:current.ts:1'],
        source: ['code'],
      },
    };
    const legacyQuery = {
      ...currentQuery,
      stream_name: 'logs.otel',
      rule_id: 'legacy-rule',
    };
    const bulk = jest.fn().mockResolvedValue({ applied: 1 });
    const deleteUnscopedLegacyIndicators = jest.fn().mockResolvedValue({ applied: 1 });

    const result = await resetRoute.handler({
      params: { body: {} },
      request: {},
      getScopedClients: jest.fn().mockResolvedValue({
        licensing: {},
        getKnowledgeIndicatorClient: jest.fn().mockResolvedValue({
          getScopedIndicators: jest.fn().mockResolvedValue({
            features: [],
            queries: [currentQuery],
          }),
          getScopedStreamNamesWithKnowledgeIndicators: jest
            .fn()
            .mockResolvedValue([defaultTraceSource]),
          getUnscopedLegacyStreamNamesWithKnowledgeIndicators: jest
            .fn()
            .mockResolvedValue(['logs.otel']),
          getUnscopedLegacyIndicators: jest.fn().mockResolvedValue({
            features: [],
            queries: [legacyQuery],
          }),
          deleteUnscopedLegacyIndicators,
          bulk,
        }),
      }),
      server: { core: { featureFlags: enabledFeatureFlags } },
      logger: { get: jest.fn().mockReturnValue({ info: jest.fn(), warn: jest.fn() }) },
      maintenanceService: createMaintenanceService(),
    } as unknown as ResetHandlerParams);

    expect(result.deleted).toBe(2);
    expect(bulk).toHaveBeenCalledWith(defaultTraceSource, [
      { delete: { type: 'query', id: sharedId } },
    ]);
    expect(deleteUnscopedLegacyIndicators).toHaveBeenCalledWith('logs.otel', [
      { type: 'query', id: sharedId },
    ]);
  });

  it('reports reset batches that fail after earlier batches were deleted', async () => {
    const bulk = jest
      .fn()
      .mockResolvedValueOnce({ applied: 1 })
      .mockRejectedValueOnce(new Error('write failed'));
    const routeLogger = { info: jest.fn(), warn: jest.fn() };

    const result = await resetRoute.handler({
      request: {},
      getScopedClients: jest.fn().mockResolvedValue({
        licensing: {},
        streamsClient: {
          listStreams: jest.fn().mockResolvedValue([{ name: 'logs.one' }, { name: 'logs.two' }]),
        },
        getKnowledgeIndicatorClient: jest.fn().mockResolvedValue({
          getScopedIndicators: jest.fn().mockResolvedValue({
            features: [codeFeature('logs.one', 'one'), codeFeature('logs.two', 'two')],
            queries: [],
          }),
          getScopedStreamNamesWithKnowledgeIndicators: jest
            .fn()
            .mockResolvedValue(['logs.one', 'logs.two']),
          getUnscopedLegacyStreamNamesWithKnowledgeIndicators: jest.fn().mockResolvedValue([]),
          getUnscopedLegacyIndicators: jest.fn().mockResolvedValue({ features: [], queries: [] }),
          deleteUnscopedLegacyIndicators: jest.fn().mockResolvedValue({ applied: 0 }),
          bulk,
        }),
      }),
      getSpaceId: jest.fn().mockResolvedValue('default'),
      server: { core: { featureFlags: enabledFeatureFlags } },
      logger: { get: jest.fn().mockReturnValue(routeLogger) },
      maintenanceService: createMaintenanceService(),
    } as unknown as ResetHandlerParams);

    expect(result).toEqual({
      deleted: 1,
      streamsAffected: 1,
      failedStreams: ['logs.two'],
    });
    expect(routeLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('reset failed for stream "logs.two"')
    );
  });

  it('reconciles equivalent queries across former owner batch boundaries in one set', async () => {
    const owners = Array.from({ length: 11 }, (_, index) => `owner-${index + 1}`);
    const links = [
      {
        stream_name: owners[0],
        rule_backed: false,
        rule_id: 'rule-code',
        query: {
          id: 'code-query',
          type: 'match',
          title: 'error',
          description: 'error',
          esql: { query: 'FROM logs-* | WHERE message LIKE "*failed*"' },
          evidence: ['code: repo@sha:file.ts:1'],
        },
      },
      {
        stream_name: owners[10],
        rule_backed: false,
        rule_id: 'rule-log',
        query: {
          id: 'log-query',
          type: 'match',
          title: 'error',
          description: 'error',
          esql: { query: ' FROM logs-*   | WHERE message LIKE "*failed*" ' },
          evidence: ['observed in logs'],
        },
      },
    ];
    const getQueryLinks = jest.fn().mockResolvedValue(links);
    const bulk = jest.fn().mockResolvedValue({ applied: 1 });

    const result = await reconcileRoute.handler({
      request: {},
      getScopedClients: jest.fn().mockResolvedValue({
        licensing: {},
        getKnowledgeIndicatorClient: jest.fn().mockResolvedValue({
          getStreamNamesWithKnowledgeIndicators: jest.fn().mockResolvedValue(owners),
          getQueryLinks,
          bulk,
        }),
      }),
      server: { core: { featureFlags: enabledFeatureFlags } },
      logger: {
        get: jest.fn().mockReturnValue({ info: jest.fn(), warn: jest.fn(), debug: jest.fn() }),
      },
      maintenanceService: createMaintenanceService(),
    } as unknown as ReconcileHandlerParams);

    expect(getQueryLinks).toHaveBeenCalledWith(
      [...owners].sort(),
      expect.not.objectContaining({ includeExpired: true })
    );
    expect(result).toMatchObject({ clustersMerged: 1, queriesTombstoned: 0 });
  });

  it('rejects reconciliation above the explicit owner cap before query reads or writes', async () => {
    const getQueryLinks = jest.fn();
    const bulk = jest.fn();
    const owners = Array.from({ length: 101 }, (_, index) => `owner-${index}`);
    await expect(
      reconcileRoute.handler({
        request: {},
        getScopedClients: jest.fn().mockResolvedValue({
          licensing: {},
          getKnowledgeIndicatorClient: jest.fn().mockResolvedValue({
            getStreamNamesWithKnowledgeIndicators: jest.fn().mockResolvedValue(owners),
            getQueryLinks,
            bulk,
          }),
        }),
        server: { core: { featureFlags: enabledFeatureFlags } },
        logger: { get: jest.fn().mockReturnValue({ warn: jest.fn() }) },
        maintenanceService: createMaintenanceService(),
      } as unknown as ReconcileHandlerParams)
    ).rejects.toThrow('supports at most 100 owners');
    expect(getQueryLinks).not.toHaveBeenCalled();
    expect(bulk).not.toHaveBeenCalled();
  });

  it('resolves the code-intelligence connector and passes it to the extraction run instead of the workflow default', async () => {
    mockResolveConnectorForFeature.mockResolvedValue('.some-user-configured-connector');
    const run = jest.fn().mockResolvedValue({ executionId: 'exec-1', isNew: true });
    const codeExtractionClient = {
      isInstalled: jest.fn().mockResolvedValue(true),
      getStatus: jest.fn().mockResolvedValue({ available: true }),
      run,
    };

    const result = await runRoute.handler({
      params: {},
      request: {},
      getScopedClients: jest.fn().mockResolvedValue({ licensing: {} }),
      workflowClients: { codeExtractionClient },
      getSpaceId: jest.fn().mockResolvedValue('default'),
      server: {
        core: { featureFlags: enabledFeatureFlags },
        searchInferenceEndpoints: {},
      },
      logger: { get: jest.fn().mockReturnValue({ info: jest.fn(), warn: jest.fn() }) },
      maintenanceService: createMaintenanceService(),
    } as unknown as RunHandlerParams);

    expect(mockResolveConnectorForFeature).toHaveBeenCalledWith(
      expect.objectContaining({ featureName: 'code intelligence extraction' })
    );
    expect(run).toHaveBeenCalledWith(
      expect.objectContaining({
        spaceId: 'default',
        inputs: { agentConnectorId: '.some-user-configured-connector' },
      })
    );
    expect(result).toEqual({ executionId: 'exec-1', isNew: true });
  });

  it('passes an exact repository scope to the extraction workflow', async () => {
    mockResolveConnectorForFeature.mockResolvedValue('.some-user-configured-connector');
    const run = jest.fn().mockResolvedValue({ executionId: 'exec-1', isNew: true });

    await runRoute.handler({
      params: { body: { repository: 'elastic/eis-gateway' } },
      request: {},
      getScopedClients: jest.fn().mockResolvedValue({ licensing: {} }),
      workflowClients: {
        codeExtractionClient: {
          isInstalled: jest.fn().mockResolvedValue(true),
          getStatus: jest.fn().mockResolvedValue({ available: true }),
          run,
        },
      },
      getSpaceId: jest.fn().mockResolvedValue('default'),
      server: {
        core: { featureFlags: enabledFeatureFlags },
        searchInferenceEndpoints: {},
      },
      logger: { get: jest.fn().mockReturnValue({ info: jest.fn(), warn: jest.fn() }) },
      maintenanceService: createMaintenanceService(),
    } as unknown as RunHandlerParams);

    expect(run).toHaveBeenCalledWith(
      expect.objectContaining({
        inputs: {
          agentConnectorId: '.some-user-configured-connector',
          repository: 'elastic/eis-gateway',
        },
      })
    );
  });

  it('returns conflict when another repository scope is already running', async () => {
    mockResolveConnectorForFeature.mockResolvedValue('.some-user-configured-connector');
    const run = jest
      .fn()
      .mockRejectedValue(
        new CodeExtractionScopeConflictError(
          'Code Intelligence extraction is already running for all repositories.'
        )
      );

    await expect(
      runRoute.handler({
        params: { body: { repository: 'elastic/eis-gateway' } },
        request: {},
        getScopedClients: jest.fn().mockResolvedValue({ licensing: {} }),
        workflowClients: {
          codeExtractionClient: {
            isInstalled: jest.fn().mockResolvedValue(true),
            getStatus: jest.fn().mockResolvedValue({ available: true }),
            run,
          },
        },
        getSpaceId: jest.fn().mockResolvedValue('default'),
        server: {
          core: { featureFlags: enabledFeatureFlags },
          searchInferenceEndpoints: {},
        },
        logger: { get: jest.fn().mockReturnValue({ info: jest.fn(), warn: jest.fn() }) },
        maintenanceService: createMaintenanceService(),
      } as unknown as RunHandlerParams)
    ).rejects.toMatchObject({ output: { statusCode: 409 } });
  });

  it('filters the workflow repository list to an exact repository', async () => {
    mockCodeboxListRepos.mockResolvedValueOnce([
      { name: 'elastic/eis-gateway', status: 'ready' },
      { name: 'elastic/kibana', status: 'ready' },
    ]);
    mockCodeboxResolveHead
      .mockResolvedValueOnce('eis-gateway-sha')
      .mockResolvedValueOnce('kibana-sha');

    const result = await listReposRoute.handler({
      params: { body: { repository: 'elastic/eis-gateway' } },
      request: {},
      getScopedClients: jest.fn().mockResolvedValue({ licensing: {} }),
      server: { core: { featureFlags: enabledFeatureFlags }, actions: {} },
      logger: { get: jest.fn().mockReturnValue({ warn: jest.fn() }) },
      maintenanceService: createMaintenanceService(),
    } as unknown as ListReposHandlerParams);

    expect(result.repos).toEqual([
      {
        repository: 'elastic/eis-gateway',
        org: 'elastic',
        repo: 'eis-gateway',
        gitSha: 'eis-gateway-sha',
        ref: 'HEAD',
      },
    ]);
  });

  it('validates optional repository run scope', () => {
    expect(runRoute.params.parse({})).toEqual({});
    expect(runRoute.params.parse({ body: { repository: 'elastic/eis-gateway' } })).toEqual({
      body: { repository: 'elastic/eis-gateway' },
    });
    expect(() => runRoute.params.parse({ body: { repository: '' } })).toThrow();
  });

  it('preserves the small run-status response unless details are requested', async () => {
    const getStatus = jest.fn().mockResolvedValue({
      status: 'in_progress',
      executionId: 'exec-1',
    });
    const result = await runStatusRoute.handler({
      params: { query: { executionId: 'exec-1' } },
      request: {},
      getScopedClients: jest.fn().mockResolvedValue({ licensing: {} }),
      workflowClients: { codeExtractionClient: { getStatus } },
      getSpaceId: jest.fn().mockResolvedValue('default'),
      server: { core: { featureFlags: enabledFeatureFlags } },
    } as unknown as RunStatusHandlerParams);

    expect(result).toEqual({ status: 'in_progress', executionId: 'exec-1' });
    expect(getStatus).toHaveBeenCalledWith({
      spaceId: 'default',
      executionId: 'exec-1',
      details: undefined,
    });
  });

  it('parses the details query string as a boolean', () => {
    expect(runStatusRoute.params.parse({ query: { details: 'true' } }).query?.details).toBe(true);
    expect(runStatusRoute.params.parse({ query: { details: 'false' } }).query?.details).toBe(false);
  });

  it('requests detailed run status only when details=true', async () => {
    const getStatus = jest
      .fn()
      .mockResolvedValue({ status: 'in_progress', executionId: 'exec-1', details: {} });
    await runStatusRoute.handler({
      params: { query: { details: true } },
      request: {},
      getScopedClients: jest.fn().mockResolvedValue({ licensing: {} }),
      workflowClients: { codeExtractionClient: { getStatus } },
      getSpaceId: jest.fn().mockResolvedValue('default'),
      server: { core: { featureFlags: enabledFeatureFlags } },
    } as unknown as RunStatusHandlerParams);

    expect(getStatus).toHaveBeenCalledWith({
      spaceId: 'default',
      executionId: undefined,
      details: true,
    });
  });

  it('does not fall back to message-string queries after a typed write fails', async () => {
    const typedCandidate = {
      stream: defaultTraceSource,
      query: {
        id: 'typed-query',
        type: 'stats',
        severity_score: 60,
        esql: { query: 'FROM traces-* | STATS c = COUNT(*)' },
      },
    };
    mockExtractOtelSignalsResult.mockResolvedValue({ signals: [], failed: false });
    mockGenerateOtelQueries.mockReturnValue({ gateBypassed: false, queries: [typedCandidate] });
    mockClassifyOtelSignals.mockResolvedValue([typedCandidate]);
    mockResolveConnectorForFeature.mockResolvedValue('connector');

    await expect(
      identifyOtelSignalsRoute.handler({
        params: {
          body: {
            repository: 'repository',
            gitSha: 'sha',
            serviceRoot: 'service',
            name: 'service',
            language: 'typescript',
            hasOtel: true,
            signalCounts: {
              instrumentation_grpc: 0,
              instrumentation_http: 0,
              instrumentation_other: 0,
              start_span: 0,
              set_attribute: 0,
              add_event: 0,
              record_exception: 0,
              set_status_error: 0,
              create_metric: 0,
            },
          },
        },
        request: {},
        getSpaceId: jest.fn().mockResolvedValue('default'),
        getScopedClients: jest.fn().mockResolvedValue({
          licensing: {},
          inferenceClient: {},
          scopedClusterClient: { asCurrentUser: {} },
          streamsClient: { listStreams: jest.fn().mockResolvedValue([]) },
          getKnowledgeIndicatorClient: jest.fn().mockResolvedValue({
            getStreamToQueryLinksMap: jest.fn().mockResolvedValue({ [defaultTraceSource]: [] }),
            bulk: jest.fn().mockRejectedValue(new Error('write failed')),
          }),
        }),
        server: { core: { featureFlags: enabledFeatureFlags } },
        logger: { get: jest.fn().mockReturnValue({ warn: jest.fn(), debug: jest.fn() }) },
        maintenanceService: createMaintenanceService(),
      } as unknown as IdentifyOtelHandlerParams)
    ).rejects.toThrow('write failed');

    expect(mockDiscoverLoggingSites).not.toHaveBeenCalled();
  });

  it('generates predictive typed OTel queries when no typed streams exist yet', async () => {
    const typedCandidate = {
      stream: defaultTraceSource,
      query: {
        id: 'typed-query',
        type: 'stats',
        severity_score: 60,
        esql: { query: 'FROM traces-* | STATS c = COUNT(*)' },
      },
    };
    mockExtractOtelSignalsResult.mockResolvedValue({
      signals: [{ kind: 'span_name', value: 'checkout', file: 'src/app.ts', line: 1 }],
      failed: false,
    });
    mockGenerateOtelQueries.mockReturnValue({ gateBypassed: false, queries: [typedCandidate] });
    mockClassifyOtelSignals.mockResolvedValue([typedCandidate]);
    mockResolveConnectorForFeature.mockResolvedValue('connector');
    const bulk = jest.fn().mockResolvedValue(undefined);
    const getStreamToQueryLinksMap = jest.fn().mockResolvedValue({ [defaultTraceSource]: [] });

    await expect(
      identifyOtelSignalsRoute.handler({
        params: {
          body: {
            repository: 'repository',
            gitSha: 'sha',
            serviceRoot: 'service',
            name: 'service',
            language: 'typescript',
            hasOtel: true,
            signalCounts: {
              instrumentation_grpc: 0,
              instrumentation_http: 0,
              instrumentation_other: 0,
              start_span: 1,
              set_attribute: 0,
              add_event: 0,
              record_exception: 0,
              set_status_error: 0,
              create_metric: 0,
            },
          },
        },
        request: {},
        getSpaceId: jest.fn().mockResolvedValue('default'),
        getScopedClients: jest.fn().mockResolvedValue({
          licensing: {},
          inferenceClient: {},
          streamDataEsClient: {},
          streamsClient: { listStreams: jest.fn().mockResolvedValue([{ name: 'logs' }]) },
          getKnowledgeIndicatorClient: jest.fn().mockResolvedValue({
            getStreamToQueryLinksMap,
            bulk,
          }),
        }),
        server: { core: { featureFlags: enabledFeatureFlags } },
        logger: {
          get: jest.fn().mockReturnValue({ info: jest.fn(), warn: jest.fn(), debug: jest.fn() }),
        },
        maintenanceService: createMaintenanceService(),
      } as unknown as IdentifyOtelHandlerParams)
    ).resolves.toEqual({ status: 'generated', queriesGenerated: 1, otelSignalsFound: 1 });

    expect(mockGenerateOtelQueries).toHaveBeenCalledWith(
      expect.objectContaining({
        traceStreams: ['traces-*'],
        metricStreams: ['metrics-*'],
        logStreams: ['logs-*'],
        traceStreamNames: [defaultTraceSource],
        metricStreamNames: [defaultMetricSource],
        logStreamNames: [defaultLogSource],
      })
    );
    expect(mockDiscoverLoggingSites).not.toHaveBeenCalled();
    expect(bulk).toHaveBeenCalledWith(defaultTraceSource, expect.any(Array));
  });

  it.each([
    [59, 1, true],
    [undefined, 0, false],
  ] as const)(
    'persists OTel classifier output at every defined severity (%s)',
    async (severityScore, queriesGenerated, shouldBulk) => {
      const typedCandidate = {
        stream: defaultTraceSource,
        query: {
          id: 'typed-query',
          type: 'stats',
          severity_score: severityScore,
          esql: { query: 'FROM traces-* | STATS c = COUNT(*)' },
        },
      };
      mockExtractOtelSignalsResult.mockResolvedValue({
        signals: [{ kind: 'span_name', value: 'checkout', file: 'src/app.ts', line: 1 }],
        failed: false,
      });
      mockGenerateOtelQueries.mockReturnValue({ gateBypassed: false, queries: [typedCandidate] });
      mockClassifyOtelSignals.mockResolvedValue([typedCandidate]);
      mockResolveConnectorForFeature.mockResolvedValue('connector');
      const bulk = jest.fn().mockResolvedValue(undefined);

      await expect(
        identifyOtelSignalsRoute.handler({
          params: {
            body: {
              repository: 'repository',
              gitSha: 'sha',
              serviceRoot: 'service',
              name: 'service',
              language: 'typescript',
              hasOtel: true,
              signalCounts: {
                instrumentation_grpc: 0,
                instrumentation_http: 0,
                instrumentation_other: 0,
                start_span: 1,
                set_attribute: 0,
                add_event: 0,
                record_exception: 0,
                set_status_error: 0,
                create_metric: 0,
              },
            },
          },
          request: {},
          getSpaceId: jest.fn().mockResolvedValue('default'),
          getScopedClients: jest.fn().mockResolvedValue({
            licensing: {},
            inferenceClient: {},
            streamDataEsClient: {},
            streamsClient: { listStreams: jest.fn().mockResolvedValue([]) },
            getKnowledgeIndicatorClient: jest.fn().mockResolvedValue({
              bulk,
              getStreamToQueryLinksMap: jest.fn().mockResolvedValue({ [defaultTraceSource]: [] }),
            }),
          }),
          server: { core: { featureFlags: enabledFeatureFlags } },
          logger: {
            get: jest.fn().mockReturnValue({ info: jest.fn(), warn: jest.fn(), debug: jest.fn() }),
          },
          maintenanceService: createMaintenanceService(),
        } as unknown as IdentifyOtelHandlerParams)
      ).resolves.toEqual({ status: 'generated', queriesGenerated, otelSignalsFound: 1 });

      if (shouldBulk) {
        expect(bulk).toHaveBeenCalledWith(defaultTraceSource, expect.any(Array));
      } else {
        expect(bulk).not.toHaveBeenCalled();
      }
    }
  );

  it('returns a successful no-op when an instrumented service has no actionable OTel signals', async () => {
    mockExtractOtelSignalsResult.mockResolvedValue({ signals: [], failed: false });
    mockGenerateOtelQueries.mockReturnValue({ gateBypassed: true, queries: [] });

    await expect(
      identifyOtelSignalsRoute.handler({
        params: {
          body: {
            repository: 'repository',
            gitSha: 'sha',
            serviceRoot: 'service',
            name: 'service',
            language: 'typescript',
            hasOtel: true,
            signalCounts: {
              instrumentation_grpc: 0,
              instrumentation_http: 0,
              instrumentation_other: 1,
              start_span: 0,
              set_attribute: 0,
              add_event: 0,
              record_exception: 0,
              set_status_error: 0,
              create_metric: 0,
            },
          },
        },
        request: {},
        getSpaceId: jest.fn().mockResolvedValue('default'),
        getScopedClients: jest.fn().mockResolvedValue({
          licensing: {},
          inferenceClient: {},
          streamDataEsClient: {},
          streamsClient: { listStreams: jest.fn().mockResolvedValue([]) },
          getKnowledgeIndicatorClient: jest.fn().mockResolvedValue({}),
        }),
        server: { core: { featureFlags: enabledFeatureFlags } },
        logger: {
          get: jest.fn().mockReturnValue({ info: jest.fn(), warn: jest.fn(), debug: jest.fn() }),
        },
        maintenanceService: createMaintenanceService(),
      } as unknown as IdentifyOtelHandlerParams)
    ).resolves.toEqual({ status: 'noop', queriesGenerated: 0, otelSignalsFound: 0 });

    expect(mockDiscoverLoggingSites).not.toHaveBeenCalled();
  });

  it('uses the template fallback after typed source extraction fails', async () => {
    const sourceEsClient = { source: true };
    const streamDataEsClient = { streamData: true };
    mockExtractOtelSignalsResult.mockResolvedValue({ signals: [], failed: true });
    mockDiscoverLoggingSites.mockResolvedValue([]);
    mockClassifyLoggingSites.mockResolvedValue([]);
    mockIdentifyCodeQueries.mockResolvedValue({ generatedCount: 1 });
    mockResolveConnectorForFeature.mockResolvedValue('connector');

    await expect(
      identifyOtelSignalsRoute.handler({
        params: {
          body: {
            repository: 'repository',
            gitSha: 'sha',
            serviceRoot: 'service',
            name: 'service',
            language: 'typescript',
            hasOtel: true,
            signalCounts: {
              instrumentation_grpc: 0,
              instrumentation_http: 0,
              instrumentation_other: 0,
              start_span: 0,
              set_attribute: 0,
              add_event: 0,
              record_exception: 0,
              set_status_error: 0,
              create_metric: 0,
            },
          },
        },
        request: {},
        getScopedClients: jest.fn().mockResolvedValue({
          licensing: {},
          inferenceClient: {},
          scopedClusterClient: { asCurrentUser: sourceEsClient },
          streamDataEsClient,
          streamsClient: { listStreams: jest.fn().mockResolvedValue([]) },
          getKnowledgeIndicatorClient: jest.fn().mockResolvedValue({}),
        }),
        getSpaceId: jest.fn().mockResolvedValue('default'),
        server: { core: { featureFlags: enabledFeatureFlags } },
        logger: { get: jest.fn().mockReturnValue({ warn: jest.fn(), debug: jest.fn() }) },
        maintenanceService: createMaintenanceService(),
      } as unknown as IdentifyOtelHandlerParams)
    ).resolves.toEqual({ status: 'gate_bypassed', queriesGenerated: 1, otelSignalsFound: 0 });

    expect(mockExtractOtelSignalsResult).toHaveBeenCalledWith(
      expect.objectContaining({ repository: 'repository' })
    );
    expect(mockIdentifyCodeQueries).toHaveBeenCalledWith(
      expect.objectContaining({ esClient: streamDataEsClient, otelGateBypassed: true })
    );
    expect(mockDiscoverLoggingSites).toHaveBeenCalledWith(
      expect.objectContaining({ repository: 'repository' })
    );
  });

  it('bounds OTel workflow input strings before they reach source-code queries', () => {
    const body = {
      repository: 'repository',
      gitSha: 'sha',
      serviceRoot: 'service',
      name: 'service',
      language: 'typescript',
      hasOtel: true,
      signalCounts: {
        instrumentation_grpc: 0,
        instrumentation_http: 0,
        instrumentation_other: 0,
        start_span: 0,
        set_attribute: 0,
        add_event: 0,
        record_exception: 0,
        set_status_error: 0,
        create_metric: 0,
      },
    };

    expect(identifyOtelSignalsRoute.params.safeParse({ body }).success).toBe(true);
    expect(
      identifyOtelSignalsRoute.params.safeParse({
        body: { ...body, repository: 'x'.repeat(MAX_ID_LENGTH + 1) },
      }).success
    ).toBe(false);
    expect(
      identifyOtelSignalsRoute.params.safeParse({ body: { ...body, gitRefKey: 'repo@main' } })
        .success
    ).toBe(true);
  });
});
