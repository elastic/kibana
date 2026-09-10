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

const mockRunCaseWorkflow = jest.spyOn(api, 'runCaseWorkflow');

describe('useCaseAttachmentWorkflowRun', () => {
  const mockHttp = {} as HttpStart;
  const mockToasts = notificationServiceMock.createStartContract().toasts;
  const { useHttp, useToasts } = jest.requireMock('../../common/lib/kibana');
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <CaseAttachmentWorkflowProvider caseId="case-1">{children}</CaseAttachmentWorkflowProvider>
  );

  beforeEach(() => {
    jest.clearAllMocks();
    useHttp.mockReturnValue(mockHttp);
    useToasts.mockReturnValue(mockToasts);
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
});
