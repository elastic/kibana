/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowsManagementApi } from '@kbn/workflows-management-plugin/server/workflows_management/workflows_management_api';
import { DispatchStep } from './dispatch_step';
import { createLoggerService } from '../../services/logger_service/logger_service.mock';
import {
  createDispatcherPipelineState,
  createNotificationGroup,
  createNotificationPolicy,
} from '../fixtures/test_utils';

jest.mock('../workflow_dispatcher', () => ({
  dispatchWorkflow: jest.fn(),
}));

const { dispatchWorkflow } = jest.requireMock('../workflow_dispatcher');

const createMockWorkflowsManagement = (): jest.Mocked<WorkflowsManagementApi> =>
  ({
    getWorkflow: jest.fn(),
    runWorkflow: jest.fn(),
  } as any);

describe('DispatchStep', () => {
  afterEach(() => jest.clearAllMocks());

  it('dispatches workflows for groups with API keys', async () => {
    const { loggerService } = createLoggerService();
    const wfm = createMockWorkflowsManagement();
    const step = new DispatchStep(wfm, loggerService);

    const group = createNotificationGroup({ id: 'g1', policyId: 'p1' });
    const policy = createNotificationPolicy({ id: 'p1', apiKey: 'abc123' });

    const state = createDispatcherPipelineState({
      dispatch: [group],
      policies: new Map([['p1', policy]]),
    });

    const result = await step.execute(state);

    expect(result.type).toBe('continue');
    expect(dispatchWorkflow).toHaveBeenCalledTimes(1);
    expect(dispatchWorkflow).toHaveBeenCalledWith(group, expect.any(Object), wfm);
  });

  it('skips dispatch when policy has no API key', async () => {
    const { loggerService } = createLoggerService();
    const wfm = createMockWorkflowsManagement();
    const step = new DispatchStep(wfm, loggerService);

    const group = createNotificationGroup({ id: 'g1', policyId: 'p1' });
    const policy = createNotificationPolicy({ id: 'p1' });

    const state = createDispatcherPipelineState({
      dispatch: [group],
      policies: new Map([['p1', policy]]),
    });

    const result = await step.execute(state);

    expect(result.type).toBe('continue');
    expect(dispatchWorkflow).not.toHaveBeenCalled();
  });

  it('skips dispatch when policy is not found', async () => {
    const { loggerService } = createLoggerService();
    const wfm = createMockWorkflowsManagement();
    const step = new DispatchStep(wfm, loggerService);

    const group = createNotificationGroup({ id: 'g1', policyId: 'missing' });

    const state = createDispatcherPipelineState({
      dispatch: [group],
      policies: new Map(),
    });

    const result = await step.execute(state);

    expect(result.type).toBe('continue');
    expect(dispatchWorkflow).not.toHaveBeenCalled();
  });

  it('continues with no-op when dispatch is empty', async () => {
    const { loggerService } = createLoggerService();
    const wfm = createMockWorkflowsManagement();
    const step = new DispatchStep(wfm, loggerService);

    const state = createDispatcherPipelineState({ dispatch: [] });
    const result = await step.execute(state);

    expect(result.type).toBe('continue');
    expect(dispatchWorkflow).not.toHaveBeenCalled();
  });
});
