/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import React from 'react';
import { renderHook } from '@testing-library/react';
import { useCaseAttachmentWorkflowContext } from './case_attachment_workflow_context';
import { CaseAttachmentWorkflowProvider } from './case_attachment_workflow_provider';
import { useCanRunCaseWorkflow } from './use_run_case_workflow';

vi.mock('../../common/lib/kibana');
vi.mock('../case_view/use_on_refresh_case_view_page', () => {
      const mocked = {
      useRefreshCaseViewPage: () => vi.fn(),
    };
      return { ...mocked, default: mocked };
    });
vi.mock('./use_run_case_workflow', async () => {
      const mocked = {
      ...(await vi.importActual('./use_run_case_workflow')),
      useCanRunCaseWorkflow: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

const mockUseCanRunCaseWorkflow = vi.mocked(useCanRunCaseWorkflow);

describe('useCaseAttachmentWorkflowContext', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <CaseAttachmentWorkflowProvider caseId="case-1">{children}</CaseAttachmentWorkflowProvider>
  );

  beforeEach(() => {
    mockUseCanRunCaseWorkflow.mockReturnValue(true);
  });

  it('returns an outside status when rendered without a CaseAttachmentWorkflowProvider', () => {
    const { result } = renderHook(() => useCaseAttachmentWorkflowContext());
    expect(result.current).toEqual({ status: 'outside' });
  });

  it('returns the case id and an executor factory inside a CaseAttachmentWorkflowProvider', () => {
    const { result } = renderHook(() => useCaseAttachmentWorkflowContext(), { wrapper });
    expect(result.current).toEqual({
      status: 'available',
      caseId: 'case-1',
      createExecutor: expect.any(Function),
    });
  });

  it('returns an unavailable status inside the provider when the user cannot run workflows through Cases', () => {
    mockUseCanRunCaseWorkflow.mockReturnValue(false);
    const { result } = renderHook(() => useCaseAttachmentWorkflowContext(), { wrapper });
    expect(result.current).toEqual({ status: 'unavailable', caseId: 'case-1' });
  });
});
