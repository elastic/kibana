/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type {
  ProactiveContext,
  ProactiveRagConfig,
  ProactiveRagSession,
  ExtractedContext,
  MemoryFinding,
  OnContextReadyFn,
  ProactiveRagSessionParams,
} from './types';

export type { ProactiveRagService } from './proactive_rag_service';

export { createProactiveRagService, formatProactiveContext } from './proactive_rag_service';
export { createProactiveRagSession } from './proactive_rag_session';
export { extractContext, extractContextFromActions, buildSearchQuery } from './context_extractor';
export { searchMemory } from './memory_search_agent';
