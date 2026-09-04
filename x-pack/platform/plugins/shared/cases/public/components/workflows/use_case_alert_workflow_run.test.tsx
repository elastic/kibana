/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, act } from '@testing-library/react';
import type { HttpStart } from '@kbn/core/public';
import { notificationServiceMock } from '@kbn/core/public/mocks';
import { CaseAttachmentWorkflowProvider } from './case_attachment_workflow_context';
import { useCaseAlertWorkflowRun } from './use_case_alert_workflow_run';
import * as api from './api';
import {
  ALERT_WORKFLOW_ORIGIN_TYPE,
  ALERTS_WORKFLOW_ORIGIN_TYPE,
} from '../../../common/types/domain/user_action/workflow/constants';

jest.mock('../../common/lib/kibana');

const mockRunCaseWorkflow = jest.spyOn(api, 'runCaseWorkflow');

describe('useCaseAlertWorkflowRun', () => {
  const mockHttp = {} as HttpStart;
  const mockToasts = notificationServiceMock.createStartContract().toasts;
  const { useHttp, useToasts } = jest.requireMock('../../common/lib/kibana');

  beforeEach(() => {
    jest.clearAllMocks();
    useHttp.mockReturnValue(mockHttp);
    useToasts.mockReturnValue(mockToasts);
    mockRunCaseWorkflow.mockResolvedValue({
      workflowExecutionId: 'exec-1',
      activityStatus: 'succeeded',
    } as unknown as Awaited<ReturnType<typeof api.runCaseWorkflow>>);
  });

  it('returns undefined when rendered outside a CaseAttachmentWorkflowProvider', () => {
    const { result } = renderHook(() => useCaseAlertWorkflowRun({}));
    expect(result.current).toBeUndefined();
  });

  it('returns an executor function when rendered inside a CaseAttachmentWorkflowProvider', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <CaseAttachmentWorkflowProvider caseId="case-1">{children}</CaseAttachmentWorkflowProvider>
    );
    const { result } = renderHook(() => useCaseAlertWorkflowRun({}), { wrapper });
    expect(typeof result.current).toBe('function');
  });

  it('posts a cases.alert origin when alertId is provided', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <CaseAttachmentWorkflowProvider caseId="case-1">{children}</CaseAttachmentWorkflowProvider>
    );
    const { result } = renderHook(() => useCaseAlertWorkflowRun({ alertId: 'alert-42' }), {
      wrapper,
    });

    await act(async () => {
      await result.current!({ workflowId: 'wf-1', inputs: {} });
    });

    expect(mockRunCaseWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({
        workflowId: 'wf-1',
        body: expect.objectContaining({
          caseIds: ['case-1'],
          origin: { type: ALERT_WORKFLOW_ORIGIN_TYPE, caseId: 'case-1', alertId: 'alert-42' },
        }),
      })
    );
  });

  it('posts a cases.alerts origin when alertId is absent (bulk selection)', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <CaseAttachmentWorkflowProvider caseId="case-1">{children}</CaseAttachmentWorkflowProvider>
    );
    const { result } = renderHook(() => useCaseAlertWorkflowRun({}), { wrapper });

    await act(async () => {
      await result.current!({ workflowId: 'wf-1', inputs: {} });
    });

    expect(mockRunCaseWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          origin: { type: ALERTS_WORKFLOW_ORIGIN_TYPE, caseId: 'case-1' },
        }),
      })
    );
  });

  it('fires a warning toast on activityStatus: failed but still resolves with the execution id', async () => {
    const addWarning = jest.fn();
    useToasts.mockReturnValue({ ...mockToasts, addWarning });
    mockRunCaseWorkflow.mockResolvedValue({
      workflowExecutionId: 'exec-failed',
      activityStatus: 'failed',
    } as unknown as Awaited<ReturnType<typeof api.runCaseWorkflow>>);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <CaseAttachmentWorkflowProvider caseId="case-1">{children}</CaseAttachmentWorkflowProvider>
    );
    const { result } = renderHook(() => useCaseAlertWorkflowRun({}), { wrapper });

    let resolved: { workflowExecutionId: string } | undefined;
    await act(async () => {
      resolved = await result.current!({ workflowId: 'wf-1', inputs: {} });
    });

    expect(addWarning).toHaveBeenCalledTimes(1);
    expect(resolved).toEqual({ workflowExecutionId: 'exec-failed' });
  });
});
