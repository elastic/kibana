/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { ToolDescriptor, ToolIdentifier } from '@kbn/onechat-common';
import type { ToolProvider } from '@kbn/onechat-server';
import { ToolRegistration } from './builtin_registry';

export interface ToolsServiceSetup {
  register(toolRegistration: ToolRegistration): void;
}

// type alias for now, we may extend later.
export type InternalToolRegistry = ToolProvider;

export interface ToolsServiceStart {
  /**
   * Main tool provider exposing all tools
   */
  registry: InternalToolRegistry;

  getScopedRegistry: ScopedPublicToolRegistryFactoryFn;
}

/**
 * Public tool registry exposed from the plugin's contract,
 * and pre-bound to a given request.
 */
export interface ScopedPublicToolRegistry {
  has(toolId: ToolIdentifier): Promise<boolean>;
  get(toolId: ToolIdentifier): Promise<ToolDescriptor>;
  list(options?: {}): Promise<ToolDescriptor[]>;
}

export type ScopedPublicToolRegistryFactoryFn = (opts: {
  request: KibanaRequest;
}) => ScopedPublicToolRegistry;
