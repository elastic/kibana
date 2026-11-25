/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { InternalStepsEditorHandlers } from './internal_steps/editor_handlers/editor_handlers';
import type { WorkflowsContext } from './types';
import { useKibana } from '../../hooks/use_kibana';

const WorkflowsContext = React.createContext<WorkflowsContext | undefined>(undefined);

export const WorkflowsContextProvider = React.memo<React.PropsWithChildren>(({ children }) => {
  const { services } = useKibana();

  const value = useMemo<WorkflowsContext>(
    () => ({
      internalStepsEditorHandlers: new InternalStepsEditorHandlers(services),
    }),
    [services]
  );

  return <WorkflowsContext.Provider value={value}>{children}</WorkflowsContext.Provider>;
});
WorkflowsContextProvider.displayName = 'WorkflowsContextProvider';

export const useWorkflowsContext = () => {
  const context = React.useContext(WorkflowsContext);
  if (!context) {
    throw new Error('WorkflowsContextProvider not found');
  }
  return context;
};
