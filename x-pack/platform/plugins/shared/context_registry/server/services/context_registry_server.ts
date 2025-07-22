/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolDefinition } from '@kbn/inference-common';
import { ContextResponse } from '../../common/types';

export type ContextHandler<TPayload = Record<string, unknown>> = (
  params: any
) => Promise<ContextResponse<TPayload>>;

export interface ContextDefinitionServer<TPayload = {}> {
  // Unique identifier for the context
  key: string;
  // Tools available for fetching, keyed by tool name
  tools: Record<string, ToolDefinition>;
  // Handlers. Can be called programtically or used with tool calling, keyed to match the tool name
  handlers: Record<string, ContextHandler<TPayload>>;
}

export class ContextRegistryServer {
  private registry: Map<string, ContextDefinitionServer> = new Map();
  private tools: Map<string, ToolDefinition> = new Map();
  private handlers: Map<string, ContextHandler> = new Map();

  public register(contextDefinition: ContextDefinitionServer): void {
    if (this.registry.has(contextDefinition.key)) {
      throw new Error(
        `Context type '${contextDefinition.key}' is already registered with server context registry.`
      );
    }
    this.registry.set(contextDefinition.key, contextDefinition);
    Object.entries(contextDefinition.tools).forEach(([toolName, toolDefinition]) => {
      if (this.tools.has(toolName)) {
        throw new Error(
          `Tool '${toolName}' is already registered for context type '${contextDefinition.key}'.`
        );
      }
      this.tools.set(toolName, toolDefinition);
    });
    Object.entries(contextDefinition.handlers).forEach(([handlerName, handler]) => {
      if (this.handlers.has(handlerName)) {
        throw new Error(
          `Handler '${handlerName}' is already registered for context type '${contextDefinition.key}'.`
        );
      }
      this.handlers.set(handlerName, handler);
    });
  }

  get(type: string): ContextDefinitionServer | undefined {
    return this.registry.get(type);
  }

  getTool(toolName: string): ToolDefinition | undefined {
    return this.tools.get(toolName);
  }

  getToolHandler(handlerName: string): ContextHandler | undefined {
    return this.handlers.get(handlerName);
  }
}
