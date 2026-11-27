/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EnhancedStore } from 'redux-toolkit-v1';
import type { WorkflowDetailState } from './workflow_detail/types';

export interface RootState {
  detail: WorkflowDetailState;
}

export type WorkflowsStore = EnhancedStore<RootState>;
export type AppDispatch = WorkflowsStore['dispatch'];
