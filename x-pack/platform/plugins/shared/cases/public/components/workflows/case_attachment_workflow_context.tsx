/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useMemo } from 'react';

/** Internal context value — not exported. Consumers use the exported hooks. */
interface CaseAttachmentWorkflowContextValue {
  caseId: string;
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
  const value = useMemo((): CaseAttachmentWorkflowContextValue => ({ caseId }), [caseId]);
  return (
    <CaseAttachmentWorkflowContext.Provider value={value}>
      {children}
    </CaseAttachmentWorkflowContext.Provider>
  );
};

CaseAttachmentWorkflowProvider.displayName = 'CaseAttachmentWorkflowProvider';

/**
 * Reads the enclosing case id. Returns `undefined` outside a case attachment surface
 * — unlike `useCasesContext`, absence is a legitimate state (alerts page, flyout),
 * not a programming error, so this does not throw.
 */
export const useCaseAttachmentWorkflowContext = ():
  | CaseAttachmentWorkflowContextValue
  | undefined => useContext(CaseAttachmentWorkflowContext);
