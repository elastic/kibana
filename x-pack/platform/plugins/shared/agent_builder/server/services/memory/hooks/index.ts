/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type { RegisterMemoryBeforeAgentHookDeps } from './before_agent_hook';
export {
  registerMemoryBeforeAgentHook,
  runMemoryBeforeAgentHook,
  formatMemoryInjection,
  injectMemoryIntoMessage,
} from './before_agent_hook';

export type {
  RegisterMemoryAfterRoundHookDeps,
  AfterRoundExtractionContext,
} from './after_round_hook';
export {
  registerMemoryAfterRoundHook,
  runAfterRoundExtractionPipeline,
} from './after_round_hook';
