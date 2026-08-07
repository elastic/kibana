/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_ID_LENGTH, type Feature } from '@kbn/significant-events-schema';
import { getCodeFeatureStreamPrefix } from '../../../../lib/knowledge_indicators/code_intelligence';
import { internalKICodeFeaturesRoutes } from './route';

const mockClassifyOtelSignals = jest.fn();
const mockDiscoverLoggingSites = jest.fn();
const mockExtractOtelSignalsResult = jest.fn();
const mockGenerateOtelQueries = jest.fn();
const mockResolveSignalStreams = jest.fn();
const mockResolveConnectorForFeature = jest.fn();

jest.mock('../../../utils/assert_significant_events_access', () => ({
  assertSignificantEventsAccess: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../../utils/resolve_connector_for_feature', () => ({
  resolveConnectorForFeature: (...args: unknown[]) => mockResolveConnectorForFeature(...args),
}));
jest.mock('../../../../lib/knowledge_indicators/code_intelligence', () => ({
  ...jest.requireActual('../../../../lib/knowledge_indicators/code_intelligence'),
  classifyOtelSignals: (...args: unknown[]) => mockClassifyOtelSignals(...args),
  discoverLoggingSites: (...args: unknown[]) => mockDiscoverLoggingSites(...args),
  extractOtelSignalsResult: (...args: unknown[]) => mockExtractOtelSignalsResult(...args),
  generateOtelQueries: (...args: unknown[]) => mockGenerateOtelQueries(...args),
  resolveSignalStreams: (...args: unknown[]) => mockResolveSignalStreams(...args),
}));

const listRoute =
  internalKICodeFeaturesRoutes['GET /internal/streams/code_intelligence/_knowledge_indicators'];
const resetRoute = internalKICodeFeaturesRoutes['POST /internal/streams/code_intelligence/_reset'];
const identifyOtelSignalsRoute =
  internalKICodeFeaturesRoutes['POST /internal/streams/code_intelligence/_identify_otel_signals'];

type ListHandlerParams = Parameters<typeof listRoute.handler>[0];
type ResetHandlerParams = Parameters<typeof resetRoute.handler>[0];
type IdentifyOtelHandlerParams = Parameters<typeof identifyOtelSignalsRoute.handler>[0];

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
  it('lists only streams visible to the request', async () => {
    const getFeatures = jest.fn().mockResolvedValue({ hits: [codeFeature('logs.visible', 'one')] });
    const getQueryLinks = jest.fn().mockResolvedValue([]);
    const getStreamNamesWithKnowledgeIndicators = jest.fn().mockResolvedValue([]);
    const streamsClient = {
      listStreams: jest.fn().mockResolvedValue([{ name: 'logs.visible' }]),
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
      server: {},
    } as unknown as ListHandlerParams);

    expect(result).toEqual({
      features: [codeFeature('logs.visible', 'one')],
      queries: [],
      isTruncated: false,
    });
    expect(getFeatures).toHaveBeenCalledWith(
      ['logs.visible'],
      expect.objectContaining({ includeExcluded: true })
    );
    expect(getQueryLinks).toHaveBeenCalledWith(
      ['logs.visible'],
      expect.objectContaining({ ruleUnbacked: 'include' })
    );
    expect(getStreamNamesWithKnowledgeIndicators).toHaveBeenCalled();
  });

  it('includes only code feature pseudo-streams owned by the active space', async () => {
    const ownedPseudoStream = `${getCodeFeatureStreamPrefix('default')}:repository:owned`;
    const foreignPseudoStream = `${getCodeFeatureStreamPrefix('other')}:repository:foreign`;
    const getFeatures = jest
      .fn()
      .mockResolvedValue({ hits: [codeFeature(ownedPseudoStream, 'one')] });

    await listRoute.handler({
      request: {},
      getScopedClients: jest.fn().mockResolvedValue({
        licensing: {},
        streamsClient: { listStreams: jest.fn().mockResolvedValue([{ name: 'logs.visible' }]) },
        getKnowledgeIndicatorClient: jest.fn().mockResolvedValue({
          getFeatures,
          getQueryLinks: jest.fn().mockResolvedValue([]),
          getStreamNamesWithKnowledgeIndicators: jest
            .fn()
            .mockResolvedValue([ownedPseudoStream, foreignPseudoStream]),
        }),
      }),
      getSpaceId: jest.fn().mockResolvedValue('default'),
      server: {},
    } as unknown as ListHandlerParams);

    expect(getFeatures).toHaveBeenCalledWith(
      ['logs.visible', ownedPseudoStream],
      expect.anything()
    );
  });

  it('limits reset work to a resumable stream batch', async () => {
    const getFeatures = jest.fn().mockResolvedValue({ hits: [] });

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
          getFeatures,
          getStreamNamesWithKnowledgeIndicators: jest.fn().mockResolvedValue([]),
        }),
      }),
      getSpaceId: jest.fn().mockResolvedValue('default'),
      server: {},
      logger: { get: jest.fn().mockReturnValue({ info: jest.fn(), warn: jest.fn() }) },
      maintenanceService: createMaintenanceService(),
    } as unknown as ResetHandlerParams);

    expect(getFeatures).toHaveBeenCalledWith(
      expect.arrayContaining(['logs.0']),
      expect.objectContaining({ includeExcluded: true })
    );
    expect(getFeatures.mock.calls[0][0]).toHaveLength(10);
    expect(result.nextCursor).toBeDefined();
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
          getFeatures: jest.fn().mockResolvedValue({
            hits: [codeFeature('logs.one', 'one'), codeFeature('logs.two', 'two')],
          }),
          getStreamNamesWithKnowledgeIndicators: jest.fn().mockResolvedValue([]),
          bulk,
        }),
      }),
      getSpaceId: jest.fn().mockResolvedValue('default'),
      server: {},
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

  it('does not fall back to message-string queries after a typed write fails', async () => {
    const typedCandidate = {
      stream: 'traces.visible',
      query: { id: 'typed-query', esql: { query: 'FROM traces.visible | STATS c = COUNT(*)' } },
    };
    mockExtractOtelSignalsResult.mockResolvedValue({ signals: [], failed: false });
    mockResolveSignalStreams.mockResolvedValue({
      traceStreams: ['traces.visible'],
      metricStreams: [],
      logStreams: [],
    });
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
        getScopedClients: jest.fn().mockResolvedValue({
          licensing: {},
          inferenceClient: {},
          scopedClusterClient: { asCurrentUser: {} },
          streamsClient: { listStreams: jest.fn().mockResolvedValue([]) },
          getKnowledgeIndicatorClient: jest.fn().mockResolvedValue({
            getStreamToQueryLinksMap: jest.fn().mockResolvedValue({ 'traces.visible': [] }),
            bulk: jest.fn().mockRejectedValue(new Error('write failed')),
          }),
        }),
        server: {},
        logger: { get: jest.fn().mockReturnValue({ warn: jest.fn(), debug: jest.fn() }) },
        maintenanceService: createMaintenanceService(),
      } as unknown as IdentifyOtelHandlerParams)
    ).rejects.toThrow('write failed');

    expect(mockDiscoverLoggingSites).not.toHaveBeenCalled();
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
  });
});
