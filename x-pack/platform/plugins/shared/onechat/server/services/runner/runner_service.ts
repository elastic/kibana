/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { RunnerServiceStartDeps } from './types';
import { createToolHandlerContextFactory } from './run_context';

type ScopedParams<T extends { request: KibanaRequest }> = Omit<T, 'request'>;

export interface ToolExecutionParams<TParams = Record<string, unknown>> {
  request: KibanaRequest;
  toolId: string;
  toolParams: TParams;
}

export interface OnechatRunner {
  runTool: <TResult = unknown>(params: ToolExecutionParams) => Promise<TResult>;
}

export type ScopedToolExecutionParams<TParams = Record<string, unknown>> = ScopedParams<
  ToolExecutionParams<TParams>
>;

export interface ScopedOnechatRunner {
  runTool: <TResult = unknown>(params: ScopedToolExecutionParams) => Promise<TResult>;
}

//////

export class RunnerService {
  constructor() {}

  setup() {}

  start({ toolsService, actions, inference, elasticsearch }: RunnerServiceStartDeps) {
    const handlerContextFactory = createToolHandlerContextFactory({
      actions,
      elasticsearch,
      inference,
    });

    const runner: OnechatRunner = {
      runTool: async <TResult = unknown>(params: ToolExecutionParams) => {
        const { toolId, toolParams, request } = params;
        const tool = await toolsService.provider.get({ toolId, request });

        const handlerContext = await handlerContextFactory({ request });

        const toolResult = await tool.handler(toolParams, handlerContext);

        return toolResult as TResult;
      },
    };

    return runner;
  }
}
