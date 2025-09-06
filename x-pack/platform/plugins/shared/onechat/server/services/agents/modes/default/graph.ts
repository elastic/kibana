/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StateGraph, Annotation } from '@langchain/langgraph';
import { AIMessage, type BaseMessage, type BaseMessageLike, type AIMessage as AIMessageType } from '@langchain/core/messages';
import { messagesStateReducer } from '@langchain/langgraph';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import type { StructuredTool } from '@langchain/core/tools';
import type { Logger } from '@kbn/core/server';
import type { InferenceChatModel } from '@kbn/inference-langchain';
import { getActPrompt } from './prompts';

const StateAnnotation = Annotation.Root({
  // inputs
  initialMessages: Annotation<BaseMessageLike[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),
  maxToolCalls: Annotation<number>({
    value: (_prev, next) => next,
    default: () => 3,
  }),
  toolCallCount: Annotation<number>({
    value: (prev, next) => (typeof next === 'number' ? next : prev),
    default: () => 0,
  }),
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
  customInstructions,
  noPrompt,
  logger,
}: {
  chatModel: InferenceChatModel;
  tools: StructuredTool[];
  customInstructions?: string;
  noPrompt?: boolean;
  logger: Logger;
}) => {
  const toolNode = new ToolNode<typeof StateAnnotation.State.addedMessages>(tools);

  const model = chatModel.bindTools(tools).withConfig({
    tags: ['onechat-agent'],
  });

  const callModel = async (state: StateType) => {
    const response = await model.invoke(
      noPrompt
        ? [...state.initialMessages, ...state.addedMessages]
        : getActPrompt({
            customInstructions,
            messages: [...state.initialMessages, ...state.addedMessages],
          })
    );
    return {
      addedMessages: [response],
    };
  };

  const shouldContinue = async (state: StateType) => {
    const messages = state.addedMessages;
    const lastMessage: AIMessageType = messages[messages.length - 1] as AIMessageType;
    if (lastMessage && lastMessage.tool_calls?.length) {
      if (state.toolCallCount >= state.maxToolCalls) {
        // Instead of ending abruptly, route to guidance node.
        return 'ask_user';
      }
      return 'tools';
    }
    return '__end__';
  };

  const toolHandler = async (state: StateType) => {
    const lastAI = state.addedMessages[state.addedMessages.length - 1] as AIMessage | undefined;
    const plannedCalls = lastAI?.tool_calls?.length ?? 0;
    const toolNodeResult = await toolNode.invoke(state.addedMessages);
    return {
      addedMessages: [...toolNodeResult],
      toolCallCount: state.toolCallCount + plannedCalls,
    };
  };

  const askUserForGuidance = async (state: StateType) => {
    // Provide a synthesized assistant message requesting user guidance after exhausting tool calls.
    const guidance = `I wasn’t able to find a clear answer.  
Could you refine your request with more details (e.g. timeframe, key terms, specific tool / index names, or fields)?`;

    return {
      addedMessages: [
        new AIMessage({
          content: guidance,
        }),
      ],
    };
  };

  // note: the node names 'agent', 'tools', and 'ask_user' are referenced in event conversion logic; they should *not* be changed
  const graph = new StateGraph(StateAnnotation)
    .addNode('agent', callModel)
    .addNode('tools', toolHandler)
    .addNode('ask_user', askUserForGuidance)
    .addEdge('__start__', 'agent')
    .addEdge('tools', 'agent')
    .addConditionalEdges('agent', shouldContinue, {
      tools: 'tools',
      ask_user: 'ask_user',
      __end__: '__end__',
    })
    .addEdge('ask_user', '__end__')
    .compile();

  return graph;
};
