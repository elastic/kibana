/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { flatten } from 'lodash';
import { ToolDefinition } from '@kbn/inference-common';
import { Logger } from '@kbn/logging';
import { ContextRequest, ContextResponse, ContextOwner } from '../../common/types';
import { OWNERS } from '../../common/constants';

export type ContextHandler<TPayload = Record<string, unknown>> = (
  params: ContextRequest
) => Promise<ContextResponse<TPayload>>;
export interface ContextDefinitionServer<TPayload = {}> {
  // Unique identifier for the context
  key: string;
  owner: ContextOwner;
  // Tools available for fetching, keyed by tool name
  tools: Record<string, ToolDefinition>;
  // Handlers. Can be called programmatically or used with tool calling, keyed to match the tool name
  handlers: Record<string, ContextHandler<TPayload>>;
}

export class ContextRegistryServer {
  private registry: Record<ContextOwner, Map<string, ContextDefinitionServer>> = OWNERS.reduce(
    (acc, owner) => {
      acc[owner] = new Map();
      return acc;
    },
    {} as Record<ContextOwner, Map<string, ContextDefinitionServer>>
  );
  private tools: Record<ContextOwner, Map<string, ToolDefinition>> = OWNERS.reduce((acc, owner) => {
    acc[owner] = new Map();
    return acc;
  }, {} as Record<ContextOwner, Map<string, ToolDefinition>>);
  private handlers: Record<ContextOwner, Map<string, ContextHandler>> = OWNERS.reduce(
    (acc, owner) => {
      acc[owner] = new Map();
      return acc;
    },
    {} as Record<ContextOwner, Map<string, ContextHandler>>
  );

  constructor(private logger: Logger) {}

  public register(contextDefinition: ContextDefinitionServer): void {
    const { owner, key, tools, handlers } = contextDefinition;

    if (!this.registry[owner]) {
      throw new Error(`Owner '${owner}' is not recognized.`);
    }

    if (this.registry[owner].has(key)) {
      throw new Error(`Context type '${key}' is already registered for owner '${owner}'.`);
    }

    Object.entries(tools).forEach(([toolName, toolDefinition]) => {
      if (this.tools[owner].has(toolName)) {
        throw new Error(
          `Tool '${toolName}' is already registered for context type '${key}' under owner '${owner}'.`
        );
      }
      this.tools[owner].set(toolName, toolDefinition);
    });

    Object.entries(handlers).forEach(([handlerName, handler]) => {
      if (this.handlers[owner].has(handlerName)) {
        throw new Error(
          `Handler '${handlerName}' is already registered for context type '${key}' under owner '${owner}'.`
        );
      }
      this.handlers[owner].set(handlerName, handler);
    });

    this.registry[owner].set(key, contextDefinition);
  }

  get(type: string, owner: ContextOwner): ContextDefinitionServer | undefined {
    return this.registry[owner]?.get(type);
  }

  getTool(toolName: string, owner: ContextOwner): ToolDefinition | undefined {
    return this.tools[owner]?.get(toolName);
  }

  getToolHandler(handlerName: string, owner: ContextOwner): ContextHandler | undefined {
    return this.handlers[owner]?.get(handlerName);
  }

  async getContextForOwner(
    context: ContextRequest,
    owner: ContextOwner
  ): Promise<ContextResponse[]> {
    const handlers = Array.from(this.handlers[owner]?.values() || []);
    if (handlers.length === 0) {
      return [];
    }

    const results = await Promise.all(
      handlers.map(async (handler) => {
        try {
          return await handler(context);
        } catch (error) {
          this.logger.error(
            `Error: Could not get context from handler for owner '${owner}'`,
            error
          );
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
    owner,
  }: {
    key: string;
    handlerName?: string;
    context: ContextRequest;
    owner: ContextOwner;
  }): Promise<ContextResponse[]> {
    const contextDefinition = this.registry[owner]?.get(key);
    if (!contextDefinition) {
      throw new Error(`Context with key '${key}' is not registered for owner '${owner}'.`);
    }

    const handlers = contextDefinition.handlers;

    if (!handlers || Object.keys(handlers).length === 0) {
      throw new Error(
        `No handlers registered for context with key '${key}' under owner '${owner}'.`
      );
    }
    if (handlerName && !handlers[handlerName]) {
      throw new Error(
        `Handler '${handlerName}' not found for context with key '${key}' under owner '${owner}'. Available handlers: ${Object.keys(
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
        this.logger.error(
          `Error: Could not get context from handler '${handlerName}' for owner '${owner}'`,
          error
        );
        return [];
      }
    }

    // If no specific handler is requested, call all handlers
    const results = await Promise.all(
      Object.entries(handlers).map(async ([name, handler]) => {
        try {
          return await handler(context);
        } catch (error) {
          this.logger.error(
            `Error: Could not get context from handler '${name}' for owner '${owner}'`,
            error
          );
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
