/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { Provider } from 'react-redux-v7';
import { createWorkflowsStore } from './store';
import { useKibana } from '../../../hooks/use_kibana';
import type { WorkflowsPublicPluginStart } from '../../../types';

/**
 * Provides a workflow detail Redux store context to child components.
 * Creates a new store instance for each provider instance, ensuring isolation.
 */
export function WorkflowDetailStoreProvider({ children }: React.PropsWithChildren) {
  const { services } = useKibana(); // Services are pre-wired in the Kibana services context, they never change.
  // Services should include workflowsManagement (added in createWorkflowsStartServices)
  // Cast to include workflowsManagement for proper type checking
  const servicesWithWorkflowsManagement = services as typeof services & {
    workflowsManagement?: WorkflowsPublicPluginStart;
  };
  const workflowsStore = useMemo(
    () => createWorkflowsStore(servicesWithWorkflowsManagement),
    [servicesWithWorkflowsManagement]
  );

  return <Provider store={workflowsStore}>{children}</Provider>;
}
