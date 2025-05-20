/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MaybePromise } from '@kbn/utility-types';
import type { KibanaRequest } from '@kbn/core-http-server';
import type {
  Tool,
  ToolProvider,
  ToolProviderHasOptions,
  ToolProviderGetOptions,
  ToolProviderListOptions,
} from '@kbn/onechat-server';

export type ToolRegistrationFn = (opts: { request: KibanaRequest }) => MaybePromise<Tool[]>;
export type ToolDirectRegistration = Tool;

export type ToolRegistration = ToolDirectRegistration | ToolRegistrationFn;

export const isToolRegistrationFn = (tool: ToolRegistration): tool is ToolRegistrationFn => {
  return typeof tool === 'function';
};

export const wrapToolRegistration = (tool: ToolDirectRegistration): ToolRegistrationFn => {
  return () => {
    return [tool];
  };
};

export class BuiltinToolRegistry implements ToolProvider {
  private registrations: ToolRegistrationFn[] = [];

  constructor() {}

  register(registration: ToolRegistration) {
    if (isToolRegistrationFn(registration)) {
      this.registrations.push(registration);
    } else {
      this.registrations.push(wrapToolRegistration(registration));
    }
  }

  async has(options: ToolProviderHasOptions): Promise<boolean> {
    const { toolId, request } = options;

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

  async get(options: ToolProviderGetOptions): Promise<Tool> {
    const { toolId, request } = options;

    for (const registration of this.registrations) {
      const tools = await this.eval(registration, { request });
      for (const tool of tools) {
        if (tool.id === toolId) {
          return tool;
        }
      }
    }

    // TODO: onechat error
    throw new Error('Method not implemented.');
  }

  async list(options: ToolProviderListOptions): Promise<Tool[]> {
    const { request } = options;
    const matchingTools: Tool[] = [];

    for (const registration of this.registrations) {
      const tools = await this.eval(registration, { request });
      matchingTools.push(...tools);
    }

    return matchingTools;
  }

  private async eval(
    registration: ToolRegistrationFn,
    { request }: { request: KibanaRequest }
  ): Promise<Tool[]> {
    return await registration({ request });
  }
}
