/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { ElasticsearchServiceStart } from '@kbn/core-elasticsearch-server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { SecurityServiceStart } from '@kbn/core-security-server';
import { isOnechatError, createInternalError } from '@kbn/onechat-common';
import type {
  ToolHandlerContext,
  ScopedRunner,
  ScopedRunnerRunToolsParams,
  RunContext,
  Runner,
  RunToolReturn,
} from '@kbn/onechat-server';
import type { ToolsServiceStart } from '../tools';
import { ModelProviderFactoryFn } from './model_provider';
import { createEmptyRunContext, forkContextForToolRun } from './utils/run_context';
import { createEventEmitter, createNoopEventEmitter } from './utils/events';

export interface CreateScopedRunnerDeps {
  // core services
  elasticsearch: ElasticsearchServiceStart;
  security: SecurityServiceStart;
  // internal service deps
  modelProviderFactory: ModelProviderFactoryFn;
  toolsService: ToolsServiceStart;
  // other deps
  logger: Logger;
  request: KibanaRequest;
  defaultConnectorId?: string;
}

export type CreateRunnerDeps = Omit<CreateScopedRunnerDeps, 'request' | 'defaultConnectorId'>;

export class RunnerManager {
  public readonly deps: CreateScopedRunnerDeps;
  public readonly context: RunContext;

  constructor(deps: CreateScopedRunnerDeps, context?: RunContext) {
    this.deps = deps;
    this.context = context ?? createEmptyRunContext();
  }

  getRunner(): ScopedRunner {
    return {
      runTool: <TParams = Record<string, unknown>, TResult = unknown>(
        toolExecutionParams: ScopedRunnerRunToolsParams<TParams>
      ): Promise<RunToolReturn<TResult>> => {
        try {
          return runTool<TParams, TResult>({ toolExecutionParams, parentManager: this });
        } catch (e) {
          if (isOnechatError(e)) {
            throw e;
          } else {
            throw createInternalError(e.message);
          }
        }
      },
    };
  }

  createChild(childContext: RunContext): RunnerManager {
    return new RunnerManager(this.deps, childContext);
  }
}

export const runTool = async <TParams = Record<string, unknown>, TResult = unknown>({
  toolExecutionParams,
  parentManager,
}: {
  toolExecutionParams: ScopedRunnerRunToolsParams<TParams>;
  parentManager: RunnerManager;
}): Promise<RunToolReturn<TResult>> => {
  const { toolId, toolParams } = toolExecutionParams;

  const context = forkContextForToolRun({ parentContext: parentManager.context, toolId });
  const manager = parentManager.createChild(context);

  const { toolsService, request } = manager.deps;

  const tool = await toolsService.registry.get({ toolId, request });

  const toolHandlerContext = createToolHandlerContext<TParams>({ toolExecutionParams, manager });

  const toolResult = await tool.handler(toolParams as Record<string, any>, toolHandlerContext);

  return {
    result: toolResult as TResult,
  };
};

export const createToolHandlerContext = <TParams = Record<string, unknown>>({
  manager,
  toolExecutionParams,
}: {
  toolExecutionParams: ScopedRunnerRunToolsParams<TParams>;
  manager: RunnerManager;
}): ToolHandlerContext => {
  const { onEvent } = toolExecutionParams;
  const { request, defaultConnectorId, elasticsearch, modelProviderFactory } = manager.deps;
  return {
    request,
    esClient: elasticsearch.client.asScoped(request),
    modelProvider: modelProviderFactory({ request, defaultConnectorId }),
    runner: manager.getRunner(),
    events: onEvent
      ? createEventEmitter({ eventHandler: onEvent, context: manager.context })
      : createNoopEventEmitter(),
  };
};

export const createScopedRunner = (deps: CreateScopedRunnerDeps): ScopedRunner => {
  const manager = new RunnerManager(deps, createEmptyRunContext());
  return manager.getRunner();
};

export const createRunner = (deps: CreateRunnerDeps): Runner => {
  return {
    runTool: (runToolsParams) => {
      const { request, defaultConnectorId, ...otherParams } = runToolsParams;
      const allDeps = { ...deps, request, defaultConnectorId };
      const runner = createScopedRunner(allDeps);
      return runner.runTool(otherParams);
    },
  };
};
