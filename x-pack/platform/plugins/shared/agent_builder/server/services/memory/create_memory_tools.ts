/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import type { MemoryService } from './memory_service';
import { MemorySessionManager } from './memory_session_manager';
import {
  createCheckpointTool,
  createRememberTool,
  createReinforceTool,
} from './tools';

/**
 * Options for creating memory tools.
 */
export interface MemoryToolsOptions {
  /** Lazy getter for the memory service (resolved at handler invocation time). */
  getMemoryService: () => MemoryService;
}

/**
 * Creates all memory system tools with a shared MemorySessionManager.
 *
 * Each tool is wired to a shared session manager that maintains per-round
 * ActiveMemorySet instances keyed by runId from the tool handler context.
 * This ensures all three tools (checkpoint, remember, reinforce) share state
 * within the same agent execution round.
 */
export const createMemoryTools = (
  options: MemoryToolsOptions
): Array<BuiltinToolDefinition<any>> => {
  const sessionManager = new MemorySessionManager();
  const { getMemoryService } = options;

  const checkpoint = createCheckpointTool({
    getMemoryService,
    getActiveMemorySet: () => {
      // This getter is overridden below to use the session manager.
      // The tools are wrapped so the real active set is resolved per-call.
      throw new Error('getActiveMemorySet must be resolved per-call');
    },
  });

  const remember = createRememberTool({
    getMemoryService,
    getActiveMemorySet: () => {
      throw new Error('getActiveMemorySet must be resolved per-call');
    },
  });

  const reinforce = createReinforceTool({
    getActiveMemorySet: () => {
      throw new Error('getActiveMemorySet must be resolved per-call');
    },
  });

  // Wrap each tool handler to inject the per-run ActiveMemorySet via the session manager.

  const checkpointWithSession: BuiltinToolDefinition<any> = {
    ...checkpoint,
    handler: async (params, context) => {
      const activeSet = sessionManager.getOrCreate(context.runContext.runId);
      const tool = createCheckpointTool({
        getMemoryService,
        getActiveMemorySet: () => activeSet,
      });
      return tool.handler(params, context);
    },
  };

  const rememberWithSession: BuiltinToolDefinition<any> = {
    ...remember,
    handler: async (params, context) => {
      const activeSet = sessionManager.getOrCreate(context.runContext.runId);
      const tool = createRememberTool({
        getMemoryService,
        getActiveMemorySet: () => activeSet,
      });
      return tool.handler(params, context);
    },
  };

  const reinforceWithSession: BuiltinToolDefinition<any> = {
    ...reinforce,
    handler: async (params, context) => {
      const activeSet = sessionManager.getOrCreate(context.runContext.runId);
      const tool = createReinforceTool({
        getActiveMemorySet: () => activeSet,
      });
      return tool.handler(params, context);
    },
  };

  return [checkpointWithSession, rememberWithSession, reinforceWithSession];
};
