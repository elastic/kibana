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
import { CaseAttachmentWorkflowProvider } from './case_attachment_workflow_provider';
import {
  useCaseAttachmentWorkflowRouting,
  useCaseAttachmentWorkflowRun,
} from './use_case_attachment_workflow_run';
import { useCanRunCaseWorkflow } from './use_run_case_workflow';
import * as api from './api';

jest.mock('../../common/lib/kibana');
const mockRefreshCaseViewPage = jest.fn();
jest.mock('../case_view/use_on_refresh_case_view_page', () => ({
  useRefreshCaseViewPage: () => mockRefreshCaseViewPage,
}));
jest.mock('./use_run_case_workflow', () => ({
  ...jest.requireActual('./use_run_case_workflow'),
  useCanRunCaseWorkflow: jest.fn(),
}));

jest.mock('../cases_context/use_cases_context', () => ({
  useCasesContext: () => ({ owner: ['securitySolution'] }),
}));

const mockUseCanRunCaseWorkflow = jest.mocked(useCanRunCaseWorkflow);
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
    mockUseCanRunCaseWorkflow.mockReturnValue(true);
    useHttp.mockReturnValue(mockHttp);
    useToasts.mockReturnValue(mockToasts);
    useAppUrl.mockReturnValue({ getAppUrl: mockGetAppUrl });
    useKibana.mockReturnValue({ services: { rendering: {} } });
    mockRunCaseWorkflow.mockResolvedValue({
      workflowExecutionId: 'exec-1',
      activityStatus: 'succeeded',
    });
  });

  it('falls back to the panel executor and toast outside the attachment provider', () => {
    const { result } = renderHook(() =>
      useCaseAttachmentWorkflowRun({
        attachmentType: 'security.alert',
        target: { attachmentId: 'alert-1' },
      })
    );

    expect(result.current).toEqual({
      runWorkflow: undefined,
      showSuccessToast: true,
      telemetry: undefined,
    });
  });

  it('falls back to the panel executor and toast when the user cannot run workflows through Cases', () => {
    mockUseCanRunCaseWorkflow.mockReturnValue(false);
    const { result } = renderHook(
      () =>
        useCaseAttachmentWorkflowRun({
          attachmentType: 'security.alert',
          target: { attachmentId: 'alert-1' },
        }),
      { wrapper }
    );

    expect(result.current).toEqual({
      runWorkflow: undefined,
      showSuccessToast: true,
      telemetry: undefined,
    });
  });

  it('suppresses the panel success toast when it returns a Cases executor', () => {
    const { result } = renderHook(
      () =>
        useCaseAttachmentWorkflowRun({
          attachmentType: 'security.alert',
          target: { attachmentId: 'alert-1' },
        }),
      { wrapper }
    );

    expect(result.current).toEqual({
      runWorkflow: expect.any(Function),
      showSuccessToast: false,
      telemetry: {
        origin: 'cases.attachment',
        attachmentType: 'security.alert',
        itemCount: 1,
        owner: 'securitySolution',
      },
    });
  });

  it('reports the attachment type and selection size for a bulk attachment run', () => {
    const { result } = renderHook(
      () =>
        useCaseAttachmentWorkflowRun({
          attachmentType: 'security.event',
          target: { attachmentIds: ['event-1', 'event-2'] },
        }),
      { wrapper }
    );

    expect(result.current.telemetry).toEqual({
      origin: 'cases.attachments',
      attachmentType: 'security.event',
      itemCount: 2,
      owner: 'securitySolution',
    });
  });

  describe('fallback telemetry', () => {
    const fallbackTelemetry = { origin: 'alert', itemCount: 1, owner: 'securitySolution' };

    it('reports the fallback telemetry outside the attachment provider', () => {
      const { result } = renderHook(() =>
        useCaseAttachmentWorkflowRun({
          attachmentType: 'security.alert',
          target: { attachmentId: 'alert-1' },
          fallbackTelemetry,
        })
      );

      expect(result.current.telemetry).toBe(fallbackTelemetry);
    });

    it('reports the fallback telemetry when the user cannot run workflows through Cases', () => {
      mockUseCanRunCaseWorkflow.mockReturnValue(false);
      const { result } = renderHook(
        () =>
          useCaseAttachmentWorkflowRun({
            attachmentType: 'security.alert',
            target: { attachmentId: 'alert-1' },
            fallbackTelemetry,
          }),
        { wrapper }
      );

      expect(result.current.telemetry).toBe(fallbackTelemetry);
    });

    it('reports the case attachment origin instead of the fallback telemetry inside a case', () => {
      const { result } = renderHook(
        () =>
          useCaseAttachmentWorkflowRun({
            attachmentType: 'security.alert',
            target: { attachmentId: 'alert-1' },
            fallbackTelemetry,
          }),
        { wrapper }
      );

      expect(result.current.telemetry).toEqual({
        origin: 'cases.attachment',
        attachmentType: 'security.alert',
        itemCount: 1,
        owner: 'securitySolution',
      });
    });
  });

  it('posts a singular attachment origin', async () => {
    const { result } = renderHook(
      () =>
        useCaseAttachmentWorkflowRun({
          attachmentType: 'security.alert',
          target: { attachmentId: 'alert-1' },
        }),
      { wrapper }
    );

    await act(async () => {
      await result.current.runWorkflow?.({ workflowId: 'workflow-1', inputs: {} });
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
          target: { attachmentIds: ['alert-1'] },
        }),
      { wrapper }
    );

    await act(async () => {
      await result.current.runWorkflow?.({ workflowId: 'workflow-1', inputs: {} });
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
          target: { attachmentId: 'alert-1' },
        }),
      { wrapper }
    );

    await act(async () => {
      await result.current.runWorkflow?.({ workflowId: 'workflow-1', inputs: {} });
    });

    expect(mockGetAppUrl).toHaveBeenCalledWith({
      path: '/workflow-1?tab=executions&executionId=exec-1',
    });
    expect(mockToasts.addSuccess).toHaveBeenCalledWith(
      expect.objectContaining({ text: expect.anything() })
    );
    expect(mockToasts.addWarning).not.toHaveBeenCalled();
    expect(mockRefreshCaseViewPage).toHaveBeenCalledTimes(1);
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
          target: { attachmentIds: ['alert-1', 'alert-2'] },
        }),
      { wrapper }
    );

    await act(async () => {
      await result.current.runWorkflow?.({ workflowId: 'workflow-1', inputs: {} });
    });

    expect(mockToasts.addWarning).toHaveBeenCalledTimes(1);
    expect(mockToasts.addSuccess).not.toHaveBeenCalled();
    expect(mockRefreshCaseViewPage).toHaveBeenCalledTimes(1);
  });
});

describe('useCaseAttachmentWorkflowRouting', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <CaseAttachmentWorkflowProvider caseId="case-1">{children}</CaseAttachmentWorkflowProvider>
  );

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCanRunCaseWorkflow.mockReturnValue(true);
  });

  it('reports outside routing without the attachment provider', () => {
    const { result } = renderHook(() => useCaseAttachmentWorkflowRouting());
    expect(result.current).toBe('outside');
  });

  it('reports available routing when the user can run workflows through Cases', () => {
    const { result } = renderHook(() => useCaseAttachmentWorkflowRouting(), { wrapper });
    expect(result.current).toBe('available');
  });

  it('reports unavailable routing when the user cannot run workflows through Cases', () => {
    mockUseCanRunCaseWorkflow.mockReturnValue(false);
    const { result } = renderHook(() => useCaseAttachmentWorkflowRouting(), { wrapper });
    expect(result.current).toBe('unavailable');
  });
});
