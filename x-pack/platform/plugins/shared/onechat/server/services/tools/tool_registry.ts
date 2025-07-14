/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest } from '@kbn/core-http-server';
import {
  createToolNotFoundError,
  createBadRequestError,
  createInternalError,
} from '@kbn/onechat-common';
import type { Runner, RunToolReturn, ScopedRunnerRunToolsParams } from '@kbn/onechat-server';
import type {
  InternalToolDefinition,
  ToolCreateParams,
  ToolUpdateParams,
  ToolTypeDefinition,
  ReadonlyToolTypeClient,
  ToolTypeClient,
} from './tool_provider';
import { toExecutableTool, ensureValidId } from './utils';

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
  execute<TParams extends object = Record<string, unknown>, TResult = unknown>(
    params: ScopedRunnerRunToolsParams<TParams>
  ): Promise<RunToolReturn<TResult>>;
}

interface CreateToolClientParams {
  getRunner: () => Runner;
  typesDefinitions: ToolTypeDefinition[];
  request: KibanaRequest;
}

export const createToolRegistry = (params: CreateToolClientParams): ToolRegistry => {
  return new ToolClientImpl(params);
};

class ToolClientImpl implements ToolRegistry {
  private readonly typesDefinitions: ToolTypeDefinition[];
  private readonly request: KibanaRequest;
  private readonly getRunner: () => Runner;

  constructor({ typesDefinitions, request, getRunner }: CreateToolClientParams) {
    this.typesDefinitions = typesDefinitions;
    this.request = request;
    this.getRunner = getRunner;
  }

  async execute<TParams extends object = Record<string, unknown>, TResult = unknown>(
    params: ScopedRunnerRunToolsParams<TParams>
  ): Promise<RunToolReturn<TResult>> {
    const { toolId, ...otherParams } = params;
    const tool = await this.get(toolId);
    const executable = toExecutableTool({ tool, runner: this.getRunner(), request: this.request });
    return (await executable.execute(otherParams)) as RunToolReturn<TResult>;
  }

  async has(toolId: string) {
    for (const type of this.typesDefinitions) {
      const client = await type.getClient({ request: this.request });
      if (await client.has(toolId)) {
        return true;
      }
    }
    return false;
  }

  async get(toolId: string) {
    for (const type of this.typesDefinitions) {
      const client = await type.getClient({ request: this.request });
      if (await client.has(toolId)) {
        return client.get(toolId);
      }
    }
    throw createToolNotFoundError({ toolId });
  }

  async list(opts?: ToolListParams | undefined) {
    const allTools: InternalToolDefinition[] = [];
    for (const type of this.typesDefinitions) {
      const client = await type.getClient({ request: this.request });
      const toolsFromType = await client.list();
      allTools.push(...toolsFromType);
    }
    return allTools;
  }

  async create(tool: ToolCreateParams) {
    const { type, ...toolCreateParams } = tool;

    ensureValidId(tool.id);

    if (await this.has(tool.id)) {
      throw createBadRequestError(`Tool with id ${tool.id} already exists`);
    }

    const typeDef = this.typesDefinitions.find((t) => t.toolType === type);
    if (!typeDef) {
      throw createBadRequestError(`Unknown tool type ${type}`);
    }
    const client = await typeDef.getClient({ request: this.request });
    if (isToolTypeClient(client)) {
      return client.create(toolCreateParams);
    } else {
      throw createInternalError(`Non-readonly type ${type} exposes a read-only client`);
    }
  }

  async update(toolId: string, update: ToolUpdateParams) {
    for (const type of this.typesDefinitions) {
      const client = await type.getClient({ request: this.request });
      if (await client.has(toolId)) {
        if (type.readonly) {
          throw createBadRequestError(`Tool ${toolId} is read-only and can't be updated`);
        }
        if (isToolTypeClient(client)) {
          return client.update(toolId, update);
        } else {
          throw createInternalError(
            `Non-readonly type ${type.toolType} exposes a read-only client`
          );
        }
      }
    }
    throw createToolNotFoundError({ toolId });
  }

  async delete(toolId: string): Promise<boolean> {
    for (const type of this.typesDefinitions) {
      const client = await type.getClient({ request: this.request });
      if (await client.has(toolId)) {
        if (type.readonly) {
          throw createBadRequestError(`Tool ${toolId} is read-only and can't be deleted`);
        }
        if (isToolTypeClient(client)) {
          return client.delete(toolId);
        } else {
          throw createInternalError(
            `Non-readonly type ${type.toolType} exposes a read-only client`
          );
        }
      }
    }
    throw createToolNotFoundError({ toolId });
  }
}
