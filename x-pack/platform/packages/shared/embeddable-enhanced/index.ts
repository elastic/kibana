/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type { DynamicActionsSerializedState, EmbeddableDynamicActionsManager } from './src/types';
export type { HasDynamicActions } from './src/interfaces/has_dynamic_actions';
export { initializeEmbeddableDynamicActions } from './src/dynamic_actions_manager';
export { apiHasDynamicActions } from './src/interfaces/has_dynamic_actions';
