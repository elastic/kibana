/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ZodObject } from '@kbn/zod';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { ToolDescriptorMeta, ToolIdentifier } from '@kbn/onechat-common';
import type {
  ToolProvider,
  BuiltinToolDefinition,
  RegisteredToolProvider,
  ToolProviderHasOptions,
  ToolProviderGetOptions,
  ToolProviderListOptions,
  ExecutableTool,
} from '@kbn/onechat-server';
import { ToolClient } from './tool_client';

export interface ToolsServiceSetup {
  register<RunInput extends ZodObject<any>, RunOutput = unknown>(
    tool: BuiltinToolDefinition<RunInput, RunOutput>
  ): void;
  registerProvider(id: string, provider: RegisteredToolProvider): void;
}

export interface ToolsServiceStart {
  /**
   * Internal tool registry, exposing internal APIs to interact with tool providers.
   */
  registry: InternalToolRegistry;

  createClient(opts: { request: KibanaRequest }): Promise<ToolClient>;
}

/**
 * Registered tool with full meta.
 */
export type RegisteredToolWithMeta<
  RunInput extends ZodObject<any> = ZodObject<any>,
  RunOutput = unknown
> = Omit<BuiltinToolDefinition<RunInput, RunOutput>, 'meta'> & {
  meta: ToolDescriptorMeta;
};

/**
 * Internal tool provider interface
 */
export interface InternalToolProvider {
  has(options: ToolProviderHasOptions): Promise<boolean>;
  get(options: ToolProviderGetOptions): Promise<RegisteredToolWithMeta>;
  list(options: ToolProviderListOptions): Promise<RegisteredToolWithMeta[]>;
}

export interface RegisteredToolProviderWithId extends RegisteredToolProvider {
  id: string;
}

/**
 * Internal registry interface for the runner to interact with
 */
export interface InternalToolRegistry extends InternalToolProvider {
  asPublicRegistry: () => PublicToolRegistry;
  asScopedPublicRegistry: ScopedPublicToolRegistryFactoryFn;
}

// type alias for now, we may extend later.
export type PublicToolRegistry = ToolProvider;

/**
 * Public tool registry exposed from the plugin's contract,
 * and pre-bound to a given request.
 */
export interface ScopedPublicToolRegistry {
  has(toolId: ToolIdentifier): Promise<boolean>;
  get(toolId: ToolIdentifier): Promise<ExecutableTool>;
  list(options?: {}): Promise<ExecutableTool[]>;
}

export type ScopedPublicToolRegistryFactoryFn = (opts: {
  request: KibanaRequest;
}) => ScopedPublicToolRegistry;
