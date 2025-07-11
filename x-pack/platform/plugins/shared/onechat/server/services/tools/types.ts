/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ZodObject } from '@kbn/zod';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { BuiltinToolDefinition } from '@kbn/onechat-server';
import { ToolRegistry } from './tool_registry';

export interface ToolsServiceSetup {
  register<RunInput extends ZodObject<any>, RunOutput = unknown>(
    tool: BuiltinToolDefinition<RunInput, RunOutput>
  ): void;
}

export interface ToolsServiceStart {
  /**
   * Create
   * @param opts
   */
  getRegistry(opts: { request: KibanaRequest }): Promise<ToolRegistry>;
}
