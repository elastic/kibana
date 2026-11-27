/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializer, PluginInitializerContext } from '@kbn/core/server';
import type {
  ContextEnginePluginSetup,
  ContextEnginePluginStart,
  ContextEngineSetupDependencies,
  ContextEngineStartDependencies,
} from './types';

export type { ContextEnginePluginSetup, ContextEnginePluginStart } from './types';
export type {
  ForgetSessionMemoriesInput,
  RememberSessionMemoryInput,
  SaveSessionEventsInput,
  SessionMemoryClient,
} from './session_memory_client/client';
export { AiIndexNotFoundError } from './ai_indices/errors/ai_index_not_found_error';
export { AiIndexWriteForbiddenError } from './ai_indices/errors/ai_index_write_forbidden_error';
export {
  ContextEngineDisabledError,
  MemoryDisabledError,
  MemoryForbiddenError,
  RememberCapacityError,
  SessionMemoryNotFoundError,
} from './session_memory_client/errors';

export const plugin: PluginInitializer<
  ContextEnginePluginSetup,
  ContextEnginePluginStart,
  ContextEngineSetupDependencies,
  ContextEngineStartDependencies
> = async (pluginInitializerContext: PluginInitializerContext) => {
  const { ContextEnginePlugin } = await import('./plugin');
  return new ContextEnginePlugin(pluginInitializerContext);
};
