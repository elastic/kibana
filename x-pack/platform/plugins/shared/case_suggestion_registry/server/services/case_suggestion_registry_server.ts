/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { flatten } from 'lodash';
import { ToolDefinition } from '@kbn/inference-common';
import { Logger } from '@kbn/logging';
import { CaseSuggestionRequest, CaseSuggestionResponse, SuggestionOwner } from '../../common/types';
import { OWNERS } from '../../common/constants';

export type CaseSuggestionHandler<TPayload = Record<string, unknown>> = (
  params: CaseSuggestionRequest
) => Promise<CaseSuggestionResponse<TPayload>>;
export interface CaseSuggestionDefinitionServer<TPayload = {}> {
  // Unique identifier for the context
  key: string;
  owner: SuggestionOwner;
  // Tools available for fetching, keyed by tool name
  tools: Record<string, ToolDefinition>;
  // Handlers. Can be called programmatically or used with tool calling, keyed to match the tool name
  handlers: Record<string, CaseSuggestionHandler<TPayload>>;
}

export class CaseSuggestionRegistryServer {
  private registry: Record<SuggestionOwner, Map<string, CaseSuggestionDefinitionServer>> =
    OWNERS.reduce((acc, owner) => {
      acc[owner] = new Map();
      return acc;
    }, {} as Record<SuggestionOwner, Map<string, CaseSuggestionDefinitionServer>>);
  private tools: Record<SuggestionOwner, Map<string, ToolDefinition>> = OWNERS.reduce(
    (acc, owner) => {
      acc[owner] = new Map();
      return acc;
    },
    {} as Record<SuggestionOwner, Map<string, ToolDefinition>>
  );
  private handlers: Record<SuggestionOwner, Map<string, CaseSuggestionHandler>> = OWNERS.reduce(
    (acc, owner) => {
      acc[owner] = new Map();
      return acc;
    },
    {} as Record<SuggestionOwner, Map<string, CaseSuggestionHandler>>
  );

  constructor(private logger: Logger) {}

  public register(caseSuggestionDefinition: CaseSuggestionDefinitionServer): void {
    const { owner, key, tools, handlers } = caseSuggestionDefinition;

    if (!this.registry[owner]) {
      throw new Error(`Owner '${owner}' is not recognized.`);
    }

    if (this.registry[owner].has(key)) {
      throw new Error(`CaseSuggestion type '${key}' is already registered for owner '${owner}'.`);
    }

    Object.entries(tools).forEach(([toolName, toolDefinition]) => {
      if (this.tools[owner].has(toolName)) {
        throw new Error(
          `Tool '${toolName}' is already registered for caseSuggestion type '${key}' under owner '${owner}'.`
        );
      }
      this.tools[owner].set(toolName, toolDefinition);
    });

    Object.entries(handlers).forEach(([handlerName, handler]) => {
      if (this.handlers[owner].has(handlerName)) {
        throw new Error(
          `Handler '${handlerName}' is already registered for caseSuggestion type '${key}' under owner '${owner}'.`
        );
      }
      this.handlers[owner].set(handlerName, handler);
    });

    this.registry[owner].set(key, caseSuggestionDefinition);
  }

  get(type: string, owner: SuggestionOwner): CaseSuggestionDefinitionServer | undefined {
    return this.registry[owner]?.get(type);
  }

  getTool(toolName: string, owner: SuggestionOwner): ToolDefinition | undefined {
    return this.tools[owner]?.get(toolName);
  }

  getToolHandler(handlerName: string, owner: SuggestionOwner): CaseSuggestionHandler | undefined {
    return this.handlers[owner]?.get(handlerName);
  }

  async getCaseSuggestionForOwner(
    caseSuggestion: CaseSuggestionRequest,
    owner: SuggestionOwner
  ): Promise<CaseSuggestionResponse[]> {
    const handlers = Array.from(this.handlers[owner]?.values() || []);
    if (handlers.length === 0) {
      return [];
    }

    const results = await Promise.all(
      handlers.map(async (handler) => {
        try {
          return await handler(caseSuggestion);
        } catch (error) {
          this.logger.error(
            `Error: Could not get caseSuggestion from handler for owner '${owner}'`,
            error
          );
          return null;
        }
      })
    );

    return flatten(
      results.filter(
        (result): result is CaseSuggestionResponse<Record<string, unknown>> => result !== null
      )
    );
  }

  async getCaseSuggestionByKey({
    key,
    handlerName,
    context,
    owner,
  }: {
    key: string;
    handlerName?: string;
    context: CaseSuggestionRequest;
    owner: SuggestionOwner;
  }): Promise<CaseSuggestionResponse[]> {
    const caseSuggestionDefinition = this.registry[owner]?.get(key);
    if (!caseSuggestionDefinition) {
      throw new Error(`CaseSuggestion with key '${key}' is not registered for owner '${owner}'.`);
    }

    const handlers = caseSuggestionDefinition.handlers;

    if (!handlers || Object.keys(handlers).length === 0) {
      throw new Error(
        `No handlers registered for caseSuggestion with key '${key}' under owner '${owner}'.`
      );
    }
    if (handlerName && !handlers[handlerName]) {
      throw new Error(
        `Handler '${handlerName}' not found for caseSuggestion with key '${key}' under owner '${owner}'. Available handlers: ${Object.keys(
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
          `Error: Could not get case suggestion from handler '${handlerName}' for owner '${owner}'`,
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
            `Error: Could not get caseSuggestion from handler '${name}' for owner '${owner}'`,
            error
          );
          return null;
        }
      })
    );

    return flatten(
      results.filter(
        (result): result is CaseSuggestionResponse<Record<string, unknown>> => result !== null
      )
    );
  }
}
