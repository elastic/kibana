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
  SIGNIFICANT_EVENTS_DETECTION_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_DISCOVERY_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_SCHEDULED_DETECTION_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_SCHEDULED_REVIEW_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_TRIAGE_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import { parse } from 'yaml';
import { createSignificantEventsScheduledWorkflowsService } from './significant_events_scheduled_workflows';

interface ParsedWorkflowStep {
  name: string;
  type: string;
  status?: string;
  if?: string;
  condition?: string;
  'max-iterations'?: number;
  'iteration-timeout'?: string;
  with?: Record<string, unknown>;
  steps?: ParsedWorkflowStep[];
}

interface ParsedWorkflowInput {
  name: string;
}

interface ParsedWorkflowTrigger {
  type: string;
  with?: { every?: string };
  inputs?: ParsedWorkflowInput[];
}

interface ParsedWorkflow {
  enabled: boolean;
  triggers: ParsedWorkflowTrigger[];
  steps: ParsedWorkflowStep[];
}

const getParsedWorkflowYaml = (id: string, values: Record<string, unknown>): ParsedWorkflow => {
  const definition = getManagedWorkflowDefinition(id);
  if (!definition || !('yamlTemplate' in definition) || !definition.yamlTemplate) {
    throw new Error(`Managed workflow definition ${id} is missing a yamlTemplate`);
  }
  return parse(definition.yamlTemplate(values)) as ParsedWorkflow;
};

const getParsedStaticWorkflowYaml = (id: string): ParsedWorkflow => {
  const definition = getManagedWorkflowDefinition(id);
  if (!definition || !('yaml' in definition) || typeof definition.yaml !== 'string') {
    throw new Error(`Managed workflow definition ${id} is missing yaml`);
  }
  return parse(definition.yaml) as ParsedWorkflow;
};

const findStep = (steps: ParsedWorkflowStep[], name: string): ParsedWorkflowStep | undefined =>
  steps.find((step) => step.name === name);

const createMockManagementApi = (overrides: Record<string, jest.Mock> = {}) => ({
  getWorkflow: jest.fn().mockResolvedValue({
    id: SIGNIFICANT_EVENTS_SCHEDULED_DETECTION_WORKFLOW_ID,
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
  it.each([
    ['detection', SIGNIFICANT_EVENTS_SCHEDULED_DETECTION_WORKFLOW_ID],
    ['review', SIGNIFICANT_EVENTS_SCHEDULED_REVIEW_WORKFLOW_ID],
  ])('registers the %s workflow as dynamic and restorable', (_label, id) => {
    const definition = getManagedWorkflowDefinition(id);

    // 'dynamic'/'restorable' is what lets the reconciliation service below
    // install/enable/disable/uninstall these per space; 'static'/'enforced'
    // (used by the always-on detection/discovery/triage workflows) would
    // make them installed everywhere and impossible to turn off per space.
    expect(definition?.management).toEqual({
      lifecycle: 'dynamic',
      versionStrategy: 'auto',
      enablement: 'restorable',
    });
  });

  it('wires the detection interval into both the trigger cadence and the lookback, clamped to a 30m floor', () => {
    const belowFloor = getParsedWorkflowYaml(SIGNIFICANT_EVENTS_SCHEDULED_DETECTION_WORKFLOW_ID, {
      detectionIntervalMinutes: 5,
    });
    const aboveFloor = getParsedWorkflowYaml(SIGNIFICANT_EVENTS_SCHEDULED_DETECTION_WORKFLOW_ID, {
      detectionIntervalMinutes: 45,
    });

    expect(belowFloor.enabled).toBe(false);
    expect(belowFloor.triggers).toEqual(
      expect.arrayContaining([{ type: 'scheduled', with: { every: '5m' } }])
    );
    const belowFloorStep = findStep(belowFloor.steps, 'detect');
    expect(belowFloorStep?.with).toEqual({
      'workflow-id': SIGNIFICANT_EVENTS_DETECTION_WORKFLOW_ID,
      inputs: { lookback: 'now-30m' },
    });

    expect(aboveFloor.triggers).toEqual(
      expect.arrayContaining([{ type: 'scheduled', with: { every: '45m' } }])
    );
    const aboveFloorStep = findStep(aboveFloor.steps, 'detect');
    expect(aboveFloorStep?.with).toEqual({
      'workflow-id': SIGNIFICANT_EVENTS_DETECTION_WORKFLOW_ID,
      inputs: { lookback: 'now-45m' },
    });
  });

  it('wires each review config value into its own drain-loop input, not a sibling one', () => {
    const parsed = getParsedWorkflowYaml(SIGNIFICANT_EVENTS_SCHEDULED_REVIEW_WORKFLOW_ID, {
      reviewIntervalMinutes: 20,
      discoveryBatchSize: 7,
      triageBatchSize: 11,
      maxReviewPasses: 6,
    });

    expect(parsed.enabled).toBe(false);
    expect(parsed.triggers).toEqual(
      expect.arrayContaining([{ type: 'scheduled', with: { every: '20m' } }])
    );

    const drainLoop = findStep(parsed.steps, 'run_review_until_drained');
    expect(drainLoop?.type).toBe('while');
    expect(drainLoop?.['max-iterations']).toBe(6);
    // Each pass is bounded by its own timeout (discovery 20m + triage 30m worst
    // case) rather than a single workflow-level timeout.
    expect(drainLoop?.['iteration-timeout']).toBe('50m');
    // The loop re-runs only while a child still reports queued work. A child
    // error is deliberately NOT a continue condition, so the first failing pass
    // bails out of the loop instead of spinning until max-iterations.
    expect(drainLoop?.condition).toBe(
      '${{ steps.discover.output.hasRemaining == true or steps.triage.output.hasRemaining == true }}'
    );

    const discover = findStep(drainLoop?.steps ?? [], 'discover');
    expect(discover?.with).toEqual({
      'workflow-id': SIGNIFICANT_EVENTS_DISCOVERY_WORKFLOW_ID,
      inputs: { detectionBatchMax: 7 },
    });

    const triage = findStep(drainLoop?.steps ?? [], 'triage');
    expect(triage?.with).toEqual({
      'workflow-id': SIGNIFICANT_EVENTS_TRIAGE_WORKFLOW_ID,
      inputs: { discoveryBatchMax: 11 },
    });
  });

  it.each([
    ['discovery', SIGNIFICANT_EVENTS_DISCOVERY_WORKFLOW_ID, 'output_no_detections'],
    ['triage', SIGNIFICANT_EVENTS_TRIAGE_WORKFLOW_ID, 'output_no_discoveries'],
  ])(
    '%s always completes no-work runs as success and reports queue stats, so the scheduled drain loop can rely on hasRemaining instead of run status',
    (_label, id, noWorkStepName) => {
      const parsed = getParsedStaticWorkflowYaml(id);

      const triggerInputs = parsed.triggers[0]?.inputs ?? [];
      expect(triggerInputs.some((input) => input.name === 'completeNoWorkAsSuccess')).toBe(false);

      const noWorkStep = findStep(parsed.steps, noWorkStepName);
      expect(noWorkStep?.type).toBe('workflow.output');
      expect(noWorkStep?.status).not.toBe('cancelled');
      expect(noWorkStep?.with?.noWork).toBe(true);

      // No step anywhere in this workflow should cancel the run on no-work.
      expect(parsed.steps.some((step) => step.status === 'cancelled')).toBe(false);

      const resultStep = findStep(parsed.steps, 'output_result');
      expect(resultStep?.with).toMatchObject({
        hasRemaining: expect.stringContaining('compute_queue_stats.output.hasRemaining'),
        queueEmpty: expect.stringContaining('compute_queue_stats.output.queueEmpty'),
      });
    }
  );

  it('uses per-rule schedule metadata for detection and recovery gates', () => {
    const parsed = getParsedStaticWorkflowYaml(SIGNIFICANT_EVENTS_DETECTION_WORKFLOW_ID);
    const yaml = JSON.stringify(parsed);

    expect(yaml).toContain('foreach.item.rule_schedule.recent_activity_minutes');
    expect(yaml).toContain('foreach.item.rule_schedule.quick_recovery_lookback');
    expect(yaml).toContain('foreach.item.rule_schedule.quick_recovery_lookback_minutes');
    expect(yaml).toContain('foreach.item.rule_schedule.quiet_stationary_peak_min_alert_count');
  });
});

describe('SignificantEventsScheduledWorkflowsService', () => {
  it('lazily installs and enables per-space scheduled workflows', async () => {
    const managementApi = createMockManagementApi();
    const managedWorkflowsClient = createMockManagedWorkflowsClient();
    const request = httpServerMock.createKibanaRequest();
    const service = createSignificantEventsScheduledWorkflowsService({
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

    // Installs must disambiguate the shared managed workflow id per space via
    // workflowIdSuffix; without it a second space collides on one document.
    expect(managedWorkflowsClient.install).toHaveBeenCalledWith(
      SIGNIFICANT_EVENTS_SCHEDULED_DETECTION_WORKFLOW_ID,
      { spaceId: 'space-a', workflowIdSuffix: 'space-a', values: { detectionIntervalMinutes: 30 } }
    );
    expect(managedWorkflowsClient.install).toHaveBeenCalledWith(
      SIGNIFICANT_EVENTS_SCHEDULED_REVIEW_WORKFLOW_ID,
      {
        spaceId: 'space-a',
        workflowIdSuffix: 'space-a',
        values: {
          reviewIntervalMinutes: 10,
          discoveryBatchSize: 3,
          triageBatchSize: 5,
          maxReviewPasses: 3,
        },
      }
    );
    // Enable must target the same per-space document id, not the bare managed id.
    expect(managementApi.updateWorkflow).toHaveBeenCalledWith(
      `${SIGNIFICANT_EVENTS_SCHEDULED_DETECTION_WORKFLOW_ID}-space-a`,
      { enabled: true },
      'space-a',
      request
    );
    expect(managementApi.updateWorkflow).toHaveBeenCalledWith(
      `${SIGNIFICANT_EVENTS_SCHEDULED_REVIEW_WORKFLOW_ID}-space-a`,
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
    const service = createSignificantEventsScheduledWorkflowsService({
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
    const service = createSignificantEventsScheduledWorkflowsService({
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
      `${SIGNIFICANT_EVENTS_SCHEDULED_DETECTION_WORKFLOW_ID}-space-a`,
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
      SIGNIFICANT_EVENTS_SCHEDULED_DETECTION_WORKFLOW_ID,
      { spaceId: 'space-a', workflowIdSuffix: 'space-a' }
    );
    expect(managedWorkflowsClient.uninstall).toHaveBeenCalledWith(
      SIGNIFICANT_EVENTS_SCHEDULED_REVIEW_WORKFLOW_ID,
      { spaceId: 'space-a', workflowIdSuffix: 'space-a' }
    );
  });
});
