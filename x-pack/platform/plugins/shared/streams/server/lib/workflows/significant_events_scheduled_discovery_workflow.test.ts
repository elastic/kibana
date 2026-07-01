/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import {
  getManagedWorkflowDefinition,
  SIGEVENTS_SCHEDULED_DETECTION_WORKFLOW_ID,
  SIGEVENTS_SCHEDULED_REVIEW_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import {
  DEFAULT_SIG_EVENTS_SCHEDULED_DETECTION_INTERVAL_MINUTES,
  DEFAULT_SIG_EVENTS_SCHEDULED_DISCOVERY_BATCH_SIZE,
  DEFAULT_SIG_EVENTS_SCHEDULED_MAX_REVIEW_PASSES,
  DEFAULT_SIG_EVENTS_SCHEDULED_REVIEW_INTERVAL_MINUTES,
  DEFAULT_SIG_EVENTS_SCHEDULED_TRIAGE_BATCH_SIZE,
} from '../../../common/constants';
import { createSignificantEventsScheduledDiscoveryWorkflowService } from './significant_events_scheduled_discovery_workflow';

const getWorkflowYaml = (id: string, values: Record<string, unknown>): string => {
  const definition = getManagedWorkflowDefinition(id);
  if (!definition || !('yamlTemplate' in definition) || !definition.yamlTemplate) {
    throw new Error(`Managed workflow definition ${id} is missing a yamlTemplate`);
  }
  return definition.yamlTemplate(values);
};

const createMockManagementApi = (overrides: Record<string, jest.Mock> = {}) => ({
  getWorkflow: jest.fn().mockResolvedValue({
    id: SIGEVENTS_SCHEDULED_DETECTION_WORKFLOW_ID,
    enabled: false,
  }),
  updateWorkflow: jest.fn().mockResolvedValue({}),
  getWorkflowExecutions: jest.fn().mockResolvedValue({ results: [], total: 0 }),
  cancelWorkflowExecution: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

const createMockManagedWorkflowsClient = () => ({
  install: jest.fn().mockResolvedValue(undefined),
  uninstall: jest.fn().mockResolvedValue(undefined),
  ready: jest.fn().mockResolvedValue(undefined),
  getWorkflowStatus: jest.fn(),
  execute: jest.fn(),
});

describe('scheduled Significant Events managed workflows', () => {
  it('registers the detection workflow as dynamic and restorable', () => {
    const definition = getManagedWorkflowDefinition(SIGEVENTS_SCHEDULED_DETECTION_WORKFLOW_ID);

    expect(definition?.management).toEqual({
      lifecycle: 'dynamic',
      versionStrategy: 'auto',
      enablement: 'restorable',
    });
  });

  it('registers the review workflow as dynamic and restorable', () => {
    const definition = getManagedWorkflowDefinition(SIGEVENTS_SCHEDULED_REVIEW_WORKFLOW_ID);

    expect(definition?.management).toEqual({
      lifecycle: 'dynamic',
      versionStrategy: 'auto',
      enablement: 'restorable',
    });
  });

  it('renders detection disabled by default at the configured cadence', () => {
    const yaml = getWorkflowYaml(SIGEVENTS_SCHEDULED_DETECTION_WORKFLOW_ID, {
      detectionIntervalMinutes: DEFAULT_SIG_EVENTS_SCHEDULED_DETECTION_INTERVAL_MINUTES,
    });

    expect(yaml).toContain('enabled: false');
    expect(yaml).toContain(`every: "${DEFAULT_SIG_EVENTS_SCHEDULED_DETECTION_INTERVAL_MINUTES}m"`);
    expect(yaml).toContain('workflow-id: "system-significant-events-detection"');
    expect(yaml).toContain(
      `lookback: "now-${DEFAULT_SIG_EVENTS_SCHEDULED_DETECTION_INTERVAL_MINUTES}m"`
    );
  });

  it('renders review disabled by default with bounded discovery and triage passes', () => {
    const yaml = getWorkflowYaml(SIGEVENTS_SCHEDULED_REVIEW_WORKFLOW_ID, {
      reviewIntervalMinutes: DEFAULT_SIG_EVENTS_SCHEDULED_REVIEW_INTERVAL_MINUTES,
      discoveryBatchSize: DEFAULT_SIG_EVENTS_SCHEDULED_DISCOVERY_BATCH_SIZE,
      triageBatchSize: DEFAULT_SIG_EVENTS_SCHEDULED_TRIAGE_BATCH_SIZE,
      maxReviewPasses: DEFAULT_SIG_EVENTS_SCHEDULED_MAX_REVIEW_PASSES,
    });

    expect(yaml).toContain('enabled: false');
    expect(yaml).toContain(`every: "${DEFAULT_SIG_EVENTS_SCHEDULED_REVIEW_INTERVAL_MINUTES}m"`);
    expect(yaml).toContain('foreach: "[1,2,3]"');
    expect(yaml).toContain('workflow-id: "system-significant-events-discovery"');
    expect(yaml).toContain(
      `detectionBatchMax: ${DEFAULT_SIG_EVENTS_SCHEDULED_DISCOVERY_BATCH_SIZE}`
    );
    expect(yaml).toContain('workflow-id: "system-significant-events-triage"');
    expect(yaml).toContain(`discoveryBatchMax: ${DEFAULT_SIG_EVENTS_SCHEDULED_TRIAGE_BATCH_SIZE}`);
  });
});

describe('SignificantEventsScheduledDiscoveryWorkflowService', () => {
  it('lazily installs and enables per-space scheduled workflows', async () => {
    const managementApi = createMockManagementApi();
    const managedWorkflowsClient = createMockManagedWorkflowsClient();
    const request = httpServerMock.createKibanaRequest();
    const service = createSignificantEventsScheduledDiscoveryWorkflowService({
      logger: loggerMock.create(),
      managementApi: managementApi as never,
      getManagedWorkflowsClient: jest.fn().mockResolvedValue(managedWorkflowsClient),
    });

    await service.ensureWorkflow({
      enabled: true,
      request,
      spaceId: 'space-a',
      config: {
        detectionIntervalMinutes: 30,
        reviewIntervalMinutes: 10,
        discoveryBatchSize: 3,
        triageBatchSize: 5,
        maxReviewPasses: 3,
      },
    });

    expect(managedWorkflowsClient.install).toHaveBeenCalledWith(
      SIGEVENTS_SCHEDULED_DETECTION_WORKFLOW_ID,
      { spaceId: 'space-a', values: { detectionIntervalMinutes: 30 } }
    );
    expect(managedWorkflowsClient.install).toHaveBeenCalledWith(
      SIGEVENTS_SCHEDULED_REVIEW_WORKFLOW_ID,
      {
        spaceId: 'space-a',
        values: {
          reviewIntervalMinutes: 10,
          discoveryBatchSize: 3,
          triageBatchSize: 5,
          maxReviewPasses: 3,
        },
      }
    );
    expect(managementApi.updateWorkflow).toHaveBeenCalledWith(
      SIGEVENTS_SCHEDULED_DETECTION_WORKFLOW_ID,
      { enabled: true },
      'space-a',
      request
    );
    expect(managementApi.updateWorkflow).toHaveBeenCalledWith(
      SIGEVENTS_SCHEDULED_REVIEW_WORKFLOW_ID,
      { enabled: true },
      'space-a',
      request
    );
  });

  it('updates template values without toggling workflows that are already enabled', async () => {
    const managementApi = createMockManagementApi({
      getWorkflow: jest.fn().mockResolvedValue({ enabled: true }),
    });
    const managedWorkflowsClient = createMockManagedWorkflowsClient();
    const service = createSignificantEventsScheduledDiscoveryWorkflowService({
      logger: loggerMock.create(),
      managementApi: managementApi as never,
      getManagedWorkflowsClient: jest.fn().mockResolvedValue(managedWorkflowsClient),
    });

    await service.ensureWorkflow({
      enabled: true,
      request: httpServerMock.createKibanaRequest(),
      spaceId: 'space-a',
      config: {
        detectionIntervalMinutes: 60,
        reviewIntervalMinutes: 15,
        discoveryBatchSize: 10,
        triageBatchSize: 12,
        maxReviewPasses: 4,
      },
    });

    expect(managedWorkflowsClient.install).toHaveBeenCalledTimes(2);
    expect(managementApi.updateWorkflow).not.toHaveBeenCalled();
  });

  it('disables, drains, and uninstalls per-space scheduled workflows', async () => {
    const managementApi = createMockManagementApi({
      getWorkflow: jest.fn().mockResolvedValue({ enabled: true }),
      getWorkflowExecutions: jest
        .fn()
        .mockResolvedValueOnce({ results: [{ id: 'running-detection-execution' }], total: 1 })
        .mockResolvedValueOnce({ results: [], total: 0 })
        .mockResolvedValue({ results: [], total: 0 }),
    });
    const managedWorkflowsClient = createMockManagedWorkflowsClient();
    const request = httpServerMock.createKibanaRequest();
    const service = createSignificantEventsScheduledDiscoveryWorkflowService({
      logger: loggerMock.create(),
      managementApi: managementApi as never,
      getManagedWorkflowsClient: jest.fn().mockResolvedValue(managedWorkflowsClient),
    });

    await service.ensureWorkflow({
      enabled: false,
      request,
      spaceId: 'space-a',
      config: {
        detectionIntervalMinutes: 30,
        reviewIntervalMinutes: 10,
        discoveryBatchSize: 3,
        triageBatchSize: 5,
        maxReviewPasses: 3,
      },
    });

    expect(managementApi.updateWorkflow).toHaveBeenCalledWith(
      SIGEVENTS_SCHEDULED_DETECTION_WORKFLOW_ID,
      { enabled: false },
      'space-a',
      request
    );
    expect(managementApi.cancelWorkflowExecution).toHaveBeenCalledWith(
      'running-detection-execution',
      'space-a',
      request
    );
    expect(managedWorkflowsClient.uninstall).toHaveBeenCalledWith(
      SIGEVENTS_SCHEDULED_DETECTION_WORKFLOW_ID,
      { spaceId: 'space-a' }
    );
    expect(managedWorkflowsClient.uninstall).toHaveBeenCalledWith(
      SIGEVENTS_SCHEDULED_REVIEW_WORKFLOW_ID,
      { spaceId: 'space-a' }
    );
  });
});
