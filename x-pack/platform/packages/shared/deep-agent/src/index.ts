/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Deep Agents TypeScript Implementation
 *
 * A TypeScript port of the Python Deep Agents library for building controllable AI agents with LangGraph.
 * This implementation maintains 1:1 compatibility with the Python version.
 */

export { createDeepAgent, type CreateDeepAgentParams } from './agent';

// Export state schema
export { AgentStateSchema, type FileData as FileDataType } from './state_schema';

// Export middleware
export {
  createFilesystemMiddleware,
  createSubAgentMiddleware,
  createPatchToolCallsMiddleware,
  createSkillsMiddleware,
  type FilesystemMiddlewareOptions,
  type SubAgentMiddlewareOptions,
  type SubAgent,
  type FileData,
} from './middleware';

// Export backends
export {
  StateBackend,
  StoreBackend,
  FilesystemBackend,
  CompositeBackend,
  type BackendProtocol,
  type BackendFactory,
  type FileInfo,
  type GrepMatch,
  type WriteResult,
  type EditResult,
} from './backends';
