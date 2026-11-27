/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { configureStore } from 'redux-toolkit-v1';
import { workflowDetailMiddleware } from './workflow_detail/middleware';
import { ignoredActions, ignoredPaths, workflowDetailReducer } from './workflow_detail/slice';
import type { WorkflowsServices } from '../../../types';

// Store factory
export const createWorkflowsStore = (services: WorkflowsServices) => {
  return configureStore({
    reducer: {
      detail: workflowDetailReducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        thunk: { extraArgument: { services } },
        serializableCheck: {
          // Ignore these non-serializable fields in the state
          ignoredPaths,
          // Ignore these specific action types that contain non-serializable data
          ignoredActions,
        },
      }).concat(workflowDetailMiddleware),
  });
};

export type AppDispatch = ReturnType<typeof createWorkflowsStore>['dispatch'];
