/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, renderHook } from '@testing-library/react';
import type { HttpStart } from '@kbn/core/public';
import { notificationServiceMock } from '@kbn/core/public/mocks';
import { CaseAttachmentWorkflowProvider } from './case_attachment_workflow_context';
import { useCaseAttachmentWorkflowRun } from './use_case_attachment_workflow_run';
import * as api from './api';

jest.mock('../../common/lib/kibana');
const mockRefreshCaseViewPage = jest.fn();
jest.mock('../case_view/use_on_refresh_case_view_page', () => ({
  useRefreshCaseViewPage: () => mockRefreshCaseViewPage,
}));
const mockReportWorkflowRunTriggered = jest.fn();
jest.mock('../../analytics/use_workflow_run_ebt', () => ({
  useWorkflowRunTriggeredEBT: () => mockReportWorkflowRunTriggered,
  getWorkflowRunOriginType: jest.requireActual('../../analytics/use_workflow_run_ebt')
    .getWorkflowRunOriginType,
}));

const mockRunCaseWorkflow = jest.spyOn(api, 'runCaseWorkflow');

describe('useCaseAttachmentWorkflowRun', () => {
  const mockHttp = {} as HttpStart;
  const mockToasts = notificationServiceMock.createStartContract().toasts;
  const mockGetAppUrl = jest
    .fn()
    .mockReturnValue('/app/workflows/workflow-1?tab=executions&executionId=exec-1');
  const { useAppUrl, useHttp, useKibana, useToasts } = jest.requireMock('../../common/lib/kibana');
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <CaseAttachmentWorkflowProvider caseId="case-1">{children}</CaseAttachmentWorkflowProvider>
  );

  beforeEach(() => {
    jest.clearAllMocks();
    useHttp.mockReturnValue(mockHttp);
    useToasts.mockReturnValue(mockToasts);
    useAppUrl.mockReturnValue({ getAppUrl: mockGetAppUrl });
    useKibana.mockReturnValue({ services: { rendering: {} } });
    mockRunCaseWorkflow.mockResolvedValue({
      workflowExecutionId: 'exec-1',
      activityStatus: 'succeeded',
    });
  });

  it('returns undefined outside the attachment provider', () => {
    const { result } = renderHook(() =>
      useCaseAttachmentWorkflowRun({
        attachmentType: 'security.alert',
        attachmentId: 'alert-1',
      })
    );

    expect(result.current).toBeUndefined();
  });

  it('returns undefined without a row or bulk target', () => {
    const { result } = renderHook(
      () => useCaseAttachmentWorkflowRun({ attachmentType: 'security.alert' }),
      { wrapper }
    );

    expect(result.current).toBeUndefined();
  });

  it('posts a singular attachment origin', async () => {
    const { result } = renderHook(
      () =>
        useCaseAttachmentWorkflowRun({
          attachmentType: 'security.alert',
          attachmentId: 'alert-1',
        }),
      { wrapper }
    );

    await act(async () => {
      await result.current?.({ workflowId: 'workflow-1', inputs: {} });
    });

    expect(mockRunCaseWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          origin: {
            type: 'cases.attachment',
            caseId: 'case-1',
            attachmentType: 'security.alert',
            attachmentId: 'alert-1',
          },
        }),
      })
    );
  });

  it('posts a plural attachment origin for a bulk selection of one', async () => {
    const { result } = renderHook(
      () =>
        useCaseAttachmentWorkflowRun({
          attachmentType: 'security.alert',
          attachmentIds: ['alert-1'],
        }),
      { wrapper }
    );

    await act(async () => {
      await result.current?.({ workflowId: 'workflow-1', inputs: {} });
    });

    expect(mockRunCaseWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          origin: {
            type: 'cases.attachments',
            caseId: 'case-1',
            attachmentType: 'security.alert',
            attachmentIds: ['alert-1'],
          },
        }),
      })
    );
  });

  it('owns the success toast with an execution link and refreshes the case view', async () => {
    const { result } = renderHook(
      () =>
        useCaseAttachmentWorkflowRun({
          attachmentType: 'security.alert',
          attachmentId: 'alert-1',
        }),
      { wrapper }
    );

    await act(async () => {
      await result.current?.({ workflowId: 'workflow-1', inputs: {} });
    });

    expect(mockGetAppUrl).toHaveBeenCalledWith({
      path: '/workflow-1?tab=executions&executionId=exec-1',
    });
    expect(mockToasts.addSuccess).toHaveBeenCalledWith(
      expect.objectContaining({ text: expect.anything() })
    );
    expect(mockToasts.addWarning).not.toHaveBeenCalled();
    expect(mockRefreshCaseViewPage).toHaveBeenCalledTimes(1);
    expect(mockReportWorkflowRunTriggered).toHaveBeenCalledWith({
      originType: 'cases.attachment',
      caseCount: 1,
    });
  });

  it('shows only the activity warning toast when the activity write fails', async () => {
    mockRunCaseWorkflow.mockResolvedValueOnce({
      workflowExecutionId: 'exec-1',
      activityStatus: 'failed',
    });
    const { result } = renderHook(
      () =>
        useCaseAttachmentWorkflowRun({
          attachmentType: 'security.alert',
          attachmentIds: ['alert-1', 'alert-2'],
        }),
      { wrapper }
    );

    await act(async () => {
      await result.current?.({ workflowId: 'workflow-1', inputs: {} });
    });

    expect(mockToasts.addWarning).toHaveBeenCalledTimes(1);
    expect(mockToasts.addSuccess).not.toHaveBeenCalled();
    expect(mockRefreshCaseViewPage).toHaveBeenCalledTimes(1);
  });
});
