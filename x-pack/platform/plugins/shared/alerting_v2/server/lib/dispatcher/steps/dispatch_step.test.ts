/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowDetailDto } from '@kbn/workflows';
import { createLoggerService } from '../../services/logger_service/logger_service.mock';
import {
  createDispatcherPipelineState,
  createNotificationGroup,
  createNotificationPolicy,
} from '../fixtures/test_utils';
import { createWorkflowsManagementApi } from '../fixtures/workflows_management_api.mock';
import { DispatchStep } from './dispatch_step';

describe('DispatchStep', () => {
  afterEach(() => jest.clearAllMocks());

  it('dispatches workflows for groups with API keys', async () => {
    const { loggerService } = createLoggerService();
    const wfm = createWorkflowsManagementApi();
    wfm.getWorkflow.mockResolvedValue({ id: 'workflow-1' } as unknown as WorkflowDetailDto);
    const step = new DispatchStep(wfm, loggerService);

    const group = createNotificationGroup({ id: 'g1', policyId: 'p1' });
    const policy = createNotificationPolicy({
      id: 'p1',
      apiKey: 'abc123',
      workflowId: 'workflow-1',
    });

    const state = createDispatcherPipelineState({
      dispatch: [group],
      policies: new Map([['p1', policy]]),
    });

    const result = await step.execute(state);

    expect(result.type).toBe('continue');
    expect(wfm.runWorkflow).toHaveBeenCalledTimes(1);
    expect(wfm.runWorkflow).toHaveBeenCalledWith(
      { id: 'workflow-1' } as unknown as WorkflowDetailDto,
      'default',
      group,
      expect.any(Object)
    );
  });

  it('skips dispatch when policy has no API key', async () => {
    const { loggerService } = createLoggerService();
    const wfm = createWorkflowsManagementApi();
    const step = new DispatchStep(wfm, loggerService);

    const group = createNotificationGroup({ id: 'g1', policyId: 'p1' });
    const policy = createNotificationPolicy({ id: 'p1' });

    const state = createDispatcherPipelineState({
      dispatch: [group],
      policies: new Map([['p1', policy]]),
    });

    const result = await step.execute(state);

    expect(result.type).toBe('continue');
    expect(wfm.runWorkflow).not.toHaveBeenCalled();
  });

  it('skips dispatch when policy is not found', async () => {
    const { loggerService } = createLoggerService();
    const wfm = createWorkflowsManagementApi();
    const step = new DispatchStep(wfm, loggerService);

    const group = createNotificationGroup({ id: 'g1', policyId: 'missing' });

    const state = createDispatcherPipelineState({
      dispatch: [group],
      policies: new Map(),
    });

    const result = await step.execute(state);

    expect(result.type).toBe('continue');
    expect(wfm.runWorkflow).not.toHaveBeenCalled();
  });

  it('continues with no-op when dispatch is empty', async () => {
    const { loggerService } = createLoggerService();
    const wfm = createWorkflowsManagementApi();
    const step = new DispatchStep(wfm, loggerService);

    const state = createDispatcherPipelineState({ dispatch: [] });
    const result = await step.execute(state);

    expect(result.type).toBe('continue');
    expect(wfm.runWorkflow).not.toHaveBeenCalled();
  });
});
