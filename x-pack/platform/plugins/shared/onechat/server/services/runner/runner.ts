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
import type {
  ToolHandlerContext,
  ScopedRunner,
  ScopedRunnerRunToolsParams,
  RunContext,
  Runner,
} from '@kbn/onechat-server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import type { ToolsServiceStart } from '../tools';
import { createModelProvider } from './model_provider';
import { creatEmptyRunContext, createChildContextForToolRun } from './utils/run_context';
import { createEventEmitter, createNoopEventEmitter } from './utils/events';

export interface CreateScopedRunnerDeps {
  // core services
  elasticsearch: ElasticsearchServiceStart;
  security: SecurityServiceStart;
  // plugin deps
  inference: InferenceServerStart;
  actions: ActionsPluginStart;
  // internal service deps
  toolsService: ToolsServiceStart;
  // other deps
  logger: Logger;
  request: KibanaRequest;
  defaultConnectorId?: string;
}

export type CreateRunnerDeps = Omit<CreateScopedRunnerDeps, 'request' | 'defaultConnectorId'>;

class RunnerManager {
  public readonly deps: CreateScopedRunnerDeps;
  public readonly context: RunContext;

  constructor(deps: CreateScopedRunnerDeps, context?: RunContext) {
    this.deps = deps;
    this.context = context ?? creatEmptyRunContext();
  }

  getRunner(): ScopedRunner {
    return {
      runTool: <TResult = unknown>(toolExecutionParams: ScopedRunnerRunToolsParams) => {
        return runTool<TResult>({ toolExecutionParams, parentManager: this });
      },
    };
  }

  child(childContext: RunContext): RunnerManager {
    return new RunnerManager(this.deps, childContext);
  }
}

const runTool = async <TResult = unknown>({
  toolExecutionParams,
  parentManager,
}: {
  toolExecutionParams: ScopedRunnerRunToolsParams;
  parentManager: RunnerManager;
}): Promise<TResult> => {
  const { toolId, toolParams } = toolExecutionParams;

  const context = createChildContextForToolRun({ parentContext: parentManager.context, toolId });
  const manager = parentManager.child(context);

  const { toolsService, request } = manager.deps;

  const tool = await toolsService.provider.get({ toolId, request });

  // TODO: send toolCall event

  const toolHandlerContext = createToolHandlerContext({ toolExecutionParams, manager });

  const toolResult = await tool.handler(toolParams, toolHandlerContext);

  // TODO: send toolResult event

  return toolResult as TResult;
};

export const createToolHandlerContext = ({
  manager,
  toolExecutionParams,
}: {
  toolExecutionParams: ScopedRunnerRunToolsParams;
  manager: RunnerManager;
}): ToolHandlerContext => {
  const { onEvent } = toolExecutionParams;
  const { inference, actions, request, defaultConnectorId, elasticsearch } = manager.deps;
  return {
    esClient: elasticsearch.client.asScoped(request),
    modelProvider: createModelProvider({ inference, actions, request, defaultConnectorId }),
    runner: manager.getRunner(),
    events: onEvent
      ? createEventEmitter({ eventHandler: onEvent, context: manager.context })
      : createNoopEventEmitter(),
  };
};

export const createScopedRunner = (deps: CreateScopedRunnerDeps): ScopedRunner => {
  const manager = new RunnerManager(deps, creatEmptyRunContext());
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
