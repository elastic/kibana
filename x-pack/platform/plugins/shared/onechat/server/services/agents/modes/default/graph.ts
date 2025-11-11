/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StateGraph, START as _START_, END as _END_, type BaseCheckpointSaver } from '@langchain/langgraph';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import type { StructuredTool } from '@langchain/core/tools';
import type { Logger } from '@kbn/core/server';
import type { InferenceChatModel } from '@kbn/inference-langchain';
import type { ResolvedAgentCapabilities } from '@kbn/onechat-common';
import type { AgentEventEmitter } from '@kbn/onechat-server';
import { createReasoningEvent, extractTextContent } from '@kbn/onechat-genai-utils/langchain';
import type { ResolvedConfiguration } from '../types';
import { getActPrompt, getAnswerPrompt } from './prompts';
import { getRandomAnsweringMessage, getRandomThinkingMessage } from './i18n';
import { steps, tags } from './constants';
import type { StateType } from './state';
import { StateAnnotation } from './state';

export const createAgentGraph = ({
  chatModel,
  tools,
  configuration,
  capabilities,
  logger,
  events,
  checkpointer,
}: {
  chatModel: InferenceChatModel;
  tools: StructuredTool[];
  capabilities: ResolvedAgentCapabilities;
  configuration: ResolvedConfiguration;
  logger: Logger;
  events: AgentEventEmitter;
  checkpointer: BaseCheckpointSaver;
}) => {
  const toolNode = new ToolNode<typeof StateAnnotation.State.addedMessages>(tools);

  const researcherModel = chatModel.bindTools(tools).withConfig({
    tags: [tags.agent, tags.researchAgent],
  });

  const researchAgent = async (state: StateType) => {
    if (state.addedMessages.length === 0) {
      events.emit(createReasoningEvent(getRandomThinkingMessage(), { transient: true }));
    }
    const response = await researcherModel.invoke(
      getActPrompt({
        customInstructions: configuration.research.instructions,
        capabilities,
        messages: [...state.initialMessages, ...state.addedMessages],
      })
    );
    return {
      currentCycle: state.currentCycle + 1,
      nextMessage: response,
    };
  };

  const shouldContinue = async (state: StateType) => {
    const hasToolCalls = state.nextMessage && (state.nextMessage.tool_calls ?? []).length > 0;
    const maxCycleReached = state.currentCycle > state.cycleLimit;
    if (hasToolCalls && !maxCycleReached) {
      return steps.executeTool;
    } else {
      return steps.prepareToAnswer;
    }
  };

  const executeTool = async (state: StateType) => {
    const toolNodeResult = await toolNode.invoke([state.nextMessage], {});
    return {
      addedMessages: [state.nextMessage, ...toolNodeResult],
    };
  };

  const prepareToAnswer = async (state: StateType) => {
    const maxCycleReached = state.currentCycle > state.cycleLimit;
    let handoverNote: string | undefined;
    if (!maxCycleReached) {
      const handoverMessage = state.nextMessage;
      handoverNote = extractTextContent(handoverMessage);
    }
    return {
      handoverNote,
      maxCycleReached,
    };
  };

  const answeringModel = chatModel.withConfig({
    tags: [tags.agent, tags.answerAgent],
  });

  const answerAgent = async (state: StateType) => {
    events.emit(createReasoningEvent(getRandomAnsweringMessage(), { transient: true }));
    const response = await answeringModel.invoke(
      getAnswerPrompt({
        customInstructions: configuration.answer.instructions,
        capabilities,
        handoverNote: state.handoverNote,
        searchInterrupted: state.maxCycleReached,
        discussion: [...state.initialMessages, ...state.addedMessages],
      })
    );
    return {
      addedMessages: [response],
    };
  };

  // note: the node names are used in the event convertion logic, they should *not* be changed
  const graph = new StateGraph(StateAnnotation)
    // nodes
    .addNode(steps.researchAgent, researchAgent)
    .addNode(steps.executeTool, executeTool)
    .addNode(steps.prepareToAnswer, prepareToAnswer)
    .addNode(steps.answerAgent, answerAgent)
    // edges
    .addEdge(_START_, steps.researchAgent)
    .addEdge(steps.executeTool, steps.researchAgent)
    .addConditionalEdges(steps.researchAgent, shouldContinue, {
      [steps.executeTool]: steps.executeTool,
      [steps.prepareToAnswer]: steps.prepareToAnswer,
    })
    .addEdge(steps.prepareToAnswer, steps.answerAgent)
    .addEdge(steps.answerAgent, _END_)
    .compile({
      checkpointer,
    });

  return graph;
};
