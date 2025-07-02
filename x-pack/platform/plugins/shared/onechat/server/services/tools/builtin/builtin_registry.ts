/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import {
  OnechatErrorUtils,
  type PlainIdToolIdentifier,
  toSerializedToolIdentifier,
  builtinToolProviderId,
} from '@kbn/onechat-common';
import type { RegisteredTool } from '@kbn/onechat-server';
import type { RegisteredToolProviderWithId } from '../types';

export interface BuiltinToolRegistry extends RegisteredToolProviderWithId {
  register(tool: RegisteredTool): void;
}

export const createBuiltinToolRegistry = (): BuiltinToolRegistry => {
  return new BuiltinToolRegistryImpl();
};

class BuiltinToolRegistryImpl implements BuiltinToolRegistry {
  public readonly id = builtinToolProviderId;

  private tools: Map<string, RegisteredTool> = new Map();

  constructor() {}

  register(tool: RegisteredTool) {
    if (this.tools.has(tool.id)) {
      throw new Error(`Tool with id ${tool.id} already registered`);
    }
    this.tools.set(tool.id, tool);
  }

  async has(options: { toolId: PlainIdToolIdentifier; request: KibanaRequest }): Promise<boolean> {
    const { toolId } = options;
    return this.tools.has(toolId);
  }

  async get(options: {
    toolId: PlainIdToolIdentifier;
    request: KibanaRequest;
  }): Promise<RegisteredTool> {
    const { toolId } = options;

    if (this.tools.has(toolId)) {
      return this.tools.get(toolId)!;
    }

    throw OnechatErrorUtils.createToolNotFoundError({
      toolId: toSerializedToolIdentifier(toolId),
    });
  }

  async list(options: { request: KibanaRequest }): Promise<RegisteredTool[]> {
    return [...this.tools.values()];
  }
}
