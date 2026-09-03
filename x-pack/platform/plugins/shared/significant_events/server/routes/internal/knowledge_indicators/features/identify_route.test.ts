/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SIGNIFICANT_EVENTS_KI_EXTRACTION_INFERENCE_FEATURE_ID,
  SIGNIFICANT_EVENTS_INFERENCE_PARENT_FEATURE_ID,
} from '@kbn/significant-events-schema';
import type { SignificantEventsMaintenanceState } from '../../../../../common/maintenance/state_machine';
import {
  MAX_INFERENCE_DOCUMENT_BYTES,
  MAX_INFERENCE_DOCUMENT_FIELDS,
  MAX_INFERENCE_FIELD_NAME_LENGTH,
} from '../../../../lib/significant_events/features';
import { assertSignificantEventsAccess } from '../../../utils/assert_significant_events_access';
import { internalIdentifyKIFeaturesRoutes } from './identify_route';

jest.mock('../../../utils/assert_significant_events_access', () => ({
  assertSignificantEventsAccess: jest.fn().mockResolvedValue(undefined),
}));

const mockGetStreamSamplingSource = jest.fn();
const mockGetStreamTypeFromDefinition = jest.fn();
const mockIdentifyInferredFeatures = jest.fn();
const mockIdentifyComputedFeatures = jest.fn();
const mockShouldIdentifyFeatures = jest.fn();

jest.mock('@kbn/streams-schema', () => ({
  getStreamSamplingSource: (...args: unknown[]) => mockGetStreamSamplingSource(...args),
  getStreamTypeFromDefinition: (...args: unknown[]) => mockGetStreamTypeFromDefinition(...args),
}));

jest.mock('../../../../lib/significant_events/features', () => ({
  MS_PER_DAY: 86_400_000,
  MAX_INFERENCE_DOCUMENTS_BYTES: 288 * 1024,
  MAX_INFERENCE_DOCUMENT_BYTES: 32 * 1024,
  MAX_INFERENCE_DOCUMENT_FIELDS: 100,
  MAX_INFERENCE_FIELD_NAME_LENGTH: 1024,
  buildTelemetry: jest.fn(),
  prepareInferredSampling: jest.fn(),
  identifyInferredFeatures: (...args: unknown[]) => mockIdentifyInferredFeatures(...args),
  identifyComputedFeatures: (...args: unknown[]) => mockIdentifyComputedFeatures(...args),
}));

jest.mock('../../../../lib/significant_events/features/should_identify_features', () => ({
  shouldIdentifyFeatures: (...args: unknown[]) => mockShouldIdentifyFeatures(...args),
}));

jest.mock(
  '../../../../lib/semantic_code_search_grounding/is_significant_events_semantic_code_search_grounding_enabled',
  () => ({
    isSignificantEventsSemanticCodeSearchGroundingEnabled: jest.fn().mockResolvedValue(false),
  })
);

const prepareRoute =
  internalIdentifyKIFeaturesRoutes[
    'POST /internal/streams/{streamName}/features/_identify/inferred/prepare'
  ];
const inferredRoute =
  internalIdentifyKIFeaturesRoutes[
    'POST /internal/streams/{streamName}/features/_identify/inferred'
  ];
const computedRoute =
  internalIdentifyKIFeaturesRoutes[
    'POST /internal/streams/{streamName}/features/_identify/computed'
  ];
const shouldIdentifyRoute =
  internalIdentifyKIFeaturesRoutes['GET /internal/streams/{streamName}/features/_should_identify'];

type InferredHandlerParams = Parameters<typeof inferredRoute.handler>[0];
type ComputedHandlerParams = Parameters<typeof computedRoute.handler>[0];
type ShouldIdentifyHandlerParams = Parameters<typeof shouldIdentifyRoute.handler>[0];

const createInferredParams = (
  documents: Array<{ _id: string; fields: Record<string, unknown> }>
) => ({
  path: { streamName: 'logs.test' },
  body: {
    documents,
    samplingTelemetry: {
      totalFilters: 0,
      filtersCapped: false,
      hasFilteredDocuments: false,
    },
  },
});

const makeMaintenanceService = (state: SignificantEventsMaintenanceState = 'enabled') => ({
  getState: jest.fn().mockResolvedValue(state),
});

const makeRequest = () => ({
  events: {
    aborted$: {
      subscribe: jest.fn(),
    },
  },
});

const makeRouteLogger = () => ({
  error: jest.fn(),
  warn: jest.fn(),
});

const makeInferredHandlerParams = ({
  ensureEnabled = jest.fn().mockResolvedValue(undefined),
}: {
  ensureEnabled?: jest.Mock;
} = {}) => {
  const request = makeRequest();
  const routeLogger = makeRouteLogger();
  const stream = { name: 'logs.test' };
  const kiClient = {};
  const boundInferenceClient = {};
  const bindTo = jest.fn().mockReturnValue(boundInferenceClient);
  const server = {
    searchInferenceEndpoints: {},
    agentBuilder: undefined,
  };
  const licensing = {};
  const maintenanceService = makeMaintenanceService();
  const telemetry = { trackFeaturesIdentified: jest.fn() };
  const identifyResult = { features: [], documentsSampled: 10 };

  mockGetStreamTypeFromDefinition.mockReturnValue('logs');
  mockIdentifyInferredFeatures.mockResolvedValue(identifyResult);

  const handlerParams = {
    params: {
      path: { streamName: 'logs.test' },
      body: {
        connectorId: 'connector-1',
        runId: 'run-1',
        iteration: 2,
        documents: [{ _id: 'document-1', fields: { message: 'test message' } }],
        samplingTelemetry: {
          totalFilters: 3,
          filtersCapped: false,
          hasFilteredDocuments: true,
        },
        maxExcludedFeaturesInPrompt: 5,
        maxPreviouslyIdentifiedFeatures: 6,
      },
    },
    request,
    getScopedClients: jest.fn().mockResolvedValue({
      scopedClusterClient: { asCurrentUser: {} },
      streamDataEsClient: {},
      streamsClient: { getStream: jest.fn().mockResolvedValue(stream) },
      inferenceClient: { bindTo },
      soClient: {},
      tuningConfig: {},
      licensing,
      getKnowledgeIndicatorClient: jest.fn().mockResolvedValue(kiClient),
    }),
    server,
    logger: { get: jest.fn().mockReturnValue(routeLogger) },
    telemetry,
    syncWorkflowService: { ensureEnabled },
    maintenanceService,
  } as unknown as InferredHandlerParams;

  return {
    handlerParams,
    request,
    routeLogger,
    stream,
    kiClient,
    boundInferenceClient,
    bindTo,
    server,
    licensing,
    maintenanceService,
    telemetry,
    identifyResult,
    ensureEnabled,
  };
};

const makeComputedHandlerParams = () => {
  const request = makeRequest();
  const routeLogger = makeRouteLogger();
  const stream = { name: 'logs.test' };
  const kiClient = {};
  const streamDataEsClient = {};
  const server = { agentBuilder: undefined };
  const licensing = {};
  const maintenanceService = makeMaintenanceService();
  const identifyResult = {
    features: [{ id: 'document-count' }],
    errors: [{ featureType: 'service-name', error: 'field unavailable' }],
  };

  mockIdentifyComputedFeatures.mockResolvedValue(identifyResult);

  const handlerParams = {
    params: {
      path: { streamName: 'logs.test' },
      body: {
        start: 100,
        end: 200,
        runId: 'run-1',
        computedFeaturesTimeoutMs: 7_000,
      },
    },
    request,
    getScopedClients: jest.fn().mockResolvedValue({
      streamDataEsClient,
      streamsClient: { getStream: jest.fn().mockResolvedValue(stream) },
      tuningConfig: {},
      licensing,
      getKnowledgeIndicatorClient: jest.fn().mockResolvedValue(kiClient),
    }),
    server,
    logger: { get: jest.fn().mockReturnValue(routeLogger) },
    telemetry: {},
    maintenanceService,
  } as unknown as ComputedHandlerParams;

  return {
    handlerParams,
    request,
    routeLogger,
    stream,
    kiClient,
    streamDataEsClient,
    server,
    licensing,
    maintenanceService,
    identifyResult,
  };
};

describe('feature identification route schemas', () => {
  it('bounds ratios and timeouts', () => {
    const prepareParams = {
      path: { streamName: 'logs.test' },
      body: {
        entityFilteredRatio: 0,
        diverseRatio: 1,
        samplingTimeoutMs: 1_000,
      },
    };

    expect(prepareRoute.params.safeParse(prepareParams).success).toBe(true);
    expect(
      prepareRoute.params.safeParse({
        ...prepareParams,
        body: { ...prepareParams.body, entityFilteredRatio: -0.1 },
      }).success
    ).toBe(false);
    expect(
      prepareRoute.params.safeParse({
        ...prepareParams,
        body: { ...prepareParams.body, diverseRatio: 1.1 },
      }).success
    ).toBe(false);
    expect(
      prepareRoute.params.safeParse({
        ...prepareParams,
        body: { ...prepareParams.body, samplingTimeoutMs: 999 },
      }).success
    ).toBe(false);
    expect(
      computedRoute.params.safeParse({
        path: { streamName: 'logs.test' },
        body: { computedFeaturesTimeoutMs: 240_001 },
      }).success
    ).toBe(false);
  });

  it('enforces the compact inference document contract', () => {
    expect(
      inferredRoute.params.safeParse(
        createInferredParams([{ _id: '1', fields: { message: 'ok' } }])
      ).success
    ).toBe(true);
    expect(inferredRoute.params.safeParse(createInferredParams([])).success).toBe(false);
    expect(
      inferredRoute.params.safeParse(
        createInferredParams([
          {
            _id: '1',
            fields: Object.fromEntries(
              Array.from({ length: MAX_INFERENCE_DOCUMENT_FIELDS + 1 }, (_, index) => [
                `field-${index}`,
                'value',
              ])
            ),
          },
        ])
      ).success
    ).toBe(false);
    expect(
      inferredRoute.params.safeParse(
        createInferredParams([
          {
            _id: '1',
            fields: { ['x'.repeat(MAX_INFERENCE_FIELD_NAME_LENGTH + 1)]: 'value' },
          },
        ])
      ).success
    ).toBe(false);
    expect(
      inferredRoute.params.safeParse(
        createInferredParams([
          { _id: '1', fields: { message: 'x'.repeat(MAX_INFERENCE_DOCUMENT_BYTES) } },
        ])
      ).success
    ).toBe(false);
    expect(
      inferredRoute.params.safeParse(
        createInferredParams(
          Array.from({ length: 30 }, (_, index) => ({
            _id: `${index}`,
            fields: { message: 'x'.repeat(30_000) },
          }))
        )
      ).success
    ).toBe(false);
  });
});

describe('inferred feature identification route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects _identify/inferred with 409 while paused before touching inference', async () => {
    const bindTo = jest.fn();
    const getKnowledgeIndicatorClient = jest.fn();
    const handlerParams = {
      params: { path: { streamName: 'logs.test' }, body: null },
      request: {},
      getScopedClients: jest.fn().mockResolvedValue({
        licensing: {},
        inferenceClient: { bindTo },
        getKnowledgeIndicatorClient,
      }),
      server: {},
      maintenanceService: makeMaintenanceService('paused'),
    } as unknown as InferredHandlerParams;

    await expect(inferredRoute.handler(handlerParams)).rejects.toMatchObject({
      output: { statusCode: 409 },
    });
    expect(bindTo).not.toHaveBeenCalled();
    expect(getKnowledgeIndicatorClient).not.toHaveBeenCalled();
  });

  it('identifies inferred features and bootstraps the sync workflow while enabled', async () => {
    const {
      handlerParams,
      request,
      stream,
      kiClient,
      boundInferenceClient,
      bindTo,
      server,
      licensing,
      maintenanceService,
      telemetry,
      identifyResult,
      ensureEnabled,
    } = makeInferredHandlerParams();

    await expect(inferredRoute.handler(handlerParams)).resolves.toEqual({
      ...identifyResult,
      connectorId: 'connector-1',
    });

    expect(assertSignificantEventsAccess).toHaveBeenCalledWith({ server, licensing });
    expect(maintenanceService.getState).toHaveBeenCalledWith({ request });
    expect(bindTo).toHaveBeenCalledWith({
      connectorId: 'connector-1',
      metadata: {
        connectorTelemetry: {
          pluginId: SIGNIFICANT_EVENTS_KI_EXTRACTION_INFERENCE_FEATURE_ID,
          aggregateBy: SIGNIFICANT_EVENTS_INFERENCE_PARENT_FEATURE_ID,
        },
      },
    });
    expect(mockIdentifyInferredFeatures).toHaveBeenCalledWith(
      expect.objectContaining({
        inferenceClient: boundInferenceClient,
        kiClient,
        streamName: 'logs.test',
        streamType: 'logs',
        connectorId: 'connector-1',
        runId: 'run-1',
        iteration: 2,
        documents: [{ _id: 'document-1', fields: { message: 'test message' } }],
        totalFilters: 3,
        filtersCapped: false,
        hasFilteredDocuments: true,
        tuning: {
          max_excluded_features_in_prompt: 5,
          maxPreviouslyIdentifiedFeatures: 6,
        },
        trackFeaturesIdentified: expect.any(Function),
      })
    );
    expect(mockGetStreamTypeFromDefinition).toHaveBeenCalledWith(stream);
    expect(telemetry.trackFeaturesIdentified).not.toHaveBeenCalled();
    expect(ensureEnabled).toHaveBeenCalledWith({ request });
  });

  it('returns identification results when sync workflow bootstrap fails', async () => {
    const ensureEnabled = jest.fn().mockRejectedValue(new Error('workflow unavailable'));
    const { handlerParams, routeLogger, identifyResult } = makeInferredHandlerParams({
      ensureEnabled,
    });

    await expect(inferredRoute.handler(handlerParams)).resolves.toEqual({
      ...identifyResult,
      connectorId: 'connector-1',
    });
    expect(routeLogger.warn).toHaveBeenCalledWith(
      'Failed to ensure KI sync workflow is enabled: workflow unavailable'
    );
  });
});

describe('computed feature identification route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects _identify/computed with 409 while paused', async () => {
    const getKnowledgeIndicatorClient = jest.fn();
    const handlerParams = {
      params: { path: { streamName: 'logs.test' }, body: null },
      request: {},
      getScopedClients: jest.fn().mockResolvedValue({
        licensing: {},
        getKnowledgeIndicatorClient,
      }),
      server: {},
      maintenanceService: makeMaintenanceService('paused'),
    } as unknown as ComputedHandlerParams;

    await expect(computedRoute.handler(handlerParams)).rejects.toMatchObject({
      output: { statusCode: 409 },
    });
    expect(getKnowledgeIndicatorClient).not.toHaveBeenCalled();
  });

  it('identifies computed features and maps the route response while enabled', async () => {
    const {
      handlerParams,
      request,
      stream,
      kiClient,
      streamDataEsClient,
      server,
      licensing,
      maintenanceService,
      identifyResult,
    } = makeComputedHandlerParams();

    await expect(computedRoute.handler(handlerParams)).resolves.toEqual({
      computedFeatures: identifyResult.features,
      computedFeaturesCount: identifyResult.features.length,
      errors: identifyResult.errors,
    });

    expect(assertSignificantEventsAccess).toHaveBeenCalledWith({ server, licensing });
    expect(maintenanceService.getState).toHaveBeenCalledWith({ request });
    expect(mockIdentifyComputedFeatures).toHaveBeenCalledWith(
      expect.objectContaining({
        stream,
        streamName: 'logs.test',
        start: 100,
        end: 200,
        esClient: streamDataEsClient,
        kiClient,
        runId: 'run-1',
        timeoutMs: 7_000,
        signal: expect.any(AbortSignal),
      })
    );
  });
});

describe('should identify features route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('allows _should_identify while paused', async () => {
    const kiClient = {};
    const maintenanceService = makeMaintenanceService('paused');
    mockShouldIdentifyFeatures.mockResolvedValue(true);
    const handlerParams = {
      params: {
        path: { streamName: 'logs.test' },
        query: { thresholdHours: 24 },
      },
      request: {},
      getScopedClients: jest.fn().mockResolvedValue({
        licensing: {},
        getKnowledgeIndicatorClient: jest.fn().mockResolvedValue(kiClient),
      }),
      server: {},
      maintenanceService,
    } as unknown as ShouldIdentifyHandlerParams;

    await expect(shouldIdentifyRoute.handler(handlerParams)).resolves.toBe(true);
    expect(maintenanceService.getState).not.toHaveBeenCalled();
    expect(mockShouldIdentifyFeatures).toHaveBeenCalledWith({
      kiClient,
      streamName: 'logs.test',
      thresholdHours: 24,
    });
  });
});
