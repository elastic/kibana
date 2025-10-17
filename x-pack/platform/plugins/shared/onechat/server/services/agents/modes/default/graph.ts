/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StateGraph, Annotation } from '@langchain/langgraph';
import type { BaseMessage, BaseMessageLike, AIMessage } from '@langchain/core/messages';
import { messagesStateReducer } from '@langchain/langgraph';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import type { StructuredTool } from '@langchain/core/tools';
import type { Logger } from '@kbn/core/server';
import type { InferenceChatModel } from '@kbn/inference-langchain';
import type { ResolvedAgentCapabilities } from '@kbn/onechat-common';
import type { AgentEventEmitter } from '@kbn/onechat-server';
import { createReasoningEvent, extractTextContent } from '@kbn/onechat-genai-utils/langchain';
import { getActPrompt, getAnswerPrompt } from './prompts';
import { getRandomAnsweringMessage, getRandomThinkingMessage } from './i18n';
import type { ResolvedConfiguration } from '../types';

const StateAnnotation = Annotation.Root({
  // inputs
  initialMessages: Annotation<BaseMessageLike[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),
  // internals
  nextMessage: Annotation<AIMessage>(),
  handoverNote: Annotation<string>(),
  // outputs
  addedMessages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),
});

export type StateType = typeof StateAnnotation.State;

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
  const toolNode = new ToolNode<typeof StateAnnotation.State.addedMessages>(tools);

  const model = chatModel.bindTools(tools).withConfig({
    tags: ['onechat-agent'],
  });

  const callModel = async (state: StateType) => {
    if (state.addedMessages.length === 0) {
      events.emit(createReasoningEvent(getRandomThinkingMessage(), { transient: true }));
    }
    const response = await model.invoke(
      getActPrompt({
        customInstructions: configuration.research.instructions,
        capabilities,
        messages: [...state.initialMessages, ...state.addedMessages],
      })
    );
    return {
      nextMessage: response,
    };
  };

  const shouldContinue = async (state: StateType) => {
    const lastMessage = state.nextMessage;
    if (lastMessage && lastMessage.tool_calls?.length) {
      return 'tools';
    }
    return 'handoverToAnswer';
  };

  const toolHandler = async (state: StateType) => {
    const toolNodeResult = await toolNode.invoke([state.nextMessage], {});
    return {
      addedMessages: [state.nextMessage, ...toolNodeResult],
    };
  };

  const handoverToAnswer = async (state: StateType) => {
    const handoverMessage = state.nextMessage;
    const messageContent = extractTextContent(handoverMessage);
    return {
      handoverNote: messageContent,
    };
  };

  const answeringModel = chatModel.withConfig({
    tags: ['onechat-agent', 'answering-step'],
  });

  const generateAnswer = async (state: StateType) => {
    events.emit(createReasoningEvent(getRandomAnsweringMessage(), { transient: true }));
    const response = await answeringModel.invoke(
      getAnswerPrompt({
        customInstructions: configuration.answer.instructions,
        capabilities,
        handoverNote: state.handoverNote,
        discussion: [...state.initialMessages, ...state.addedMessages],
      })
    );
    return {
      addedMessages: [response],
    };
  };

  // note: the node names are used in the event convertion logic, they should *not* be changed
  const graph = new StateGraph(StateAnnotation)
    .addNode('agent', callModel)
    .addNode('tools', toolHandler)
    .addNode('handoverToAnswer', handoverToAnswer)
    .addNode('answer', generateAnswer)
    .addEdge('__start__', 'agent')
    .addEdge('tools', 'agent')
    .addConditionalEdges('agent', shouldContinue, {
      tools: 'tools',
      handoverToAnswer: 'handoverToAnswer',
    })
    .addEdge('handoverToAnswer', 'answer')
    .addEdge('answer', '__end__')
    .compile();

  return graph;
};
