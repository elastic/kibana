/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  CaseAttachmentWorkflowContext,
  type CaseAttachmentWorkflowContextValue,
} from './case_attachment_workflow_context';
import {
  createCasesWorkflowExecutor,
  useCasesWorkflowExecutorDeps,
} from './use_cases_workflow_executor';
import { useCanRunCaseWorkflow } from './use_run_case_workflow';

interface CaseAttachmentWorkflowProviderProps {
  caseId: string;
  children: React.ReactNode;
}

/**
 * Enables Cases-routed workflow runs for attachment-list children. Publishes `status: 'unavailable'`
 * when the user cannot run workflows through Cases (feature disabled or no case update privilege),
 * so attachment surfaces can hide their run action instead of running outside the case.
 */
export const CaseAttachmentWorkflowProvider: React.FC<CaseAttachmentWorkflowProviderProps> = ({
  caseId,
  children,
}) => {
  const canRunWorkflow = useCanRunCaseWorkflow();
  const executorDeps = useCasesWorkflowExecutorDeps();
  const value = useMemo(
    (): CaseAttachmentWorkflowContextValue =>
      canRunWorkflow
        ? {
            status: 'available',
            caseId,
            createExecutor: (origin) =>
              createCasesWorkflowExecutor(executorDeps, { caseId, origin }),
          }
        : { status: 'unavailable', caseId },
    [canRunWorkflow, caseId, executorDeps]
  );
  return (
    <CaseAttachmentWorkflowContext.Provider value={value}>
      {children}
    </CaseAttachmentWorkflowContext.Provider>
  );
};

CaseAttachmentWorkflowProvider.displayName = 'CaseAttachmentWorkflowProvider';
