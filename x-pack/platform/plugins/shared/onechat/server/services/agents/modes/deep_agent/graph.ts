/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StateGraph, START as _START_, END as _END_ } from '@langchain/langgraph';
import type { StructuredTool } from '@langchain/core/tools';
import type { Logger } from '@kbn/core/server';
import type { InferenceChatModel } from '@kbn/inference-langchain';
import type { ResolvedAgentCapabilities } from '@kbn/onechat-common';
import type { AgentEventEmitter } from '@kbn/onechat-server';
import { createReasoningEvent } from '@kbn/onechat-genai-utils/langchain';
import type { ResolvedConfiguration } from '../types';
import { getSystemPrompt, getAnswerPrompt } from './prompts';
import { getRandomAnsweringMessage, getRandomThinkingMessage } from './i18n';
import { steps, tags } from './constants';
import type { StateType } from './state';
import { StateAnnotation } from './state';
import { BaseMessage, HumanMessage, RemoveMessage } from '@langchain/core/messages';
import { createResearchMiddleware } from './middlewares/researchAgentMiddleware';
const deepagents = require("fix-esm").require('deepagents');

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

  const systemPrompt = getSystemPrompt({
    customInstructions: configuration.research.instructions,
    capabilities,
  });

  const deepAgent = deepagents.createDeepAgent({
    model: chatModel,
    tools: tools,
    systemPrompt: systemPrompt,
    middleware: [
      createResearchMiddleware(events)
    ],
  });

  const researchAgent = async (state: StateType) => {
    events.emit(createReasoningEvent(getRandomThinkingMessage(), { transient: true }));

    const response = await deepAgent.invoke({
      messages: state.messages,
      files: {}
    });

    const responseMessages = response.messages as BaseMessage[];

    return {
      messages: responseMessages,
    };
  };

  const prepareToAnswer = async (state: StateType) => {
    const lastMessage = state.messages[state.messages.length - 1] as BaseMessage;
    // remove the last message from the messages history to facilitate handover and ensure message ordering is correct.
    return {
      messages: [new RemoveMessage({ id: lastMessage.id ?? '' })],
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
        discussion: state.messages,
      })
    );
    return {
      messages: [response],
    };
  };

  // note: the node names are used in the event convertion logic, they should *not* be changed
  const graph = new StateGraph(StateAnnotation)
    // nodes
    .addNode(steps.researchAgent, researchAgent)
    .addNode(steps.prepareToAnswer, prepareToAnswer)
    .addNode(steps.answerAgent, answerAgent)
    // edges
    .addEdge(_START_, steps.researchAgent)
    .addEdge(steps.researchAgent, steps.prepareToAnswer)
    .addEdge(steps.prepareToAnswer, steps.answerAgent)
    .addEdge(steps.answerAgent, _END_)
    .compile();

  return graph;
};
