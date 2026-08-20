/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import { useHttp, useToasts } from '../../common/lib/kibana';
import { runCaseWorkflow } from './api';
import { useCasesWorkflowExecutor } from './use_cases_workflow_executor';
import * as i18n from './translations';

jest.mock('../../common/lib/kibana');
jest.mock('./api');

const mockUseHttp = jest.mocked(useHttp);
const mockUseToasts = jest.mocked(useToasts);
const mockRunCaseWorkflow = jest.mocked(runCaseWorkflow);

describe('useCasesWorkflowExecutor', () => {
  const http = {} as ReturnType<typeof useHttp>;
  const addWarning = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseHttp.mockReturnValue(http);
    mockUseToasts.mockReturnValue({ addWarning } as unknown as ReturnType<typeof useToasts>);
  });

  it('runs through the Cases wrapper and returns the execution id', async () => {
    mockRunCaseWorkflow.mockResolvedValue({
      workflowExecutionId: 'execution-1',
      activityStatus: 'succeeded',
    });
    const { result, rerender } = renderHook(() =>
      useCasesWorkflowExecutor({
        caseId: 'case-1',
        origin: { type: 'cases.case', id: 'case-1' },
      })
    );
    const firstExecutor = result.current;

    rerender();
    expect(result.current).toBe(firstExecutor);

    await expect(
      result.current({ workflowId: 'workflow-1', inputs: { event: { caseId: 'case-1' } } })
    ).resolves.toEqual({ workflowExecutionId: 'execution-1' });
    expect(mockRunCaseWorkflow).toHaveBeenCalledWith({
      http,
      caseId: 'case-1',
      workflowId: 'workflow-1',
      body: {
        inputs: { event: { caseId: 'case-1' } },
        origin: { type: 'cases.case', id: 'case-1' },
      },
    });
  });

  it('warns without rejecting when the activity write fails', async () => {
    mockRunCaseWorkflow.mockResolvedValue({
      workflowExecutionId: 'execution-1',
      activityStatus: 'failed',
    });
    const { result } = renderHook(() =>
      useCasesWorkflowExecutor({
        caseId: 'case-1',
        origin: { type: 'cases.case', id: 'case-1' },
      })
    );

    await act(async () => {
      await expect(result.current({ workflowId: 'workflow-1', inputs: {} })).resolves.toEqual({
        workflowExecutionId: 'execution-1',
      });
    });
    expect(addWarning).toHaveBeenCalledWith({ title: i18n.WORKFLOW_ACTIVITY_FAILED });
  });
});
