/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StateGraph } from '@langchain/langgraph';
import { isAIMessage } from '@langchain/core/messages';
import type { Logger } from '@kbn/logging';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { ScopedModel } from '@kbn/agent-builder-server';
import type { WorkflowsManagementApi } from '@kbn/workflows-management-plugin/server';
import {
  prefetchConnectors,
  prefetchStepDefinitions,
  prefetchTriggerDefinitions,
} from './prefetch';
import { StateAnnotation, type StateType } from './state';
import { buildBoundTools } from './tools/schemas';
import { dispatchToolCall } from './tools/dispatch';
import { validateGeneratedYaml } from './validate';
import { buildMessagesFromActions } from './build_messages';
import {
  agentStepAction,
  findLastAgentStep,
  toolResultAction,
  validateAction,
} from './actions';
import type { Action } from './types';

export interface CreateGraphArgs {
  model: ScopedModel;
  api: WorkflowsManagementApi;
  request: KibanaRequest;
  spaceId: string;
  logger: Logger;
}

export const createGenerateWorkflowGraph = ({ model, api, request, spaceId }: CreateGraphArgs) => {
  const tools = buildBoundTools();
  const modelWithTools = model.chatModel.bindTools!(tools);
  const dispatchDeps = { api, spaceId, request };

  const prefetchNode = async (_state: StateType): Promise<Partial<StateType>> => {
    const [connectors, stepDefinitions, triggerDefinitions] = await Promise.all([
      prefetchConnectors({ api, spaceId, request }),
      prefetchStepDefinitions({ api, spaceId, request }),
      prefetchTriggerDefinitions(),
    ]);

    return { prefetched: { connectors, stepDefinitions, triggerDefinitions } };
  };

  const agentNode = async (state: StateType): Promise<Partial<StateType>> => {
    const messages = buildMessagesFromActions(state);
    const aiMessage = await modelWithTools.invoke(messages);
    const toolCalls = isAIMessage(aiMessage) ? aiMessage.tool_calls ?? [] : [];

    return {
      actions: [
        agentStepAction({
          toolCalls: toolCalls.map((tc) => ({
            id: tc.id ?? '',
            name: tc.name,
            args: tc.args,
          })),
          text: typeof aiMessage.content === 'string' ? aiMessage.content : undefined,
        }),
      ],
    };
  };

  const branchAfterAgent = (state: StateType): 'tools' | 'validate' => {
    const lastAgentStep = findLastAgentStep(state.actions);
    return lastAgentStep && lastAgentStep.toolCalls.length > 0 ? 'tools' : 'validate';
  };

  const toolsNode = async (state: StateType): Promise<Partial<StateType>> => {
    const lastAgentStep = findLastAgentStep(state.actions);
    if (!lastAgentStep) return {};

    let yaml = state.yaml;
    const newActions: Action[] = [];

    for (const call of lastAgentStep.toolCalls) {
      const result = await dispatchToolCall(
        { yaml },
        { name: call.name, args: call.args },
        dispatchDeps
      );
      if (result.yaml !== undefined) {
        yaml = result.yaml;
      }
      newActions.push(
        toolResultAction({
          toolCallId: call.id,
          name: call.name,
          success: result.message.success,
          data: result.message.data,
          error: result.message.error,
        })
      );
    }

    return { yaml, actions: newActions };
  };

  const validateNode = async (state: StateType): Promise<Partial<StateType>> => {
    const validation = await validateGeneratedYaml(state.yaml, dispatchDeps);
    const nextAttempts = state.validationAttempts + 1;

    return {
      validation,
      validationAttempts: nextAttempts,
      actions: [validateAction({ valid: validation.valid, errors: validation.errors })],
    };
  };

  const branchAfterValidate = (state: StateType): 'agent' | 'finalize' => {
    if (state.validation?.valid) {
      return 'finalize';
    }
    if (state.validationAttempts >= state.maxRetries) {
      return 'finalize';
    }
    return 'agent';
  };

  const finalizeNode = async (_state: StateType): Promise<Partial<StateType>> => {
    return {};
  };

  return new StateGraph(StateAnnotation)
    .addNode('prefetch', prefetchNode)
    .addNode('agent', agentNode)
    .addNode('tools', toolsNode)
    .addNode('validate', validateNode)
    .addNode('finalize', finalizeNode)
    .addEdge('__start__', 'prefetch')
    .addEdge('prefetch', 'agent')
    .addConditionalEdges('agent', branchAfterAgent, {
      tools: 'tools',
      validate: 'validate',
    })
    .addEdge('tools', 'agent')
    .addConditionalEdges('validate', branchAfterValidate, {
      agent: 'agent',
      finalize: 'finalize',
    })
    .addEdge('finalize', '__end__')
    .compile();
};
