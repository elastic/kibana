/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StructuredTool } from '@langchain/core/tools';
import type { BrowserApiToolMetadata, ToolOrigin, ToolType } from '@kbn/agent-builder-common';
import type { Logger } from '@kbn/logging';
import type { ToolReturnSummarizerFn } from '../tools/builtin';
import type { AgentEventEmitterFn, ExecutableTool } from '..';

export type ToolName = string;

export type ExecutableToolWithOrigin = ExecutableTool & { origin: ToolOrigin };
export type BrowserToolWithOrigin = BrowserApiToolMetadata & { origin: ToolOrigin };

export enum ToolManagerToolType {
  executable = 'executable',
  browser = 'browser',
  /** Reachable only through the `execute_dynamic_tool` meta-tool; never bound to the model. */
  dynamic = 'dynamic',
}

export interface ExecutableToolInput {
  type: ToolManagerToolType.executable;
  tools: ExecutableToolWithOrigin | ExecutableToolWithOrigin[];
  logger: Logger;
}

export interface BrowserToolInput {
  type: ToolManagerToolType.browser;
  tools: BrowserToolWithOrigin | BrowserToolWithOrigin[];
}

/** What provides a dynamic tool: the active attachments, or the skills the agent loaded. */
export type DynamicToolSource = 'attachments' | 'skills';

/** A registered dynamic tool, with the source that registered it last. */
export type DynamicTool = ExecutableToolWithOrigin & { source?: DynamicToolSource };

/**
 * Tools reachable only through the `execute_dynamic_tool` meta-tool. They are not bound to the
 * model, so `list()` does not include them; their definitions are written into the transcript
 * instead.
 */
export interface DynamicToolInput {
  type: ToolManagerToolType.dynamic;
  /** The source providing the tools; it owns their ids until another source registers them. */
  source: DynamicToolSource;
  tools: ExecutableToolWithOrigin | ExecutableToolWithOrigin[];
  logger?: Logger;
}

/** The dynamic tools a source provides now, replacing the ones it provided before. */
export interface SyncDynamicToolsInput {
  source: DynamicToolSource;
  tools: ExecutableToolWithOrigin[];
  logger?: Logger;
}

export type AddToolInput = ExecutableToolInput | BrowserToolInput | DynamicToolInput;

/**
 * Interface for managing tools in the agent system.
 * Natively bound tools are fixed for the run; dynamic tools are reachable only through the
 * `execute_dynamic_tool` meta-tool, so adding one leaves the bound tool list unchanged.
 */
export interface ToolManager {
  /**
   * Sets the event emitter to use for all tools added to this manager.
   * Should be called once per run before adding tools.
   */
  setEventEmitter(eventEmitter: AgentEventEmitterFn): void;

  /**
   * Sets the token budget used by the tool-result length guardrail for tools that
   * don't define their own `maxResultTokens` override.
   * Should be called once per run before adding tools (else will use default value);
   */
  setMaxToolResultTokens(maxTokens: number): void;

  /**
   * Adds tools to the tool manager.
   * Supports executable tools, browser API tools and dynamic tools. A dynamic tool is reachable
   * only through the `execute_dynamic_tool` meta-tool: adding an id again replaces the previous
   * entry, whichever source registered it, and ids already bound natively are skipped, as the
   * model calls those directly. Use `getDynamicTool` to tell which ids landed in the registry.
   * @param input - The tool input configuration (executable, browser or dynamic)
   */
  addTools(input: AddToolInput): Promise<void>;

  /**
   * Makes the dynamic tools of a source the given ones: registers them as `addTools` does, and
   * removes the ones the source registered before and no longer provides. Tools of other sources
   * stay. An id another source registered since is no longer the source's to remove; an id the
   * source took over from another one is removed with the rest, not handed back.
   */
  syncDynamicTools(input: SyncDynamicToolsInput): void;

  /**
   * Removes tools added with a `DynamicToolInput`, so they are no longer reachable through
   * `execute_dynamic_tool` nor persisted. Natively bound and unknown ids are ignored.
   * @param toolIds - The internal ids of the dynamic tools to remove
   */
  removeDynamicTools(toolIds: string[]): void;

  /**
   * Lists the tools bound to the model (not the dynamic tools).
   * @returns an array of the natively bound tools
   */
  list(): StructuredTool[];

  /**
   * Gets the tool id mapping.
   * Maps LangChain tool names to internal tool IDs.
   * @returns the tool id mapping
   */
  getToolIdMapping(): Map<string, string>;

  getToolMeta(toolId: string): { origin: ToolOrigin | undefined; type: ToolType | undefined };

  /**
   * Returns the resolved executable tool for the given internal id, or `undefined`
   * if no such tool was registered for this run. Use with `Runner.runInternalTool`
   * to dispatch a tool from outside the LangChain graph (e.g. `exec_tool` in bash)
   * while still going through the standard hooks/telemetry pipeline.
   * Resolves natively bound tools first, then tools added with a `DynamicToolInput`.
   */
  getExecutable(toolId: string): ExecutableTool | undefined;

  /**
   * Whether a tool was added under the given internal id with an `executable` input, so is bound
   * natively: the model calls it directly. False for dynamic tools and unknown ids.
   */
  hasExecutableTool(toolId: string): boolean;

  /**
   * Gets the internal tool IDs of the dynamic tools, for persistence.
   * @returns array of internal tool IDs
   */
  getDynamicToolIds(): string[];

  /**
   * Returns a tool added with a `dynamic` input, or `undefined` for natively bound and unknown
   * ids.
   */
  getDynamicTool(toolId: string): DynamicTool | undefined;

  /**
   * Whether a tool added with a `dynamic` input is registered under the given internal id. False
   * for natively bound and unknown ids.
   */
  hasDynamicTool(toolId: string): boolean;

  /**
   * Lists the tools added with a `dynamic` input.
   */
  listDynamicTools(): DynamicTool[];

  /**
   * Gets the summarizer function for a tool by its internal tool ID.
   * Returns undefined if the tool is not found or has no summarizer.
   */
  getSummarizer(toolId: string): ToolReturnSummarizerFn | undefined;
}
