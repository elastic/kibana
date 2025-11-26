/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StateGraph, START as _START_, END as _END_ } from '@langchain/langgraph';
import type { StructuredTool } from '@langchain/core/tools';
import type { BaseMessage } from '@langchain/core/messages';
import type { Logger } from '@kbn/core/server';
import type { InferenceChatModel } from '@kbn/inference-langchain';
import type { ResolvedAgentCapabilities } from '@kbn/onechat-common';
import { AgentExecutionErrorCode as ErrCodes } from '@kbn/onechat-common/agents';
import { createAgentExecutionError } from '@kbn/onechat-common/base/errors';
import type { AgentEventEmitter } from '@kbn/onechat-server';
import { createReasoningEvent, extractTextContent } from '@kbn/onechat-genai-utils/langchain';
import { createDeepAgent, createSkillsMiddleware } from '@kbn/securitysolution-deep-agent';
import type { SkillsRegistry } from '@kbn/onechat-server';
import type { ResolvedConfiguration } from '../types';
import { convertError, isRecoverableError } from '../utils/errors';
import { getActPrompt, getAnswerPrompt } from './prompts';
import { getRandomAnsweringMessage, getRandomThinkingMessage } from './i18n';
import { steps, tags } from './constants';
import type { StateType } from './state';
import { StateAnnotation } from './state';
import { processAnswerResponse } from './action_utils';
import {
  isHandoverAction,
  isAgentErrorAction,
  isAnswerAction,
  errorAction,
  handoverAction,
} from './actions';

// number of successive recoverable errors we try to recover from before throwing
const MAX_ERROR_COUNT = 2;

export const createAgentGraph = ({
  chatModel,
  tools,
  configuration,
  capabilities,
  logger,
  events,
  skillsService,
  request,
  toolHandlerContext,
}: {
  chatModel: InferenceChatModel;
  tools: StructuredTool[];
  capabilities: ResolvedAgentCapabilities;
  configuration: ResolvedConfiguration;
  logger: Logger;
  events: AgentEventEmitter;
  skillsService?: {
    getRegistry: (opts: { request: import('@kbn/core-http-server').KibanaRequest }) => Promise<{
      get: (skillId: string) => Promise<any>;
      list: (opts?: { category?: string }) => Promise<any[]>;
      search: (query: string, category?: string) => any[];
    }>;
  } | (() => SkillsRegistry);
  request?: import('@kbn/core-http-server').KibanaRequest;
  toolHandlerContext?: import('@kbn/onechat-server').ToolHandlerContext;
}) => {
  // Extract the system prompt from getActPrompt for the deep agent
  const researchPromptMessages = getActPrompt({
    customInstructions: configuration.research.instructions,
    capabilities,
    initialMessages: [],
    actions: [],
  });
  // Extract system prompt from the first message tuple [role, content]
  const firstMessage = researchPromptMessages[0];
  const systemPrompt = Array.isArray(firstMessage) ? (firstMessage[1] as string) : '';

  // Build middleware array
  const middleware = [];

  // Add skills middleware if request is available
  // For Solution 2, skillsService will be a function that returns the simple registry
  // For Solution 1, skillsService will be the full service with getRegistry method
  if (request) {
    middleware.push(
      createSkillsMiddleware({
        getSkillsRegistry: async (req) => {
          // If skillsService is a function, it's the simple registry getter (Solution 2)
          if (typeof skillsService === 'function') {
            return Promise.resolve(skillsService());
          }
          // If skillsService has getRegistry, use it (Solution 1)
          if (skillsService?.getRegistry) {
            return skillsService.getRegistry({ request: req });
          }
          // Fallback: use the simple registry directly (Solution 2)
          const { getSkillsRegistry } = await import('@kbn/onechat-server');
          return Promise.resolve(getSkillsRegistry());
        },
        getRequest: () => request,
        getToolHandlerContext: () => toolHandlerContext,
      })
    );
  }

  // Create the deep agent instance for research
  const deepAgentInstance = createDeepAgent({
    systemPrompt,
    model: chatModel,
    tools,
    middleware,
  });

  const deepAgent = async (state: StateType) => {
    if (state.mainActions.length === 0 && state.errorCount === 0) {
      events.emit(createReasoningEvent(getRandomThinkingMessage(), { transient: true }));
    }
    try {
      // Invoke the deep agent with initial messages
      const result = await deepAgentInstance.invoke(
        {
          messages: state.initialMessages,
          files: {},
        },
        {
          recursionLimit: 100,
        }
      );

      // Extract the final message from the deep agent result
      const messages = result.messages as BaseMessage[];
      const lastMessage = messages[messages.length - 1];
      const textContent = extractTextContent(lastMessage);

      // Convert the output to a handover action
      const action = handoverAction(textContent || '', false);

      return {
        mainActions: [action],
        currentCycle: state.currentCycle + 1,
        errorCount: 0,
      };
    } catch (error) {
      const executionError = convertError(error);
      if (isRecoverableError(executionError)) {
        return {
          mainActions: [errorAction(executionError)],
          errorCount: state.errorCount + 1,
        };
      } else {
        throw executionError;
      }
    }
  };

  const researchAgentEdge = async (state: StateType) => {
    const lastAction = state.mainActions[state.mainActions.length - 1];

    if (isAgentErrorAction(lastAction)) {
      if (state.errorCount <= MAX_ERROR_COUNT) {
        return steps.researchAgent;
      } else {
        // max error count reached, stop execution by throwing
        throw lastAction.error;
      }
    } else if (isHandoverAction(lastAction)) {
      return steps.prepareToAnswer;
    }

    throw invalidState(`[researchAgentEdge] last action type was ${lastAction.type}}`);
  };

  const prepareToAnswer = async (state: StateType) => {
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const lastAction = state.mainActions[state.mainActions.length - 1];
    const maxCycleReached = state.currentCycle > state.cycleLimit;

    if (maxCycleReached && !isHandoverAction(lastAction)) {
      return {
        actions: [handoverAction('', true)],
      };
    } else {
      return {};
    }
  };

  const answeringModel = chatModel.withConfig({
    tags: [tags.agent, tags.answerAgent],
  });

  const answerAgent = async (state: StateType) => {
    if (state.answerActions.length === 0 && state.errorCount === 0) {
      events.emit(createReasoningEvent(getRandomAnsweringMessage(), { transient: true }));
    }
    try {
      const response = await answeringModel.invoke(
        getAnswerPrompt({
          customInstructions: configuration.answer.instructions,
          capabilities,
          initialMessages: state.initialMessages,
          actions: state.mainActions,
          answerActions: state.answerActions,
        })
      );

      const action = processAnswerResponse(response);

      return {
        answerActions: [action],
        errorCount: 0,
      };
    } catch (error) {
      const executionError = convertError(error);
      if (isRecoverableError(executionError)) {
        return {
          answerActions: [errorAction(executionError)],
          errorCount: state.errorCount + 1,
        };
      } else {
        throw executionError;
      }
    }
  };

  const answerAgentEdge = async (state: StateType) => {
    const lastAction = state.answerActions[state.answerActions.length - 1];

    if (isAgentErrorAction(lastAction)) {
      if (state.errorCount <= MAX_ERROR_COUNT) {
        return steps.answerAgent;
      } else {
        // max error count reached, stop execution by throwing
        throw lastAction.error;
      }
    } else if (isAnswerAction(lastAction)) {
      return steps.finalize;
    }

    // @ts-expect-error - lastAction.type is never because we cover all use cases.
    throw invalidState(`[answerAgentEdge] last action type was ${lastAction.type}}`);
  };

  const finalize = async (state: StateType) => {
    const answerAction = state.answerActions[state.answerActions.length - 1];
    if (isAnswerAction(answerAction)) {
      return {
        finalAnswer: answerAction.message,
      };
    } else {
      throw invalidState(`[finalize] expect answer action, got ${answerAction.type} instead.`);
    }
  };

  // note: the node names are used in the event convertion logic, they should *not* be changed
  const graph = new StateGraph(StateAnnotation)
    // nodes
    .addNode(steps.researchAgent, deepAgent)
    .addNode(steps.prepareToAnswer, prepareToAnswer)
    .addNode(steps.answerAgent, answerAgent)
    .addNode(steps.finalize, finalize)
    // edges
    .addEdge(_START_, steps.researchAgent)
    .addConditionalEdges(steps.researchAgent, researchAgentEdge, {
      [steps.researchAgent]: steps.researchAgent,
      [steps.prepareToAnswer]: steps.prepareToAnswer,
    })
    .addEdge(steps.prepareToAnswer, steps.answerAgent)
    .addConditionalEdges(steps.answerAgent, answerAgentEdge, {
      [steps.answerAgent]: steps.answerAgent,
      [steps.finalize]: steps.finalize,
    })
    .addEdge(steps.finalize, _END_)
    .compile();

  return graph;
};

const invalidState = (message: string) => {
  return createAgentExecutionError(message, ErrCodes.invalidState, {});
};
