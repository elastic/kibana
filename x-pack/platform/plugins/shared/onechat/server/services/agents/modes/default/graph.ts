/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StateGraph, Annotation } from '@langchain/langgraph';
import type { BaseMessage, BaseMessageLike, AIMessage } from '@langchain/core/messages';
import { isToolMessage } from '@langchain/core/messages';
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
  maxToolCalls: Annotation<number>({ value: (_, b) => b, default: () => 3 }),
  // outputs
  addedMessages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),
  toolCallCount: Annotation<number>({ value: (_, b) => b, default: () => 0 }),
});

export type StateType = typeof StateAnnotation.State;

export const createAgentGraph = ({
  chatModel,
  tools,
  customInstructions,
  noPrompt,
  logger,
  maxToolCalls = 3,
}: {
  chatModel: InferenceChatModel;
  tools: StructuredTool[];
  customInstructions?: string;
  noPrompt?: boolean;
  logger: Logger;
  maxToolCalls?: number;
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
    const lastMessage: AIMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.tool_calls?.length) {
      const pendingCalls = lastMessage.tool_calls.length;
      const current = state.toolCallCount;
      const budget = state.maxToolCalls ?? maxToolCalls;
      if (current + pendingCalls > budget) {
        // budget exhausted -> finalize without executing these calls
        return 'finalize';
      }
      return 'tools';
    }
    return '__end__';
  };

  const toolHandler = async (state: StateType) => {
    const toolNodeResult = await toolNode.invoke(state.addedMessages);
    const executedToolMessages = toolNodeResult.filter((m) => isToolMessage(m));
    const increment = executedToolMessages.length;

    return {
      addedMessages: [...toolNodeResult],
      toolCallCount: state.toolCallCount + increment,
    };
  };

  const finalizeAnswer = async (state: StateType) => {
    // Ask model to produce final grounded answer without further tool calls
    const budget = state.maxToolCalls ?? maxToolCalls;
    const directive: BaseMessageLike = [
      'system',
      `Tool call budget exhausted (max ${budget}). Provide the best final grounded answer using ONLY existing tool outputs and conversation so far. DO NOT call any tools.`,
    ];
    const response = await model.invoke(
      noPrompt
        ? [...state.initialMessages, ...state.addedMessages, directive]
        : getActPrompt({
            customInstructions,
            messages: [...state.initialMessages, ...state.addedMessages, directive],
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
    .addNode('finalize', finalizeAnswer)
    .addEdge('__start__', 'agent')
    .addEdge('tools', 'agent')
    .addConditionalEdges('agent', shouldContinue, {
      tools: 'tools',
      finalize: 'finalize',
      __end__: '__end__',
    })
    .addEdge('finalize', '__end__')
    .compile();

  return graph;
};
