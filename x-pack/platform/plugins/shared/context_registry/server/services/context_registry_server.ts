/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod';
import { flatten } from 'lodash';
import { ToolDefinition } from '@kbn/inference-common';
import { Logger } from '@kbn/logging';
import { ContextResponse } from '../../common/types';

export const contextRequestSchema = z.object({
  'service.name': z.string().optional(),
  timeRange: z
    .object({
      from: z.string(),
      to: z.string(),
    })
    .optional(),
});

export type ContextRequest = z.infer<typeof contextRequestSchema>;

export type ContextHandler<TPayload = Record<string, unknown>> = (
  params: ContextRequest
) => Promise<ContextResponse<TPayload>>;

export interface ContextDefinitionServer<TPayload = {}> {
  // Unique identifier for the context
  key: string;
  // Tools available for fetching, keyed by tool name
  tools: Record<string, ToolDefinition>;
  // Handlers. Can be called programmatically or used with tool calling, keyed to match the tool name
  handlers: Record<string, ContextHandler<TPayload>>;
}

export class ContextRegistryServer {
  private registry: Map<string, ContextDefinitionServer> = new Map();
  private tools: Map<string, ToolDefinition> = new Map();
  private handlers: Map<string, ContextHandler> = new Map();

  constructor(private logger: Logger) {}

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

  async getContext(context: ContextRequest): Promise<ContextResponse[]> {
    const handlers = Array.from(this.handlers.values());
    if (handlers.length === 0) {
      return [];
    }

    const results = await Promise.all(
      handlers.map(async (handler) => {
        try {
          return await handler(context);
        } catch (error) {
          this.logger.error(`Error: Could not get context from handler`, error);
          return null;
        }
      })
    );

    return flatten(
      results.filter(
        (result): result is ContextResponse<Record<string, unknown>> => result !== null
      )
    );
  }

  async getContextByKey({
    key,
    handlerName,
    context,
  }: {
    key: string;
    handlerName?: string;
    context: ContextRequest;
  }): Promise<ContextResponse[]> {
    const contextDefinition = this.registry.get(key);
    if (!contextDefinition) {
      throw new Error(`Context with key '${key}' is not registered.`);
    }

    const handlers = contextDefinition.handlers;

    if (!handlers || Object.keys(handlers).length === 0) {
      throw new Error(
        `No handlers registered for context with key '${key}'. Please ensure the context is properly defined.`
      );
    }
    if (handlerName && !handlers[handlerName]) {
      throw new Error(
        `Handler '${handlerName}' not found for context with key '${key}'. Available handlers: ${Object.keys(
          handlers
        ).join(', ')}`
      );
    }

    if (handlerName) {
      const handler = handlers[handlerName];
      try {
        const result = await handler(context);
        return result ? [result] : [];
      } catch (error) {
        this.logger.error(`Error: Could not get context from handler '${handlerName}'`, error);
        return [];
      }
    }

    // If no specific handler is requested, call all handlers
    const results = await Promise.all(
      Object.entries(handlers).map(async ([name, handler]) => {
        try {
          return await handler(context);
        } catch (error) {
          this.logger.error(`Error: Could not get context from handler '${name}'`, error);
          return null;
        }
      })
    );

    return flatten(
      results.filter(
        (result): result is ContextResponse<Record<string, unknown>> => result !== null
      )
    );
  }
}
