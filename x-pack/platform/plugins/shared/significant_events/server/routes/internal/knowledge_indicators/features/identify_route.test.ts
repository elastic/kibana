/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignificantEventsMaintenanceState } from '../../../../../common/maintenance/state_machine';
import { internalIdentifyKIFeaturesRoutes } from './identify_route';

jest.mock('../../../utils/assert_significant_events_access', () => ({
  assertSignificantEventsAccess: jest.fn().mockResolvedValue(undefined),
}));

const mockShouldIdentifyFeatures = jest.fn();

jest.mock('../../../../lib/significant_events/features/should_identify_features', () => ({
  shouldIdentifyFeatures: (...args: unknown[]) => mockShouldIdentifyFeatures(...args),
}));

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

const makeMaintenanceService = (state: SignificantEventsMaintenanceState = 'enabled') => ({
  getState: jest.fn().mockResolvedValue(state),
});

describe('pause guard on feature identification routes', () => {
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
