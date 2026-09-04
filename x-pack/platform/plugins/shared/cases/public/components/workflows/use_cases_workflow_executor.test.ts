/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import type { HttpStart } from '@kbn/core/public';
import { notificationServiceMock } from '@kbn/core/public/mocks';
import { CASE_WORKFLOW_ORIGIN_TYPE } from '../../../common/types/domain/user_action/workflow/constants';
import { useCasesWorkflowExecutor } from './use_cases_workflow_executor';
import * as api from './api';

// Mock dependencies injected via useKibana hooks
jest.mock('../../common/lib/kibana');

// Mock the EBT hook — analytics behaviour is tested in its own suite
jest.mock('../../analytics/use_workflow_run_ebt', () => ({
  useWorkflowRunTriggeredEBT: () => jest.fn(),
  getWorkflowRunOriginType: jest.requireActual('../../analytics/use_workflow_run_ebt')
    .getWorkflowRunOriginType,
}));

const mockRunCaseWorkflow = jest.spyOn(api, 'runCaseWorkflow');

describe('useCasesWorkflowExecutor', () => {
  const mockHttp = {} as HttpStart;
  const mockToasts = notificationServiceMock.createStartContract().toasts;

  const { useHttp, useToasts } = jest.requireMock('../../common/lib/kibana');

  beforeEach(() => {
    jest.clearAllMocks();
    useHttp.mockReturnValue(mockHttp);
    useToasts.mockReturnValue(mockToasts);
  });

  const renderExecutorHook = () =>
    renderHook(() =>
      useCasesWorkflowExecutor({
        caseId: 'case-1',
        origin: { type: CASE_WORKFLOW_ORIGIN_TYPE, caseId: 'case-1' },
      })
    );

  it('calls runCaseWorkflow with caseIds array, no top-level caseId', async () => {
    mockRunCaseWorkflow.mockResolvedValueOnce({
      workflowExecutionId: 'exec-abc',
      activityStatus: 'succeeded',
    });

    const { result } = renderExecutorHook();
    const response = await result.current({
      workflowId: 'wf-123',
      inputs: { foo: 'bar' },
    });

    expect(mockRunCaseWorkflow).toHaveBeenCalledWith({
      http: mockHttp,
      workflowId: 'wf-123',
      body: {
        caseIds: ['case-1'],
        inputs: { foo: 'bar' },
        origin: { type: CASE_WORKFLOW_ORIGIN_TYPE, caseId: 'case-1' },
      },
    });
    expect(response).toEqual({ workflowExecutionId: 'exec-abc' });
  });

  it('returns the workflowExecutionId from the response', async () => {
    mockRunCaseWorkflow.mockResolvedValueOnce({
      workflowExecutionId: 'exec-xyz',
      activityStatus: 'succeeded',
    });

    const { result } = renderExecutorHook();
    const response = await result.current({ workflowId: 'wf-1', inputs: {} });

    expect(response.workflowExecutionId).toBe('exec-xyz');
  });

  it('shows a warning toast when activityStatus is "failed"', async () => {
    mockRunCaseWorkflow.mockResolvedValueOnce({
      workflowExecutionId: 'exec-act-fail',
      activityStatus: 'failed',
    });

    const { result } = renderExecutorHook();
    await result.current({ workflowId: 'wf-1', inputs: {} });

    expect(mockToasts.addWarning).toHaveBeenCalledTimes(1);
  });

  it('does not show a warning toast when activityStatus is "succeeded"', async () => {
    mockRunCaseWorkflow.mockResolvedValueOnce({
      workflowExecutionId: 'exec-ok',
      activityStatus: 'succeeded',
    });

    const { result } = renderExecutorHook();
    await result.current({ workflowId: 'wf-1', inputs: {} });

    expect(mockToasts.addWarning).not.toHaveBeenCalled();
  });

  it('propagates errors thrown by the API', async () => {
    mockRunCaseWorkflow.mockRejectedValueOnce(new Error('network error'));

    const { result } = renderExecutorHook();

    await expect(result.current({ workflowId: 'wf-1', inputs: {} })).rejects.toThrow(
      'network error'
    );
  });
});
