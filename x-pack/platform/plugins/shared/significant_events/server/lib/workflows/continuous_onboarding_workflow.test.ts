/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SIGNIFICANT_EVENTS_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID,
  getManagedWorkflowDefinition,
} from '@kbn/workflows/managed';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import {
  COORDINATOR_INTERVAL_MINUTES,
  LEGACY_CONTINUOUS_KI_EXTRACTION_WORKFLOW_ID,
  MAX_SCHEDULED_STREAMS,
  POLL_DELAY_SECONDS,
} from '../../../common/constants';
import { createContinuousKiOnboardingWorkflowService } from './continuous_onboarding_workflow';

// The continuous onboarding workflow YAML lives in the managed workflow
// definition (kbn-workflows/managed/definitions/significant_events/knowledge_indicators/continuous_onboarding.yaml).
// These tests keep that YAML in sync with the streams constants.
const definition = getManagedWorkflowDefinition(
  SIGNIFICANT_EVENTS_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID
);

const getWorkflowYaml = (): string => {
  if (!definition || !('yaml' in definition) || typeof definition.yaml !== 'string') {
    throw new Error('Continuous onboarding managed workflow definition is missing inline YAML');
  }
  return definition.yaml;
};

const WORKFLOW_YAML = getWorkflowYaml();

const assertYamlContains = (expected: string) => {
  expect(WORKFLOW_YAML).toContain(expected);
};

describe('continuous_onboarding.yaml stays in sync with constants', () => {
  it('is registered as a restorable managed workflow', () => {
    expect(definition?.management.enablement).toBe('restorable');
  });

  it('is disabled by default so the user setting controls enablement', () => {
    assertYamlContains('enabled: false');
  });

  it('uses the correct timeout', () => {
    assertYamlContains(`timeout: '${COORDINATOR_INTERVAL_MINUTES - 1}m'`);
  });

  it('uses the correct coordinator interval', () => {
    assertYamlContains(`every: '${COORDINATOR_INTERVAL_MINUTES}m'`);
  });

  it('uses the correct maxScheduledStreams input', () => {
    assertYamlContains(
      `name: maxScheduledStreams\n        type: number\n        default: ${MAX_SCHEDULED_STREAMS}`
    );
  });

  it('uses the correct lookbackHours input', () => {
    assertYamlContains(`name: lookbackHours\n        type: number\n        default: 24`);
  });

  it('declares consts that match the input defaults', () => {
    assertYamlContains(`maxScheduledStreams: ${MAX_SCHEDULED_STREAMS}`);
    assertYamlContains('lookbackHours: 24');
  });

  it('declares extractionIntervalHours as an optional input without default', () => {
    assertYamlContains('name: extractionIntervalHours\n        type: number\n        description:');
    expect(WORKFLOW_YAML).not.toMatch(
      /- name: extractionIntervalHours\n\s+type: number\n\s+default:/m
    );
  });

  it('does not declare the removed excludedStreamPatterns input', () => {
    expect(WORKFLOW_YAML).not.toContain('excludedStreamPatterns');
  });

  it('uses the correct poll delay duration', () => {
    assertYamlContains(`duration: '${POLL_DELAY_SECONDS}s'`);
  });

  it('calls the eligibility endpoint with the correct query params', () => {
    assertYamlContains('_extraction/_eligible');
    assertYamlContains(
      'maxScheduledStreams={{ inputs.maxScheduledStreams | default: consts.maxScheduledStreams }}'
    );
    assertYamlContains('lookbackHours={{ inputs.lookbackHours | default: consts.lookbackHours }}');
    assertYamlContains(
      '{%- if inputs.extractionIntervalHours %}&extractionIntervalHours={{ inputs.extractionIntervalHours }}{% endif -%}'
    );
  });

  it('starts onboarding via workflow.executeAsync for the managed onboarding workflow', () => {
    assertYamlContains('type: workflow.executeAsync');
    assertYamlContains("workflow-id: 'system-streams-ki-onboarding'");
  });

  it('runs both features identification and queries generation', () => {
    assertYamlContains('skipFeatures: false');
    assertYamlContains('skipQueries: false');
  });

  it('converts the eligibility sampling window from ISO to epoch ms', () => {
    assertYamlContains(
      `featuresStart: "\${{ steps.get_eligible.output.timeRange.from | date: '%s' | times: 1000 }}"`
    );
    assertYamlContains(
      `featuresEnd: "\${{ steps.get_eligible.output.timeRange.to | date: '%s' | times: 1000 }}"`
    );
  });

  it('polls the onboarding status endpoint to await completion', () => {
    assertYamlContains('onboarding/_status');
  });
});

describe('continuous KI onboarding scheduler reconciliation', () => {
  const managedWorkflow = {
    id: SIGNIFICANT_EVENTS_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID,
    enabled: true,
  };
  const legacyWorkflow = {
    id: LEGACY_CONTINUOUS_KI_EXTRACTION_WORKFLOW_ID,
    enabled: true,
  };

  const createService = ({
    getWorkflow = jest
      .fn()
      .mockImplementation(async (id: string) =>
        id === SIGNIFICANT_EVENTS_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID ? managedWorkflow : undefined
      ),
    getScheduledTask = jest.fn().mockResolvedValue({ id: 'scheduled-task' }),
  } = {}) => {
    const managementApi = {
      getWorkflow,
      updateWorkflow: jest.fn().mockResolvedValue(managedWorkflow),
      deleteWorkflows: jest.fn().mockResolvedValue({ deleted: 1, failures: [] }),
      getWorkflowExecutions: jest.fn().mockResolvedValue({ results: [], total: 0 }),
      cancelWorkflowExecution: jest.fn(),
    };
    const service = createContinuousKiOnboardingWorkflowService({
      logger: loggingSystemMock.createLogger(),
      managementApi: managementApi as unknown as Parameters<
        typeof createContinuousKiOnboardingWorkflowService
      >[0]['managementApi'],
      streamsKIsOnboardingClient: {} as Parameters<
        typeof createContinuousKiOnboardingWorkflowService
      >[0]['streamsKIsOnboardingClient'],
      getScheduledTask,
    });
    return { getScheduledTask, managementApi, service };
  };

  it('refreshes the existing schedule API key and verifies the postcondition', async () => {
    const { getScheduledTask, managementApi, service } = createService();

    await service.ensureCappedContinuousKiScheduled({ request: {} as never });

    expect(managementApi.updateWorkflow).toHaveBeenCalledWith(
      SIGNIFICANT_EVENTS_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID,
      { enabled: true },
      'default',
      expect.anything()
    );
    expect(getScheduledTask).toHaveBeenCalledTimes(2);
  });

  it('repairs a missing deterministic schedule and verifies the postcondition', async () => {
    const getScheduledTask = jest
      .fn()
      .mockRejectedValueOnce({ statusCode: 404 })
      .mockResolvedValueOnce({ id: 'scheduled-task' });
    const { managementApi, service } = createService({ getScheduledTask });

    await service.ensureCappedContinuousKiScheduled({ request: {} as never });

    expect(managementApi.updateWorkflow).toHaveBeenCalledTimes(1);
    expect(getScheduledTask).toHaveBeenCalledWith(
      `workflow:${SIGNIFICANT_EVENTS_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID}:scheduled`
    );
  });

  it('strictly removes an active legacy workflow before updating the managed workflow', async () => {
    const getWorkflow = jest
      .fn()
      .mockImplementation(async (id: string) =>
        id === LEGACY_CONTINUOUS_KI_EXTRACTION_WORKFLOW_ID ? legacyWorkflow : managedWorkflow
      );
    const { managementApi, service } = createService({ getWorkflow });

    await service.ensureCappedContinuousKiScheduled({ request: {} as never });

    expect(managementApi.deleteWorkflows).toHaveBeenCalledWith(
      [LEGACY_CONTINUOUS_KI_EXTRACTION_WORKFLOW_ID],
      'default',
      expect.anything(),
      { force: true }
    );
    expect(managementApi.deleteWorkflows.mock.invocationCallOrder[0]).toBeLessThan(
      managementApi.updateWorkflow.mock.invocationCallOrder[0]
    );
  });

  it('does not enable the managed workflow when legacy cancellation fails', async () => {
    const getWorkflow = jest
      .fn()
      .mockImplementation(async (id: string) =>
        id === LEGACY_CONTINUOUS_KI_EXTRACTION_WORKFLOW_ID ? legacyWorkflow : managedWorkflow
      );
    const { managementApi, service } = createService({ getWorkflow });
    managementApi.getWorkflowExecutions.mockRejectedValueOnce(new Error('cancellation failed'));

    await expect(
      service.ensureCappedContinuousKiScheduled({ request: {} as never })
    ).rejects.toThrow('cancellation failed');
    expect(managementApi.deleteWorkflows).not.toHaveBeenCalled();
    expect(managementApi.updateWorkflow).not.toHaveBeenCalled();
  });

  it('fails when the final workflow and schedule postcondition is not satisfied', async () => {
    const getScheduledTask = jest
      .fn()
      .mockResolvedValueOnce({ id: 'scheduled-task' })
      .mockRejectedValueOnce({ statusCode: 404 });
    const { service } = createService({ getScheduledTask });

    await expect(
      service.ensureCappedContinuousKiScheduled({ request: {} as never })
    ).rejects.toThrow('did not produce an enabled workflow and scheduled task');
  });
});
