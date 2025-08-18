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
import { getActPrompt } from './prompts';

const StateAnnotation = Annotation.Root({
  // inputs
  initialMessages: Annotation<BaseMessageLike[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),
  // track how many tool calls have been executed so far
  toolCallCount: Annotation<number>({
    reducer: (a?: number, b?: number) =>
      (typeof a === 'number' ? a : 0) + (typeof b === 'number' ? b : 0),
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
  toolCallLimit,
}: {
  chatModel: InferenceChatModel;
  tools: StructuredTool[];
  customInstructions?: string;
  noPrompt?: boolean;
  logger: Logger;
  toolCallLimit?: number;
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
            currentToolCallCount: state.toolCallCount,
            toolCallLimit,
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
      return 'tools';
    }
    return '__end__';
  };

  const toolHandler = async (state: StateType) => {
    const toolNodeResult = await toolNode.invoke(state.addedMessages);
    // Increment by the number of tool calls issued in the last AI message
    const lastMessage = state.addedMessages[state.addedMessages.length - 1] as
      | AIMessage
      | undefined;
    const increment = lastMessage?.tool_calls?.length ?? 1;

    return {
      addedMessages: [...toolNodeResult],
      // increment tool call counter by the number of tool calls just executed
      toolCallCount: increment,
    };
  };

  // note: the node names are used in the event convertion logic, they should *not* be changed
  const graph = new StateGraph(StateAnnotation)
    .addNode('agent', callModel)
    .addNode('tools', toolHandler)
    .addEdge('__start__', 'agent')
    .addEdge('tools', 'agent')
    .addConditionalEdges('agent', shouldContinue, {
      tools: 'tools',
      __end__: '__end__',
    })
    .compile();

  return graph;
};
