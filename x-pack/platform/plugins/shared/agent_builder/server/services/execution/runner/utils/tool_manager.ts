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
import { LRUCache } from 'lru-cache';
import type { ToolOrigin, ToolType } from '@kbn/agent-builder-common';
import type { AgentEventEmitterFn, ExecutableTool } from '@kbn/agent-builder-server';
import type { ToolReturnSummarizerFn } from '@kbn/agent-builder-server/tools/builtin';
import type {
  ToolManager as IToolManager,
  ToolManagerParams,
  ToolName,
  AddToolOptions,
  AddToolInput,
  ExecutableToolWithOrigin,
  ExecutableToolInput,
  BrowserToolInput,
  DynamicToolInput,
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
  return new ToolManager({
    dynamicToolCapacity: 15,
  });
};

/**
 * ToolManager is a class that manages tools for the agent.
 * It stores static tools and dynamic tools. Static tools do not change through out a round while dynamic tools can be added and removed.
 *
 * Dynamic tools are limited to a certain capacity to prevent too many tools from being added to the agent.
 * Least recently used tools are evicted when the capacity is reached.
 *
 * Tools added with a `DynamicToolInput` are a third kind: never bound to the model, only
 * reachable through the `execute_dynamic_tool` meta-tool (see `DynamicToolRegistry`).
 */
export class ToolManager implements IToolManager {
  private staticTools: Map<ToolName, StructuredTool> = new Map<ToolName, StructuredTool>();
  private dynamicTools: LRUCache<ToolName, StructuredTool>;
  private toolIdMappings: Map<string, string>;
  private toolOrigins: Map<string, ToolOrigin>;
  private toolTypes: Map<string, ToolType>;
  private executableTools: Map<string, ExecutableTool> = new Map<string, ExecutableTool>();
  private dynamicToolRegistry = new DynamicToolRegistry();
  private eventEmitter?: AgentEventEmitterFn;
  private maxToolResultTokens: number = DEFAULT_MAX_TOOL_RESULT_TOKENS;

  constructor(params: ToolManagerParams) {
    this.dynamicTools = new LRUCache<ToolName, StructuredTool>({
      max: params.dynamicToolCapacity,
    });
    this.toolIdMappings = new Map<string, string>();
    this.toolOrigins = new Map<string, ToolOrigin>();
    this.toolTypes = new Map<string, ToolType>();
  }

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
   * @param options - Optional configuration for tool storage (static vs dynamic)
   */
  public async addTools(input: AddToolInput, options: AddToolOptions = {}): Promise<void> {
    const { dynamic = false } = options;

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

    this.toolIdMappings = new Map([...this.toolIdMappings, ...idMappings]);

    langchainTools.forEach((langchainTool) => {
      const { name } = langchainTool;
      if (this.staticTools.has(name)) {
        /**
         * If tool already exists as static tool, don't need to add it again.
         * Dynamic tools are re-added to update LRU eviction.
         */
        return;
      }
      if (dynamic) {
        this.dynamicTools.set(name, langchainTool);
      } else {
        this.dynamicTools.delete(name);
        this.staticTools.set(name, langchainTool);
      }
    });
  }

  /**
   * Lists all tools in the tool manager.
   * @returns an array of all tools (static and dynamic)
   */
  public list(): StructuredTool[] {
    return [...this.staticTools.values(), ...this.dynamicTools.values()];
  }

  /**
   * Records the use of a tool, marking it as recently used.
   * This affects LRU eviction for dynamic tools.
   * @param langchainToolName - The name of the LangChain tool to record usage for.
   */
  public recordToolUse(langchainToolName: ToolName): void {
    if (this.dynamicTools.has(langchainToolName)) {
      this.dynamicTools.get(langchainToolName);
    }
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

  /**
   * Gets the summarizer function for a tool by its internal tool ID.
   * Returns undefined if the tool is not found or has no summarizer.
   */
  public getSummarizer(toolId: string): ToolReturnSummarizerFn | undefined {
    return this.getExecutable(toolId)?.summarizeToolReturn;
  }

  public getDynamicTool(toolId: string): ExecutableToolWithOrigin | undefined {
    return this.dynamicToolRegistry.get(toolId);
  }

  public listDynamicTools(): ExecutableToolWithOrigin[] {
    return this.dynamicToolRegistry.list();
  }

  /**
   * Gets the internal tool IDs of all dynamic tools currently in the tool manager.
   * Returns internal tool IDs (not LangChain names) for persistence.
   * @returns array of internal tool IDs
   */
  public getDynamicToolIds(): string[] {
    const internalToolIds: string[] = [];
    for (const tool of this.dynamicTools.values()) {
      const langchainName = tool.name;
      const internalId = this.toolIdMappings.get(langchainName);
      if (internalId) {
        internalToolIds.push(internalId);
      }
    }

    return internalToolIds;
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
          addReasoningParam: false,
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

  private addDynamicTools(input: DynamicToolInput): void {
    const tools = Array.isArray(input.tools) ? input.tools : [input.tools];
    // ids bound natively are skipped: the model calls those directly
    this.dynamicToolRegistry.register(tools.filter((tool) => !this.executableTools.has(tool.id)));
    return;
  }
}

export type { ToolManagerParams };
