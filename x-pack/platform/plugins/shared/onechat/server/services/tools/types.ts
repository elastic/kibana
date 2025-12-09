/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ZodObject } from '@kbn/zod';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { StaticToolRegistration } from '@kbn/onechat-server/tools';
import type { AnyToolTypeDefinition } from './tool_types';
import type { ToolRegistry } from './tool_registry';

export interface ToolsServiceSetup {
  register<RunInput extends ZodObject<any>>(tool: StaticToolRegistration<RunInput>): void;
}

export interface ToolsServiceStart {
  /**
   * Create a registry scoped to the current user and context.
   */
  getRegistry(opts: { request: KibanaRequest }): Promise<ToolRegistry>;
  /**
   * Returns the list of available tool definitions.
   */
  getToolDefinitions(): AnyToolTypeDefinition[];
}
