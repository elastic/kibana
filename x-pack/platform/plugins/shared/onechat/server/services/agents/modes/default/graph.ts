/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StateGraph, START as _START_, END as _END_ } from '@langchain/langgraph';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import type { StructuredTool } from '@langchain/core/tools';
import type { BaseMessage } from '@langchain/core/messages';
import type { Logger } from '@kbn/core/server';
import type { InferenceChatModel } from '@kbn/inference-langchain';
import type { ResolvedAgentCapabilities } from '@kbn/onechat-common';
import type { AgentEventEmitter } from '@kbn/onechat-server';
import { createReasoningEvent, createToolCallMessage } from '@kbn/onechat-genai-utils/langchain';
import type { ResolvedConfiguration } from '../types';
import { getActPrompt, getAnswerPrompt } from './prompts';
import { getRandomAnsweringMessage, getRandomThinkingMessage } from './i18n';
import { steps, tags } from './constants';
import type { StateType } from './state';
import { StateAnnotation } from './state';
import {
  processResearchResponse,
  processToolNodeResponse,
  processAnswerResponse,
} from './action_utils';
import { isToolCallAction, isHandoverAction, isAgentErrorAction, isAnswerAction } from './actions';

export const createAgentGraph = ({
  chatModel,
  tools,
  configuration,
  capabilities,
  logger,
  events,
}: {
  chatModel: InferenceChatModel;
  tools: StructuredTool[];
  capabilities: ResolvedAgentCapabilities;
  configuration: ResolvedConfiguration;
  logger: Logger;
  events: AgentEventEmitter;
}) => {
  const toolNode = new ToolNode<BaseMessage[]>(tools);

  const researcherModel = chatModel.bindTools(tools).withConfig({
    tags: [tags.agent, tags.researchAgent],
  });

  const researchAgent = async (state: StateType) => {
    if (state.mainActions.length === 0) {
      events.emit(createReasoningEvent(getRandomThinkingMessage(), { transient: true }));
    }
    try {
      const response = await researcherModel.invoke(
        getActPrompt({
          customInstructions: configuration.research.instructions,
          capabilities,
          initialMessages: state.initialMessages,
          actions: state.mainActions,
        })
      );

      const action = processResearchResponse(response);

      return {
        currentCycle: state.currentCycle + 1,
        mainActions: [action],
      };
    } catch (error) {
      // TODO: handle this and add an error action
      console.log('********');
      console.log(error.code);
      console.log(error.status);
      console.log(error.message);
      console.log(error.meta);
      console.log('******');
      //
      throw error;
    }
  };

  const shouldContinue = async (state: StateType) => {
    const lastAction = state.mainActions[state.mainActions.length - 1];

    const isToolCall = isToolCallAction(lastAction);
    const isHandover = isHandoverAction(lastAction);
    const isAgentError = isAgentErrorAction(lastAction);
    const maxCycleReached = state.currentCycle > state.cycleLimit;

    // TODO: handle error actions

    if (isToolCall && !maxCycleReached) {
      return steps.executeTool;
    } else {
      return steps.prepareToAnswer;
    }
    //
  };

  const executeTool = async (state: StateType) => {
    const lastAction = state.mainActions[state.mainActions.length - 1];
    if (!isToolCallAction(lastAction)) {
      throw new Error(
        `Error during executeTool: Invalid state - expected last action to be "tool_call" action, got "${lastAction.type}"`
      );
    }

    const toolCallMessage = createToolCallMessage(lastAction.tool_calls, lastAction.message);
    const toolNodeResult = await toolNode.invoke([toolCallMessage], {});
    const action = processToolNodeResponse(toolNodeResult);
    return {
      mainActions: [action],
    };
  };

  const prepareToAnswer = async (state: StateType) => {
    const maxCycleReached = state.currentCycle > state.cycleLimit;
    return {
      maxCycleReached,
    };
  };

  const answeringModel = chatModel.withConfig({
    tags: [tags.agent, tags.answerAgent],
  });

  const answerAgent = async (state: StateType) => {
    events.emit(createReasoningEvent(getRandomAnsweringMessage(), { transient: true }));
    try {
      const response = await answeringModel.invoke(
        getAnswerPrompt({
          customInstructions: configuration.answer.instructions,
          capabilities,
          searchInterrupted: state.maxCycleReached,
          initialMessages: state.initialMessages,
          actions: state.mainActions,
          answerActions: state.answerActions,
        })
      );

      const action = processAnswerResponse(response);

      return {
        answerActions: [action],
      };
    } catch (error) {
      console.log('********');
      console.log(error.status);
      console.log(error.message);
      console.log(error.meta);
      console.log('******');

      throw error;
    }
  };

  const finalize = async (state: StateType) => {
    const answerAction = state.answerActions[state.answerActions.length - 1];
    if (isAnswerAction(answerAction)) {
      return {
        finalAnswer: answerAction.message,
      };
    } else {
      return {
        // TODO: throw probably
        finalAnswer: '',
      };
    }
  };

  // note: the node names are used in the event convertion logic, they should *not* be changed
  const graph = new StateGraph(StateAnnotation)
    // nodes
    .addNode(steps.researchAgent, researchAgent)
    .addNode(steps.executeTool, executeTool)
    .addNode(steps.prepareToAnswer, prepareToAnswer)
    .addNode(steps.answerAgent, answerAgent)
    .addNode(steps.finalize, finalize)
    // edges
    .addEdge(_START_, steps.researchAgent)
    .addEdge(steps.executeTool, steps.researchAgent)
    .addConditionalEdges(steps.researchAgent, shouldContinue, {
      [steps.executeTool]: steps.executeTool,
      [steps.prepareToAnswer]: steps.prepareToAnswer,
    })
    .addEdge(steps.prepareToAnswer, steps.answerAgent)
    .addEdge(steps.answerAgent, steps.finalize)
    .addEdge(steps.finalize, _END_)
    .compile();

  return graph;
};
