/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StateGraph } from '@langchain/langgraph';
import {
  AIMessage,
  HumanMessage,
  SystemMessage,
  ToolMessage,
  isAIMessage,
} from '@langchain/core/messages';
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
import {
  createSystemPrompt,
  createUserPrompt,
  createValidationFailureMessage,
} from './prompts';
import type { Action } from './types';

export interface CreateGraphArgs {
  model: ScopedModel;
  api: WorkflowsManagementApi;
  request: KibanaRequest;
  spaceId: string;
  logger: Logger;
}

export const createGenerateWorkflowGraph = ({
  model,
  api,
  request,
  spaceId,
}: CreateGraphArgs) => {
  const tools = buildBoundTools();
  const modelWithTools = model.chatModel.bindTools!(tools);
  const dispatchDeps = { api, spaceId, request };

  const prefetchNode = async (state: StateType): Promise<Partial<StateType>> => {
    const [connectors, stepDefinitions, triggerDefinitions] = await Promise.all([
      prefetchConnectors({ api, spaceId, request }),
      prefetchStepDefinitions({ api, spaceId, request }),
      prefetchTriggerDefinitions(),
    ]);

    const prefetched = { connectors, stepDefinitions, triggerDefinitions };
    const systemPrompt = createSystemPrompt({
      prefetched,
      additionalInstructions: state.additionalInstructions,
    });
    const userPromptArr = createUserPrompt({
      nlQuery: state.nlQuery,
      additionalContext: state.additionalContext,
    }) as ['user', string];

    return {
      prefetched,
      messages: [new SystemMessage(systemPrompt), new HumanMessage(userPromptArr[1])],
    };
  };

  const agentNode = async (state: StateType): Promise<Partial<StateType>> => {
    const aiMessage = await modelWithTools.invoke(state.messages);
    const toolCalls = isAIMessage(aiMessage) ? aiMessage.tool_calls ?? [] : [];

    const action: Action = {
      type: 'agent_step',
      toolCalls: toolCalls.map((tc) => ({ name: tc.name, args: tc.args })),
      text: typeof aiMessage.content === 'string' ? aiMessage.content : undefined,
    };

    return {
      messages: [aiMessage],
      actions: [action],
    };
  };

  const branchAfterAgent = (state: StateType): 'tools' | 'validate' => {
    const last = state.messages[state.messages.length - 1];
    const calls = isAIMessage(last) ? last.tool_calls ?? [] : [];
    return calls.length > 0 ? 'tools' : 'validate';
  };

  const toolsNode = async (state: StateType): Promise<Partial<StateType>> => {
    const last = state.messages[state.messages.length - 1] as AIMessage;
    const calls = last.tool_calls ?? [];

    let yaml = state.yaml;
    const toolMessages: ToolMessage[] = [];
    const newActions: Action[] = [];

    for (const call of calls) {
      const result = await dispatchToolCall(
        { yaml },
        { name: call.name, args: call.args },
        dispatchDeps
      );
      if (result.yaml !== undefined) {
        yaml = result.yaml;
      }
      toolMessages.push(
        new ToolMessage({
          tool_call_id: call.id ?? '',
          name: call.name,
          content: JSON.stringify(result.message),
        })
      );
      newActions.push({
        type: 'tool_result',
        name: call.name,
        success: result.message.success,
        error: result.message.error,
      });
    }

    return { yaml, messages: toolMessages, actions: newActions };
  };

  const validateNode = async (state: StateType): Promise<Partial<StateType>> => {
    const validation = await validateGeneratedYaml(state.yaml, dispatchDeps);
    const nextAttempts = state.validationAttempts + 1;

    const update: Partial<StateType> = {
      validation,
      validationAttempts: nextAttempts,
      actions: [{ type: 'validate', valid: validation.valid, errors: validation.errors }],
    };

    if (!validation.valid && nextAttempts < state.maxRetries) {
      const failureMsg = createValidationFailureMessage(validation.errors) as ['user', string];
      update.messages = [new HumanMessage(failureMsg[1])];
    }

    return update;
  };

  const branchAfterValidate = (state: StateType): 'agent' | 'finalize' => {
    if (state.validation?.valid) return 'finalize';
    if (state.validationAttempts >= state.maxRetries) return 'finalize';
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
