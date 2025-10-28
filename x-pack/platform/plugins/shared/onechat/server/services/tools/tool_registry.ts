/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import {
  createToolNotFoundError,
  createBadRequestError,
  validateToolId,
} from '@kbn/onechat-common';
import type { Runner, RunToolReturn, ScopedRunnerRunToolsParams } from '@kbn/onechat-server';
import type {
  InternalToolDefinition,
  ToolCreateParams,
  ToolUpdateParams,
  ToolProvider,
  WritableToolProvider,
  ReadonlyToolProvider,
} from './tool_provider';
import { isReadonlyToolProvider } from './tool_provider';
import { toExecutableTool } from './utils';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ToolListParams {
  // blank for now
  // type?: ToolType[];
  // tags?: string[];
}

export interface ToolRegistry {
  has(toolId: string): Promise<boolean>;
  get(toolId: string): Promise<InternalToolDefinition>;
  list(opts?: ToolListParams): Promise<InternalToolDefinition[]>;
  create(tool: ToolCreateParams): Promise<InternalToolDefinition>;
  update(toolId: string, update: ToolUpdateParams): Promise<InternalToolDefinition>;
  delete(toolId: string): Promise<boolean>;
  execute<TParams extends object = Record<string, unknown>>(
    params: ScopedRunnerRunToolsParams<TParams>
  ): Promise<RunToolReturn>;
}

interface CreateToolClientParams {
  getRunner: () => Runner;
  persistedProvider: WritableToolProvider;
  builtinProvider: ReadonlyToolProvider;
  request: KibanaRequest;
  space: string;
}

export const createToolRegistry = (params: CreateToolClientParams): ToolRegistry => {
  return new ToolRegistryImpl(params);
};

class ToolRegistryImpl implements ToolRegistry {
  private readonly persistedProvider: WritableToolProvider;
  private readonly builtinProvider: ReadonlyToolProvider;
  private readonly request: KibanaRequest;
  private readonly getRunner: () => Runner;

  constructor({ persistedProvider, builtinProvider, request, getRunner }: CreateToolClientParams) {
    this.persistedProvider = persistedProvider;
    this.builtinProvider = builtinProvider;
    this.request = request;
    this.getRunner = getRunner;
  }

  private get orderedProviders(): ToolProvider[] {
    return [this.builtinProvider, this.persistedProvider];
  }

  async execute<TParams extends object = Record<string, unknown>, TResult = unknown>(
    params: ScopedRunnerRunToolsParams<TParams>
  ): Promise<RunToolReturn> {
    const { toolId, ...otherParams } = params;
    const tool = await this.get(toolId);
    const executable = toExecutableTool({ tool, runner: this.getRunner(), request: this.request });
    return (await executable.execute(otherParams)) as RunToolReturn;
  }

  async has(toolId: string) {
    for (const provider of this.orderedProviders) {
      if (await provider.has(toolId)) {
        return true;
      }
    }
    return false;
  }

  async get(toolId: string) {
    for (const provider of this.orderedProviders) {
      if (await provider.has(toolId)) {
        return provider.get(toolId);
      }
    }
    throw createToolNotFoundError({ toolId });
  }

  async list(opts?: ToolListParams | undefined) {
    const allTools: InternalToolDefinition[] = [];
    for (const provider of this.orderedProviders) {
      const toolsFromType = await provider.list();
      allTools.push(...toolsFromType);
    }
    return allTools;
  }

  async create(createRequest: ToolCreateParams) {
    const { id: toolId } = createRequest;

    const validationError = validateToolId({ toolId, builtIn: false });
    if (validationError) {
      throw createBadRequestError(`Invalid tool id: "${toolId}": ${validationError}`);
    }

    if (await this.has(toolId)) {
      throw createBadRequestError(`Tool with id ${toolId} already exists`);
    }

    return this.persistedProvider.create(createRequest);
  }

  async update(toolId: string, update: ToolUpdateParams) {
    for (const provider of this.orderedProviders) {
      if (await provider.has(toolId)) {
        if (isReadonlyToolProvider(provider)) {
          throw createBadRequestError(`Tool ${toolId} is read-only and can't be updated`);
        }
        return provider.update(toolId, update);
      }
    }
    throw createToolNotFoundError({ toolId });
  }

  async delete(toolId: string): Promise<boolean> {
    for (const provider of this.orderedProviders) {
      if (await provider.has(toolId)) {
        if (isReadonlyToolProvider(provider)) {
          throw createBadRequestError(`Tool ${toolId} is read-only and can't be deleted`);
        }
        return provider.delete(toolId);
      }
    }
    throw createToolNotFoundError({ toolId });
  }
}
