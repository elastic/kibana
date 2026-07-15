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
import { internalScheduledDiscoveryRoutes } from './route';

jest.mock('../../utils/assert_significant_events_access', () => ({
  assertSignificantEventsAccess: jest.fn().mockResolvedValue(undefined),
}));

const route =
  internalScheduledDiscoveryRoutes[
    'PUT /internal/streams/_significant_events/scheduled_discovery/settings'
  ];

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
    }),
    server: {},
    significantEventsScheduledWorkflowsService: scheduledWorkflowService,
    getSpaceId: jest.fn().mockResolvedValue('space-a'),
    logger: { warn: jest.fn() },
    telemetry: {
      startTrackingEndpointLatency: jest.fn().mockReturnValue(jest.fn()),
      reportStreamsStateError: jest.fn(),
    },
    response: {},
    context: {},
  } as unknown as HandlerParams;

  return { handlerParams, uiSettingsClient, scheduledWorkflowService };
};

describe('scheduled significant events discovery settings route', () => {
  it('persists scheduled discovery settings and reconciles per-space workflows on enable', async () => {
    const { handlerParams, uiSettingsClient, scheduledWorkflowService } = createHandlerParams({
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

  it('reconciles a teardown when scheduled discovery is disabled', async () => {
    const { handlerParams, uiSettingsClient, scheduledWorkflowService } = createHandlerParams({
      scheduledDiscovery: {
        enabled: false,
      },
      spaceSettings: {
        [OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_ENABLED]: true,
        [OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_DETECTION_INTERVAL_MINUTES]: 30,
        [OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_REVIEW_INTERVAL_MINUTES]: 10,
        [OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_DISCOVERY_BATCH_SIZE]: 3,
        [OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_TRIAGE_BATCH_SIZE]: 5,
        [OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_MAX_REVIEW_PASSES]: 3,
      },
    });

    await route.handler(handlerParams);

    expect(uiSettingsClient.setMany).toHaveBeenCalledWith({
      [OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_ENABLED]: false,
    });
    expect(scheduledWorkflowService.ensureWorkflow).toHaveBeenCalledWith({
      enabled: false,
      request: handlerParams.request,
      spaceId: 'space-a',
      config: {
        detectionIntervalMinutes: 30,
        reviewIntervalMinutes: 10,
        discoveryBatchSize: 3,
        triageBatchSize: 5,
        maxReviewPasses: 3,
      },
    });
  });

  it('reconciles a config-only update while enabled, merging request values over stored settings', async () => {
    const { handlerParams, uiSettingsClient, scheduledWorkflowService } = createHandlerParams({
      scheduledDiscovery: {
        detectionIntervalMinutes: 45,
      },
      spaceSettings: {
        [OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_ENABLED]: true,
        [OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_DETECTION_INTERVAL_MINUTES]: 30,
        [OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_REVIEW_INTERVAL_MINUTES]: 10,
        [OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_DISCOVERY_BATCH_SIZE]: 3,
        [OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_TRIAGE_BATCH_SIZE]: 5,
        [OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_MAX_REVIEW_PASSES]: 3,
      },
    });

    await route.handler(handlerParams);

    expect(uiSettingsClient.setMany).toHaveBeenCalledWith({
      [OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_DETECTION_INTERVAL_MINUTES]: 45,
    });
    expect(scheduledWorkflowService.ensureWorkflow).toHaveBeenCalledWith({
      enabled: true,
      request: handlerParams.request,
      spaceId: 'space-a',
      config: {
        detectionIntervalMinutes: 45,
        reviewIntervalMinutes: 10,
        discoveryBatchSize: 3,
        triageBatchSize: 5,
        maxReviewPasses: 3,
      },
    });
  });

  it('does not reconcile workflows for a config-only update while disabled', async () => {
    const { handlerParams, uiSettingsClient, scheduledWorkflowService } = createHandlerParams({
      scheduledDiscovery: {
        detectionIntervalMinutes: 45,
      },
      spaceSettings: {
        [OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_ENABLED]: false,
        [OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_DETECTION_INTERVAL_MINUTES]: 30,
      },
    });

    await route.handler(handlerParams);

    expect(uiSettingsClient.setMany).toHaveBeenCalledWith({
      [OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_DETECTION_INTERVAL_MINUTES]: 45,
    });
    expect(scheduledWorkflowService.ensureWorkflow).not.toHaveBeenCalled();
  });

  it('does not reconcile workflows when the enabled state is re-sent unchanged with no config change', async () => {
    const { handlerParams, scheduledWorkflowService } = createHandlerParams({
      scheduledDiscovery: {
        enabled: true,
      },
      spaceSettings: {
        [OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_ENABLED]: true,
      },
    });

    await route.handler(handlerParams);

    expect(scheduledWorkflowService.ensureWorkflow).not.toHaveBeenCalled();
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
