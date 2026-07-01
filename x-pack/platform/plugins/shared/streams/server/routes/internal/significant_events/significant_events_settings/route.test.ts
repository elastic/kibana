/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_ENABLED,
  OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_DETECTION_INTERVAL_MINUTES,
  OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_REVIEW_INTERVAL_MINUTES,
  OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_DISCOVERY_BATCH_SIZE,
  OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_TRIAGE_BATCH_SIZE,
  OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_MAX_REVIEW_PASSES,
} from '@kbn/management-settings-ids';
import { internalSignificantEventsSettingsRoutes } from './route';

jest.mock('../../../utils/assert_significant_events_access', () => ({
  assertSignificantEventsAccess: jest.fn().mockResolvedValue(undefined),
}));

const route =
  internalSignificantEventsSettingsRoutes['PUT /internal/streams/_significant_events/settings'];

type HandlerParams = Parameters<typeof route.handler>[0];

const createHandlerParams = ({
  scheduledDiscovery,
  scheduledWorkflowError,
  spaceSettings = {
    [OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_ENABLED]: false,
    [OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_DETECTION_INTERVAL_MINUTES]: 30,
    [OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_REVIEW_INTERVAL_MINUTES]: 10,
    [OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_DISCOVERY_BATCH_SIZE]: 3,
    [OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_TRIAGE_BATCH_SIZE]: 5,
    [OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_MAX_REVIEW_PASSES]: 3,
  },
}: {
  scheduledDiscovery: NonNullable<HandlerParams['params']>['body']['scheduledDiscovery'];
  scheduledWorkflowError?: Error;
  spaceSettings?: Record<string, boolean | number>;
}) => {
  const uiSettingsClient = {
    getAll: jest.fn().mockResolvedValue(spaceSettings),
    setMany: jest.fn().mockResolvedValue(undefined),
  };
  const globalUiSettingsClient = {
    getAll: jest.fn().mockResolvedValue({}),
    setMany: jest.fn().mockResolvedValue(undefined),
  };
  const scheduledWorkflowService = {
    ensureWorkflow: jest
      .fn()
      .mockImplementation(() =>
        scheduledWorkflowError ? Promise.reject(scheduledWorkflowError) : Promise.resolve()
      ),
  };

  const handlerParams = {
    params: { body: { scheduledDiscovery } },
    request: {},
    getScopedClients: jest.fn().mockResolvedValue({
      licensing: {},
      uiSettingsClient,
      globalUiSettingsClient,
    }),
    server: {},
    significantEventsScheduledDiscoveryWorkflowService: scheduledWorkflowService,
    getSpaceId: jest.fn().mockResolvedValue('space-a'),
    logger: { warn: jest.fn() },
    telemetry: {
      startTrackingEndpointLatency: jest.fn().mockReturnValue(jest.fn()),
      reportStreamsStateError: jest.fn(),
    },
    response: {},
    context: {},
  } as unknown as HandlerParams;

  return { handlerParams, uiSettingsClient, globalUiSettingsClient, scheduledWorkflowService };
};

describe('significant events settings route', () => {
  it('persists scheduled discovery settings and reconciles per-space workflows on enable', async () => {
    const { handlerParams, uiSettingsClient, globalUiSettingsClient, scheduledWorkflowService } =
      createHandlerParams({
        scheduledDiscovery: {
          enabled: true,
          detectionIntervalMinutes: 45,
          reviewIntervalMinutes: 15,
          discoveryBatchSize: 6,
          triageBatchSize: 8,
          maxReviewPasses: 4,
        },
      });

    await route.handler(handlerParams);

    expect(globalUiSettingsClient.setMany).not.toHaveBeenCalled();
    expect(uiSettingsClient.setMany).toHaveBeenCalledWith({
      [OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_ENABLED]: true,
      [OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_DETECTION_INTERVAL_MINUTES]: 45,
      [OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_REVIEW_INTERVAL_MINUTES]: 15,
      [OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_DISCOVERY_BATCH_SIZE]: 6,
      [OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_TRIAGE_BATCH_SIZE]: 8,
      [OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_MAX_REVIEW_PASSES]: 4,
    });
    expect(scheduledWorkflowService.ensureWorkflow).toHaveBeenCalledWith({
      enabled: true,
      request: handlerParams.request,
      spaceId: 'space-a',
      config: {
        detectionIntervalMinutes: 45,
        reviewIntervalMinutes: 15,
        discoveryBatchSize: 6,
        triageBatchSize: 8,
        maxReviewPasses: 4,
      },
    });
  });

  it('rolls back scheduled discovery settings when workflow reconciliation fails', async () => {
    const previousSettings = {
      [OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_ENABLED]: false,
      [OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_DETECTION_INTERVAL_MINUTES]: 30,
    };
    const { handlerParams, uiSettingsClient } = createHandlerParams({
      scheduledDiscovery: {
        enabled: true,
        detectionIntervalMinutes: 45,
      },
      scheduledWorkflowError: new Error('workflow sync failed'),
      spaceSettings: previousSettings,
    });

    await expect(route.handler(handlerParams)).rejects.toThrow('workflow sync failed');

    expect(uiSettingsClient.setMany).toHaveBeenNthCalledWith(1, {
      [OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_ENABLED]: true,
      [OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_DETECTION_INTERVAL_MINUTES]: 45,
    });
    expect(uiSettingsClient.setMany).toHaveBeenNthCalledWith(2, previousSettings);
  });
});
