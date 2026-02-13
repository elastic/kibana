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
import type { SavedObjectsServiceStart } from '@kbn/core-saved-objects-server';
import type { UiSettingsServiceStart } from '@kbn/core-ui-settings-server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import { isAgentBuilderError, createInternalError } from '@kbn/agent-builder-common';
import type { PromptStorageState } from '@kbn/agent-builder-common/agents/prompts';
import type { Conversation, ConverseInput } from '@kbn/agent-builder-common';
import type {
  ScopedRunner,
  ScopedRunnerRunAgentParams,
  RunContext,
  Runner,
  RunToolReturn,
  RunAgentReturn,
  WritableToolResultStore,
  ModelProvider,
  HooksServiceStart,
} from '@kbn/agent-builder-server';
import type {
  ScopedRunnerRunToolsParams,
  ScopedRunnerRunInternalToolParams,
  ConversationStateManager,
  PromptManager,
  ToolManager,
} from '@kbn/agent-builder-server/runner';
import type { IFileStore } from '@kbn/agent-builder-server/runner/filestore';
import type { AttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import { createAttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import type { ToolsServiceStart } from '../tools';
import type { AgentsServiceStart } from '../agents';
import type { AttachmentServiceStart } from '../attachments';
import type { ModelProviderFactoryFn } from './model_provider';
import type { TrackingService } from '../../telemetry';
import { createEmptyRunContext, createConversationStateManager, createToolManager } from './utils';
import { createPromptManager, getAgentPromptStorageState } from './utils/prompts';
import { runTool, runInternalTool } from './run_tool';
import { runAgent } from './run_agent';
import { createStore } from './store';
import type { SkillServiceStart } from '../skills';

export interface CreateScopedRunnerDeps {
  // core services
  elasticsearch: ElasticsearchServiceStart;
  security: SecurityServiceStart;
  savedObjects: SavedObjectsServiceStart;
  uiSettings: UiSettingsServiceStart;
  // external plugin deps
  spaces: SpacesPluginStart | undefined;
  actions: ActionsPluginStart;
  // internal service deps
  modelProvider: ModelProvider;
  toolsService: ToolsServiceStart;
  agentsService: AgentsServiceStart;
  attachmentsService: AttachmentServiceStart;
  promptManager: PromptManager;
  stateManager: ConversationStateManager;
  trackingService?: TrackingService;
  hooks: HooksServiceStart;
  // other deps
  logger: Logger;
  request: KibanaRequest;
  defaultConnectorId?: string;
  /**
   * Optional abort signal for the run (e.g. from the request).
   * Propagated to hooks so they can respect cancellation.
   */
  abortSignal?: AbortSignal;
  // context-aware deps
  resultStore: WritableToolResultStore;
  attachmentStateManager: AttachmentStateManager;
  skillServiceStart: SkillServiceStart;
  toolManager: ToolManager;
  filestore: IFileStore;
}

export type CreateRunnerDeps = Omit<
  CreateScopedRunnerDeps,
  | 'request'
  | 'defaultConnectorId'
  | 'resultStore'
  | 'attachmentStateManager'
  | 'modelProvider'
  | 'promptManager'
  | 'stateManager'
  | 'filestore'
  | 'toolManager'
> & {
  modelProviderFactory: ModelProviderFactoryFn;
};

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
      runTool: <TParams = Record<string, unknown>>(
        toolExecutionParams: ScopedRunnerRunToolsParams<TParams>
      ): Promise<RunToolReturn> => {
        try {
          return runTool<TParams>({ toolExecutionParams, parentManager: this });
        } catch (e) {
          if (isAgentBuilderError(e)) {
            throw e;
          } else {
            throw createInternalError(e.message);
          }
        }
      },
      runInternalTool: <TParams = Record<string, unknown>>(
        toolExecutionParams: ScopedRunnerRunInternalToolParams<TParams>
      ): Promise<RunToolReturn> => {
        try {
          return runInternalTool<TParams>({ toolExecutionParams, parentManager: this });
        } catch (e) {
          if (isAgentBuilderError(e)) {
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
          if (isAgentBuilderError(e)) {
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
  const { modelProviderFactory, ...runnerDeps } = deps;

  const createScopedRunnerWithDeps = ({
    request,
    defaultConnectorId,
    conversation,
    nextInput,
    promptState,
    abortSignal,
  }: {
    request: KibanaRequest;
    defaultConnectorId?: string;
    conversation?: Conversation;
    nextInput?: ConverseInput;
    promptState?: PromptStorageState;
    abortSignal?: AbortSignal;
  }): ScopedRunner => {
    const { resultStore, skillsStore, filestore } = createStore({ conversation, runnerDeps });

    const attachmentStateManager = createAttachmentStateManager(conversation?.attachments ?? [], {
      getTypeDefinition: runnerDeps.attachmentsService.getTypeDefinition,
    });

    const stateManager = createConversationStateManager(conversation);
    const promptManager = createPromptManager({ state: promptState });
    const toolManager = createToolManager();

    const modelProvider = modelProviderFactory({ request, defaultConnectorId });
    const allDeps = {
      ...runnerDeps,
      modelProvider,
      request,
      defaultConnectorId,
      abortSignal,
      resultStore,
      skillsStore,
      attachmentStateManager,
      stateManager,
      promptManager,
      filestore,
      toolManager,
    };
    return createScopedRunner(allDeps);
  };

  return {
    runTool: (runToolParams) => {
      const { request, defaultConnectorId, promptState, abortSignal, ...otherParams } =
        runToolParams;
      const runner = createScopedRunnerWithDeps({
        request,
        promptState,
        defaultConnectorId,
        abortSignal,
      });
      return runner.runTool(otherParams);
    },
    runInternalTool: (runToolParams) => {
      const { request, defaultConnectorId, promptState, abortSignal, ...otherParams } =
        runToolParams;
      const runner = createScopedRunnerWithDeps({
        request,
        promptState,
        defaultConnectorId,
        abortSignal,
      });
      return runner.runInternalTool(otherParams);
    },
    runAgent: (params) => {
      const { request, defaultConnectorId, abortSignal, ...otherParams } = params;
      const { nextInput, conversation } = params.agentParams;
      const runner = createScopedRunnerWithDeps({
        request,
        defaultConnectorId,
        conversation,
        nextInput,
        abortSignal,
        promptState: getAgentPromptStorageState({
          input: nextInput,
          conversation,
        }),
      });
      return runner.runAgent(otherParams);
    },
  };
};
