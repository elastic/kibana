/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DatasourceStates } from '@kbn/lens-common';

export type StateHydrationContext = 'editor' | 'expression';

export interface StateHydrationResult<T = unknown> {
  visualizationState: T;
  datasourceStates: DatasourceStates;
}

/**
 * Fills visualization and datasource state with information known at runtime.
 * Receives state that has already been type-guarded for this visualization.
 */
export type StateHydration<T> = (
  visualizationState: T,
  datasourceStates: DatasourceStates
) => StateHydrationResult<T>;
