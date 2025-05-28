/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ZodObject } from '@kbn/zod';
import type { MaybePromise } from '@kbn/utility-types';
import type { KibanaRequest } from '@kbn/core-http-server';
import {
  OnechatErrorUtils,
  ToolSourceType,
  type ToolIdentifier,
  toSerializedToolIdentifier,
  toStructuredToolIdentifier,
} from '@kbn/onechat-common';
import type { RegisteredTool } from '@kbn/onechat-server';
import type { RegisteredToolWithMeta, InternalToolProvider } from './types';
import { addBuiltinSystemMeta } from './utils/tool_conversion';

export type ToolRegistrationFn = (opts: {
  request: KibanaRequest;
}) => MaybePromise<RegisteredTool[]>;
export type ToolDirectRegistration = RegisteredTool;

export type ToolRegistration<
  RunInput extends ZodObject<any> = ZodObject<any>,
  RunOutput = unknown
> = RegisteredTool<RunInput, RunOutput> | ToolRegistrationFn;

export const isToolRegistrationFn = (tool: ToolRegistration): tool is ToolRegistrationFn => {
  return typeof tool === 'function';
};

export const wrapToolRegistration = (tool: ToolDirectRegistration): ToolRegistrationFn => {
  return () => {
    return [tool];
  };
};

export interface BuiltinToolRegistry extends InternalToolProvider {
  register(tool: RegisteredTool): void;
}

export const createBuiltinToolRegistry = (): BuiltinToolRegistry => {
  return new BuiltinToolRegistryImpl();
};

const isValidSource = (source: ToolSourceType) => {
  return source === ToolSourceType.builtIn || source === ToolSourceType.unknown;
};

export class BuiltinToolRegistryImpl implements BuiltinToolRegistry {
  private registrations: ToolRegistrationFn[] = [];

  constructor() {}

  register(registration: RegisteredTool) {
    this.registrations.push(
      isToolRegistrationFn(registration) ? registration : wrapToolRegistration(registration)
    );
  }

  async has(options: { toolId: ToolIdentifier; request: KibanaRequest }): Promise<boolean> {
    const { toolId: structuredToolId, request } = options;
    const { toolId, sourceType } = toStructuredToolIdentifier(structuredToolId);

    if (!isValidSource(sourceType)) {
      return false;
    }

    for (const registration of this.registrations) {
      const tools = await this.eval(registration, { request });
      for (const tool of tools) {
        if (tool.id === toolId) {
          return true;
        }
      }
    }

    return false;
  }

  async get(options: {
    toolId: ToolIdentifier;
    request: KibanaRequest;
  }): Promise<RegisteredToolWithMeta> {
    const { toolId: structuredToolId, request } = options;
    const { toolId, sourceType } = toStructuredToolIdentifier(structuredToolId);

    if (!isValidSource(sourceType)) {
      throw OnechatErrorUtils.createToolNotFoundError({
        toolId: toSerializedToolIdentifier(toolId),
      });
    }

    for (const registration of this.registrations) {
      const tools = await this.eval(registration, { request });
      for (const tool of tools) {
        if (tool.id === toolId) {
          return addBuiltinSystemMeta(tool);
        }
      }
    }

    throw OnechatErrorUtils.createToolNotFoundError({
      toolId: toSerializedToolIdentifier(toolId),
    });
  }

  async list(options: { request: KibanaRequest }): Promise<RegisteredToolWithMeta[]> {
    const { request } = options;
    const matchingTools: RegisteredToolWithMeta[] = [];

    for (const registration of this.registrations) {
      const tools = await this.eval(registration, { request });
      matchingTools.push(...tools.map((tool) => addBuiltinSystemMeta(tool)));
    }

    return matchingTools;
  }

  private async eval(
    registration: ToolRegistrationFn,
    { request }: { request: KibanaRequest }
  ): Promise<RegisteredTool[]> {
    return await registration({ request });
  }
}
