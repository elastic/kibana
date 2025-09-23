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
  createInternalError,
  validateToolId,
} from '@kbn/onechat-common';
import type { Runner, RunToolReturn, ScopedRunnerRunToolsParams } from '@kbn/onechat-server';
import type {
  InternalToolDefinition,
  ToolCreateParams,
  ToolUpdateParams,
  ToolSource,
  ReadonlyToolTypeClient,
  ToolTypeClient,
} from './tool_provider';
import { toExecutableTool } from './utils';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ToolListParams {
  // blank for now
  // type?: ToolType[];
  // tags?: string[];
}

const isToolTypeClient = (client: ReadonlyToolTypeClient): client is ToolTypeClient => {
  return 'create' in client;
};

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
  toolSources: ToolSource[];
  request: KibanaRequest;
}

export const createToolRegistry = (params: CreateToolClientParams): ToolRegistry => {
  return new ToolRegistryImpl(params);
};

class ToolRegistryImpl implements ToolRegistry {
  private readonly toolSources: ToolSource[];
  private readonly request: KibanaRequest;
  private readonly getRunner: () => Runner;

  constructor({ toolSources, request, getRunner }: CreateToolClientParams) {
    this.toolSources = toolSources;
    this.request = request;
    this.getRunner = getRunner;
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
    for (const source of this.toolSources) {
      const client = await source.getClient({ request: this.request });
      if (await client.has(toolId)) {
        return true;
      }
    }
    return false;
  }

  async get(toolId: string) {
    for (const source of this.toolSources) {
      const client = await source.getClient({ request: this.request });
      if (await client.has(toolId)) {
        return client.get(toolId);
      }
    }
    throw createToolNotFoundError({ toolId });
  }

  async list(opts?: ToolListParams | undefined) {
    const allTools: InternalToolDefinition[] = [];
    for (const type of this.toolSources) {
      const client = await type.getClient({ request: this.request });
      const toolsFromType = await client.list();
      allTools.push(...toolsFromType);
    }
    return allTools;
  }

  async create(createRequest: ToolCreateParams) {
    const { type, id: toolId } = createRequest;

    const validationError = validateToolId({ toolId, builtIn: false });
    if (validationError) {
      throw createBadRequestError(`Invalid tool id: "${toolId}": ${validationError}`);
    }

    if (await this.has(toolId)) {
      throw createBadRequestError(`Tool with id ${toolId} already exists`);
    }

    const source = this.toolSources.find((t) => t.toolTypes.includes(type));
    if (!source) {
      throw createBadRequestError(`Unknown tool type ${type}`);
    }
    const client = await source.getClient({ request: this.request });
    if (isToolTypeClient(client)) {
      return client.create(createRequest);
    } else {
      throw createInternalError(`Non-readonly source ${source.id} exposes a read-only client`);
    }
  }

  async update(toolId: string, update: ToolUpdateParams) {
    for (const source of this.toolSources) {
      const client = await source.getClient({ request: this.request });
      if (await client.has(toolId)) {
        if (source.readonly) {
          throw createBadRequestError(`Tool ${toolId} is read-only and can't be updated`);
        }
        if (isToolTypeClient(client)) {
          return client.update(toolId, update);
        } else {
          throw createInternalError(`Non-readonly source ${source.id} exposes a read-only client`);
        }
      }
    }
    throw createToolNotFoundError({ toolId });
  }

  async delete(toolId: string): Promise<boolean> {
    for (const source of this.toolSources) {
      const client = await source.getClient({ request: this.request });
      if (await client.has(toolId)) {
        if (source.readonly) {
          throw createBadRequestError(`Tool ${toolId} is read-only and can't be deleted`);
        }
        if (isToolTypeClient(client)) {
          return client.delete(toolId);
        } else {
          throw createInternalError(`Non-readonly source ${source.id} exposes a read-only client`);
        }
      }
    }
    throw createToolNotFoundError({ toolId });
  }
}
