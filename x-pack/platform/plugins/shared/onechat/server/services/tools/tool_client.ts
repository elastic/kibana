/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest } from '@kbn/core-http-server';
import {
  ToolType,
  createToolNotFoundError,
  createBadRequestError,
  createInternalError,
} from '@kbn/onechat-common';
import type {
  ToolDefinition,
  ToolCreateParams,
  ToolUpdateParams,
  ToolTypeDefinition,
  ReadonlyToolTypeClient,
  ToolTypeClient,
} from './tool_provider';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ToolListParams {
  // blank for now
  // type?: ToolType[];
  // tags?: string[];
}

const isToolTypeClient = (client: ReadonlyToolTypeClient): client is ToolTypeClient => {
  return 'create' in client;
};

// TODO: handle that thing.
const builtinToolIdPrefix = '.';
const toolIdPrefixes = {
  [ToolType.builtin]: builtinToolIdPrefix,
};

export interface ToolClient {
  has(toolId: string): Promise<boolean>;
  get(toolId: string): Promise<ToolDefinition>;
  list(opts?: ToolListParams): Promise<ToolDefinition[]>;
  create(tool: ToolCreateParams): Promise<ToolDefinition>;
  update(tool: ToolUpdateParams): Promise<ToolDefinition>;
  delete(toolId: string): Promise<boolean>;
}

interface CreateToolClientParams {
  typesDefinitions: ToolTypeDefinition[];
  request: KibanaRequest;
}

export const createToolClient = (params: CreateToolClientParams): ToolClient => {
  return new ToolClientImpl(params);
};

class ToolClientImpl implements ToolClient {
  private readonly typesDefinitions: ToolTypeDefinition[];
  private readonly request: KibanaRequest;

  constructor({ typesDefinitions, request }: CreateToolClientParams) {
    this.typesDefinitions = typesDefinitions;
    this.request = request;
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
    const allTools: ToolDefinition[] = [];
    for (const type of this.typesDefinitions) {
      const client = await type.getClient({ request: this.request });
      const toolsFromType = await client.list();
      allTools.push(...toolsFromType);
    }
    return allTools;
  }

  async create(tool: ToolCreateParams) {
    const { type, ...toolCreateParams } = tool;
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

  async update(tool: ToolUpdateParams) {
    for (const type of this.typesDefinitions) {
      const client = await type.getClient({ request: this.request });
      if (await client.has(tool.id)) {
        if (type.readonly) {
          throw createBadRequestError(`Tool ${tool.id} is read-only and can't be updated`);
        }
        if (isToolTypeClient(client)) {
          return client.update(tool);
        } else {
          throw createInternalError(
            `Non-readonly type ${type.toolType} exposes a read-only client`
          );
        }
      }
    }
    throw createToolNotFoundError({ toolId: tool.id });
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
