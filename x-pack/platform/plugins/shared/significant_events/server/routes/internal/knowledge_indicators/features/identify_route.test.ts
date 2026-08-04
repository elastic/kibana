/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { internalIdentifyKIFeaturesRoutes } from './identify_route';

jest.mock('../../../utils/assert_significant_events_access', () => ({
  assertSignificantEventsAccess: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../../../lib/significant_events/features', () => ({
  MS_PER_DAY: 86_400_000,
  identifyComputedFeatures: jest.fn().mockResolvedValue([]),
  identifyInferredFeatures: jest.fn(),
  buildTelemetry: jest.fn(),
}));

jest.mock(
  '../../../../lib/semantic_code_search_grounding/is_significant_events_semantic_code_search_grounding_enabled',
  () => ({
    isSignificantEventsSemanticCodeSearchGroundingEnabled: jest.fn().mockResolvedValue(false),
  })
);

const { identifyComputedFeatures } = jest.requireMock(
  '../../../../lib/significant_events/features'
) as {
  identifyComputedFeatures: jest.Mock;
};

const computedRoute =
  internalIdentifyKIFeaturesRoutes['POST /internal/streams/{streamName}/features/_identify/computed'];

type HandlerParams = Parameters<typeof computedRoute.handler>[0];

const streamDataEsClient = { search: jest.fn() } as unknown as ElasticsearchClient;
const originEsClient = { search: jest.fn() } as unknown as ElasticsearchClient;

const makeHandlerParams = (): HandlerParams =>
  ({
    params: {
      path: { streamName: 'logs.otel.cpsse.qs' },
      body: { start: 1, end: 2 },
    },
    request: {},
    getScopedClients: jest.fn().mockResolvedValue({
      streamDataEsClient,
      scopedClusterClient: { asCurrentUser: originEsClient },
      streamsClient: {
        getStream: jest.fn().mockResolvedValue({
          name: 'logs.otel.cpsse.qs',
          query: { view: '$.logs.otel.cpsse.qs' },
        }),
      },
      licensing: {},
      getKnowledgeIndicatorClient: jest.fn().mockResolvedValue({ bulk: jest.fn() }),
    }),
    server: {},
    logger: { get: jest.fn().mockReturnValue({ error: jest.fn() }) },
    telemetry: {},
  }) as unknown as HandlerParams;

describe('identifyComputedFeaturesRoute CPS routing', () => {
  beforeEach(() => {
    identifyComputedFeatures.mockClear();
  });

  it('uses streamDataEsClient (space CPS routing) for stream data reads', async () => {
    await computedRoute.handler(makeHandlerParams());

    expect(identifyComputedFeatures).toHaveBeenCalledWith(
      expect.objectContaining({
        esClient: streamDataEsClient,
        streamName: 'logs.otel.cpsse.qs',
      })
    );
    expect(identifyComputedFeatures).not.toHaveBeenCalledWith(
      expect.objectContaining({
        esClient: originEsClient,
      })
    );
  });
});
