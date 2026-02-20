/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StructuredTool } from '@langchain/core/tools';
import type { BrowserApiToolMetadata } from '@kbn/agent-builder-common';
import type { Logger } from '@kbn/logging';
import type { AgentEventEmitterFn, ExecutableTool } from '..';

export interface ToolManagerParams {
  dynamicToolCapacity: number;
}

export type ToolName = string;

export interface AddToolOptions {
  dynamic?: boolean;
}

export enum ToolManagerToolType {
  executable = 'executable',
  browser = 'browser',
}

export interface ExecutableToolInput {
  type: ToolManagerToolType.executable;
  tools: ExecutableTool | ExecutableTool[];
  logger: Logger;
}

export interface BrowserToolInput {
  type: ToolManagerToolType.browser;
  tools: BrowserApiToolMetadata | BrowserApiToolMetadata[];
}

export type AddToolInput = ExecutableToolInput | BrowserToolInput;

/**
 * Interface for managing tools in the agent system.
 * Handles both static and dynamic tools with LRU eviction for dynamic tools.
 */
export interface ToolManager {
  /**
   * Sets the event emitter to use for all tools added to this manager.
   * Should be called once per run before adding tools.
   */
  setEventEmitter(eventEmitter: AgentEventEmitterFn): void;

  /**
   * Adds tools to the tool manager.
   * Supports both executable tools and browser API tools.
   * @param input - The tool input configuration (executable or browser)
   * @param options - Optional configuration for tool storage (static vs dynamic)
   */
  addTools(input: AddToolInput, options?: AddToolOptions): Promise<void>;

  /**
   * Lists all tools in the tool manager.
   * @returns an array of all tools (static and dynamic)
   */
  list(): StructuredTool[];

  /**
   * Records the use of a tool, marking it as recently used.
   * This affects LRU eviction for dynamic tools.
   * @param name - the name of the tool to record usage for
   */
  recordToolUse(langchainToolName: ToolName): void;

  /**
   * Gets the tool id mapping.
   * Maps LangChain tool names to internal tool IDs.
   * @returns the tool id mapping
   */
  getToolIdMapping(): Map<string, string>;

  /**
   * Gets the internal tool IDs of all dynamic tools currently in the tool manager.
   * Returns internal tool IDs (not LangChain names) for persistence.
   * @returns array of internal tool IDs
   */
  getDynamicToolIds(): string[];
}
