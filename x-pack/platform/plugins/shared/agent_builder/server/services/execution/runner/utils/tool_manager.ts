/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StructuredTool } from '@langchain/core/tools';
import {
  createToolIdMappings,
  sanitizeToolId,
  toolToLangchain,
} from '@kbn/agent-builder-genai-utils/langchain';
import { reverseMap } from '@kbn/agent-builder-genai-utils/langchain/tools';
import type { ToolOrigin, ToolType } from '@kbn/agent-builder-common';
import type { AgentEventEmitterFn, ExecutableTool } from '@kbn/agent-builder-server';
import type { ToolReturnSummarizerFn } from '@kbn/agent-builder-server/tools/builtin';
import type {
  ToolManager as IToolManager,
  ToolName,
  AddToolInput,
  ExecutableToolInput,
  BrowserToolInput,
  DynamicTool,
  DynamicToolInput,
  SyncDynamicToolsInput,
} from '@kbn/agent-builder-server/runner/tool_manager';
import { ToolManagerToolType } from '@kbn/agent-builder-server/runner/tool_manager';
import { browserToolsToLangchain } from '../../../tools/browser_tool_adapter';
import {
  buildGuardedToolContent,
  DEFAULT_MAX_TOOL_RESULT_TOKENS,
} from '../../run_agent/utils/tool_result_guardrail';
import { DynamicToolRegistry } from './dynamic_tool_registry';

/** What an input converts to before `addTools` binds it: the LangChain tools and their id mapping. */
interface ConvertedTools {
  langchainTools: StructuredTool[];
  /** LangChain tool name → internal tool id */
  idMappings: Map<string, string>;
}

export const createToolManager = (): ToolManager => {
  return new ToolManager();
};

/**
 * ToolManager is a class that manages tools for the agent.
 *
 * Natively bound tools are fixed for the run, so the bound tool list (and with it the prompt cache
 * prefix) does not change mid-run. Tools that become available during a conversation (a skill's
 * tools, an attachment's bound tools) are dynamic tools: never bound to the model, only reachable
 * through the `execute_dynamic_tool` meta-tool (see `DynamicToolRegistry`).
 */
export class ToolManager implements IToolManager {
  private staticTools: Map<ToolName, StructuredTool> = new Map<ToolName, StructuredTool>();
  private toolIdMappings: Map<string, string> = new Map<string, string>();
  private toolOrigins: Map<string, ToolOrigin> = new Map<string, ToolOrigin>();
  private toolTypes: Map<string, ToolType> = new Map<string, ToolType>();
  private executableTools: Map<string, ExecutableTool> = new Map<string, ExecutableTool>();
  private dynamicToolRegistry = new DynamicToolRegistry();
  private eventEmitter?: AgentEventEmitterFn;
  private maxToolResultTokens: number = DEFAULT_MAX_TOOL_RESULT_TOKENS;

  public setEventEmitter(eventEmitter: AgentEventEmitterFn): void {
    this.eventEmitter = eventEmitter;
  }

  public setMaxToolResultTokens(maxTokens: number): void {
    this.maxToolResultTokens = maxTokens;
  }

  /**
   * Adds tools to the tool manager.
   * Supports executable tools, browser API tools and dynamic tools (reachable only through the
   * `execute_dynamic_tool` meta-tool, see `DynamicToolRegistry`).
   * @param input - The tool input configuration (executable, browser or dynamic)
   */
  public async addTools(input: AddToolInput): Promise<void> {
    let langchainTools: StructuredTool[];
    let idMappings: Map<string, string>;

    switch (input.type) {
      case ToolManagerToolType.executable:
        ({ langchainTools, idMappings } = await this.convertExecutableTools(input));
        break;
      case ToolManagerToolType.browser:
        ({ langchainTools, idMappings } = this.convertBrowserTools(input));
        break;
      case ToolManagerToolType.dynamic:
        this.addDynamicTools(input);
        return;
    }

    const logger = input.type === ToolManagerToolType.executable ? input.logger : undefined;
    langchainTools.forEach((langchainTool) => {
      const { name } = langchainTool;
      // a tool already bound keeps its first binding, and with it the id its name resolves to
      if (this.staticTools.has(name)) {
        logger?.warn(
          `Tool "${idMappings.get(
            name
          )}" is not bound: the agent already has a tool named "${name}"`
        );
        return;
      }
      this.staticTools.set(name, langchainTool);
      const toolId = idMappings.get(name);
      if (toolId !== undefined) {
        this.toolIdMappings.set(name, toolId);
      }
    });
  }

  /**
   * Removes dynamic tools from the registry. Natively bound and unknown ids are ignored.
   * @param toolIds - The internal ids of the dynamic tools to remove
   */
  public removeDynamicTools(toolIds: string[]): void {
    this.dynamicToolRegistry.unregister(toolIds);
  }

  /**
   * Makes the dynamic tools of a source the given ones: registers them and removes the ones the
   * source registered before and no longer provides.
   */
  public syncDynamicTools({ source, tools, logger }: SyncDynamicToolsInput): void {
    const registeredIds = this.registerDynamicTools({ source, tools, logger });
    // Only the ids the source still owns: another source may have registered one since
    const droppedIds = this.dynamicToolRegistry
      .list()
      .filter((tool) => tool.source === source && !registeredIds.has(tool.id))
      .map(({ id }) => id);
    this.removeDynamicTools(droppedIds);
  }

  /**
   * Lists the tools bound to the model (not the dynamic tools).
   * @returns an array of the natively bound tools
   */
  public list(): StructuredTool[] {
    return [...this.staticTools.values()];
  }

  /**
   * Gets the tool id mapping.
   * Maps LangChain tool names to internal tool IDs.
   * @returns the tool id mapping
   */
  public getToolIdMapping(): Map<string, string> {
    return this.toolIdMappings;
  }

  public getToolMeta(toolId: string): {
    origin: ToolOrigin | undefined;
    type: ToolType | undefined;
  } {
    const origin = this.toolOrigins.get(toolId);
    if (origin !== undefined) {
      return { origin, type: this.toolTypes.get(toolId) };
    }
    const dynamicTool = this.dynamicToolRegistry.get(toolId);
    return { origin: dynamicTool?.origin, type: dynamicTool?.type };
  }

  public getExecutable(toolId: string): ExecutableTool | undefined {
    return this.executableTools.get(toolId) ?? this.dynamicToolRegistry.get(toolId);
  }

  public hasExecutableTool(toolId: string): boolean {
    return this.executableTools.has(toolId);
  }

  /**
   * Gets the summarizer function for a tool by its internal tool ID.
   * Returns undefined if the tool is not found or has no summarizer.
   */
  public getSummarizer(toolId: string): ToolReturnSummarizerFn | undefined {
    return this.getExecutable(toolId)?.summarizeToolReturn;
  }

  public getDynamicTool(toolId: string): DynamicTool | undefined {
    return this.dynamicToolRegistry.get(toolId);
  }

  public hasDynamicTool(toolId: string): boolean {
    return this.dynamicToolRegistry.has(toolId);
  }

  public listDynamicTools(): DynamicTool[] {
    return this.dynamicToolRegistry.list();
  }

  /**
   * Gets the internal tool IDs of the dynamic tools, for persistence.
   * @returns array of internal tool IDs
   */
  public getDynamicToolIds(): string[] {
    return this.dynamicToolRegistry.ids();
  }

  private getMaxToolTokens(tool: ExecutableTool, dynamicToolId?: string): number {
    const innerTool = dynamicToolId ? this.getExecutable(dynamicToolId) : undefined;
    return innerTool?.maxResultTokens ?? tool.maxResultTokens ?? this.maxToolResultTokens;
  }

  private async convertExecutableTools(input: ExecutableToolInput): Promise<ConvertedTools> {
    const toolsWithOrigin = Array.isArray(input.tools) ? input.tools : [input.tools];
    const tools: ExecutableTool[] = toolsWithOrigin.map(({ origin, ...tool }) => {
      this.toolOrigins.set(tool.id, origin);
      this.toolTypes.set(tool.id, tool.type);
      this.executableTools.set(tool.id, tool);
      return tool;
    });

    const toolIdMapping = createToolIdMappings(tools);
    const langchainTools = await Promise.all(
      tools.map((tool) =>
        toolToLangchain({
          tool,
          logger: input.logger,
          sendEvent: this.eventEmitter,
          toolId: toolIdMapping.get(tool.id),
          addIntentParam: true,
          buildContent: ({ results, toolId, toolCallId, dynamicToolId }) =>
            buildGuardedToolContent({
              results,
              toolId: dynamicToolId ?? toolId,
              toolCallId,
              maxTokens: this.getMaxToolTokens(tool, dynamicToolId),
            }),
        })
      )
    );

    const idMappings = reverseMap(toolIdMapping);

    return {
      langchainTools,
      idMappings,
    };
  }

  private convertBrowserTools(input: BrowserToolInput): ConvertedTools {
    const browserToolsWithOrigin = Array.isArray(input.tools) ? input.tools : [input.tools];
    const browserApiTools = browserToolsWithOrigin.map(({ origin, ...tool }) => {
      this.toolOrigins.set(sanitizeToolId(`browser_${tool.id}`), origin);
      return tool;
    });
    const browserLangchainTools = browserToolsToLangchain({ browserApiTools });

    return {
      langchainTools: browserLangchainTools.tools,
      idMappings: browserLangchainTools.idMappings,
    };
  }

  private addDynamicTools({ source, tools, logger }: DynamicToolInput): void {
    this.registerDynamicTools({ source, tools: Array.isArray(tools) ? tools : [tools], logger });
  }

  /**
   * Registers the tools with the source on each and returns the ids that landed in the registry.
   * An id given twice keeps its last tool; an id another source registered is taken over.
   */
  private registerDynamicTools({ source, tools, logger }: SyncDynamicToolsInput): Set<string> {
    const registered = new Map<string, DynamicTool>();
    for (const tool of tools) {
      if (this.hasExecutableTool(tool.id)) {
        // ids bound natively are skipped: the model calls those directly. Not a warning: skills
        // commonly list tools the agent already has
        logger?.debug(
          `Dynamic tool "${tool.id}" provided by ${source} is skipped: the agent has a tool with this id in its tool list`
        );
      } else {
        if (registered.has(tool.id)) {
          logger?.warn(
            `Dynamic tool "${tool.id}" is provided more than once by ${source}: the last one wins`
          );
        }
        registered.set(tool.id, { ...tool, source });
      }
    }
    this.dynamicToolRegistry.register(registered.values().toArray());
    return new Set(registered.keys());
  }
}
