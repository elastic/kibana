/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolDefinition } from '@kbn/inference-common';
import { SuggestionPayload } from '../../common/types';

export type ToolHandler<TPayload = Record<string, unknown>, TMetadata = Record<string, unknown>> = (
  params: any
) => Promise<SuggestionPayload<TPayload, TMetadata>>; // Type for tool handlers that return a Promise of SuggestionPayload

export interface SuggestionDefinitionServer<TPayload = {}, TMetadata = {}> {
  suggestionId: string; // Unique identifier for the case suggestion
  displayName: string; // Human-readable name for the suggestion
  description: string; // Description of the suggestion's purpose
  availableTools: Record<string, ToolDefinition>; // Tools available for this suggestion, keyed by tool name
  toolHandlers: Record<string, ToolHandler<TPayload, TMetadata>>; // Handlers for tools, keyed to match the tool name
}

export class Registry {
  private registry: Map<string, SuggestionDefinitionServer> = new Map();
  private tools: Map<string, ToolDefinition> = new Map();
  private toolHandlers: Map<string, ToolHandler> = new Map();

  public register(suggestion: SuggestionDefinitionServer): void {
    if (this.registry.has(suggestion.suggestionId)) {
      throw new Error(`Suggestion type '${suggestion.suggestionId}' is already registered.`);
    }
    this.registry.set(suggestion.suggestionId, suggestion);
    Object.entries(suggestion.availableTools).forEach(([toolName, toolDefinition]) => {
      if (this.tools.has(toolName)) {
        throw new Error(
          `Tool '${toolName}' is already registered for suggestion type '${suggestion.suggestionId}'.`
        );
      }
      this.tools.set(toolName, toolDefinition);
    });
    Object.entries(suggestion.toolHandlers).forEach(([handlerName, handler]) => {
      if (this.toolHandlers.has(handlerName)) {
        throw new Error(
          `Tool handler '${handlerName}' is already registered for suggestion type '${suggestion.suggestionId}'.`
        );
      }
      this.toolHandlers.set(handlerName, handler);
    });
  }

  get(type: string): SuggestionDefinitionServer | undefined {
    return this.registry.get(type);
  }

  getTool(toolName: string): ToolDefinition | undefined {
    return this.tools.get(toolName);
  }

  getToolHandler(handlerName: string): ToolHandler | undefined {
    return this.toolHandlers.get(handlerName);
  }

  getAllTools(): Record<string, ToolDefinition> {
    return Object.fromEntries(this.tools.entries());
  }

  getAllToolHandlers(): SuggestionDefinitionServer['toolHandlers'] {
    return Object.fromEntries(this.toolHandlers.entries());
  }

  getAll(): SuggestionDefinitionServer[] {
    return Array.from(this.registry.values());
  }
}
