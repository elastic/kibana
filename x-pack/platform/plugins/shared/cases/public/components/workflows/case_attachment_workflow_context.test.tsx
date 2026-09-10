/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook } from '@testing-library/react';
import {
  CaseAttachmentWorkflowProvider,
  useCaseAttachmentWorkflowContext,
} from './case_attachment_workflow_context';

describe('useCaseAttachmentWorkflowContext', () => {
  it('returns undefined when rendered outside a CaseAttachmentWorkflowProvider', () => {
    const { result } = renderHook(() => useCaseAttachmentWorkflowContext());
    expect(result.current).toBeUndefined();
  });

  it('returns the context value when rendered inside a CaseAttachmentWorkflowProvider', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <CaseAttachmentWorkflowProvider caseId="case-1">{children}</CaseAttachmentWorkflowProvider>
    );
    const { result } = renderHook(() => useCaseAttachmentWorkflowContext(), { wrapper });
    expect(result.current).toEqual({ caseId: 'case-1' });
  });
});
