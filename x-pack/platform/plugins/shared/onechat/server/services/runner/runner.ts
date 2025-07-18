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
  ScopedRunner,
  ScopedRunnerRunToolsParams,
  ScopedRunnerRunAgentParams,
  RunContext,
  Runner,
  RunToolReturn,
  RunAgentReturn,
} from '@kbn/onechat-server';
import type { ToolsServiceStart } from '../tools';
import type { AgentsServiceStart } from '../agents';
import { ModelProviderFactoryFn } from './model_provider';
import { createEmptyRunContext } from './utils/run_context';
import { runTool } from './run_tool';
import { runAgent } from './run_agent';

export interface CreateScopedRunnerDeps {
  // core services
  elasticsearch: ElasticsearchServiceStart;
  security: SecurityServiceStart;
  // internal service deps
  modelProviderFactory: ModelProviderFactoryFn;
  toolsService: ToolsServiceStart;
  agentsService: AgentsServiceStart;
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

  // arrow function is required, risks of loosing context when passed down as handler.
  getRunner = (): ScopedRunner => {
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
      runAgent: (agentExecutionParams: ScopedRunnerRunAgentParams): Promise<RunAgentReturn> => {
        try {
          return runAgent({ agentExecutionParams, parentManager: this });
        } catch (e) {
          if (isOnechatError(e)) {
            throw e;
          } else {
            throw createInternalError(e.message);
          }
        }
      },
    };
  };

  createChild(childContext: RunContext): RunnerManager {
    return new RunnerManager(this.deps, childContext);
  }
}

export const createScopedRunner = (deps: CreateScopedRunnerDeps): ScopedRunner => {
  const manager = new RunnerManager(deps, createEmptyRunContext());
  return manager.getRunner();
};

export const createRunner = (deps: CreateRunnerDeps): Runner => {
  return {
    runTool: (runToolParams) => {
      const { request, defaultConnectorId, ...otherParams } = runToolParams;
      const allDeps = { ...deps, request, defaultConnectorId };
      const runner = createScopedRunner(allDeps);
      return runner.runTool(otherParams);
    },
    runAgent: (params) => {
      const { request, defaultConnectorId, ...otherParams } = params;
      const allDeps = { ...deps, request, defaultConnectorId };
      const runner = createScopedRunner(allDeps);
      return runner.runAgent(otherParams);
    },
  };
};
