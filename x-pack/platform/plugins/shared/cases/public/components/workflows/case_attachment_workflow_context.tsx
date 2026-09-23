/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useMemo } from 'react';
import type { RunWorkflowExecutor } from '@kbn/workflows-ui';
import type { CaseWorkflowRunOrigin } from '../../../common/types/api';
import {
  createCasesWorkflowExecutor,
  useCasesWorkflowExecutorDeps,
} from './use_cases_workflow_executor';

/** Internal context value — not exported. Consumers use the exported hooks. */
interface CaseAttachmentWorkflowContextValue {
  caseId: string;
  /**
   * Builds a Cases-routed executor for this case. The executor's services are resolved here,
   * inside the Cases tree, so surfaces owned by other plugins can call it from their own tree.
   */
  createExecutor: (origin: CaseWorkflowRunOrigin) => RunWorkflowExecutor;
}

const CaseAttachmentWorkflowContext = createContext<CaseAttachmentWorkflowContextValue | undefined>(
  undefined
);

CaseAttachmentWorkflowContext.displayName = 'CaseAttachmentWorkflowContext';

interface CaseAttachmentWorkflowProviderProps {
  caseId: string;
  children: React.ReactNode;
}

/** Publishes the case id to all attachment-list children, enabling Cases-routed workflow runs. */
export const CaseAttachmentWorkflowProvider: React.FC<CaseAttachmentWorkflowProviderProps> = ({
  caseId,
  children,
}) => {
  const executorDeps = useCasesWorkflowExecutorDeps();
  const value = useMemo(
    (): CaseAttachmentWorkflowContextValue => ({
      caseId,
      createExecutor: (origin) => createCasesWorkflowExecutor(executorDeps, { caseId, origin }),
    }),
    [caseId, executorDeps]
  );
  return (
    <CaseAttachmentWorkflowContext.Provider value={value}>
      {children}
    </CaseAttachmentWorkflowContext.Provider>
  );
};

CaseAttachmentWorkflowProvider.displayName = 'CaseAttachmentWorkflowProvider';

/**
 * Reads the enclosing case context. Returns `undefined` outside a case attachment surface
 * — unlike `useCasesContext`, absence is a legitimate state (alerts page, flyout),
 * not a programming error, so this does not throw.
 */
export const useCaseAttachmentWorkflowContext = ():
  | CaseAttachmentWorkflowContextValue
  | undefined => useContext(CaseAttachmentWorkflowContext);
