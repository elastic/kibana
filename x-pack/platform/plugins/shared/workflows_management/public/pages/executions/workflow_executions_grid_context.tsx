/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext } from 'react';
import type { UseWorkflowExecutionsGridSelectionResult } from './use_workflow_executions_grid_selection';

const WorkflowExecutionsGridContext = createContext<
  UseWorkflowExecutionsGridSelectionResult | undefined
>(undefined);

export const WorkflowExecutionsGridProvider = ({
  children,
  value,
}: {
  children: React.ReactNode;
  value: UseWorkflowExecutionsGridSelectionResult;
}) => (
  <WorkflowExecutionsGridContext.Provider value={value}>
    {children}
  </WorkflowExecutionsGridContext.Provider>
);

export const useWorkflowExecutionsGridContext = (): UseWorkflowExecutionsGridSelectionResult => {
  const context = useContext(WorkflowExecutionsGridContext);

  if (!context) {
    throw new Error(
      'useWorkflowExecutionsGridContext must be used within WorkflowExecutionsGridProvider'
    );
  }

  return context;
};
