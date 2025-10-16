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
import type { Conversation, ResolvedAgentCapabilities } from '@kbn/onechat-common';
import type { AgentMemoryProvider, AgentMemory } from '@kbn/onechat-server/agents';
import {
  createToolResultMessage,
  createToolCallMessage,
  extractTextContent,
  generateFakeToolCallId,
} from '@kbn/onechat-genai-utils/langchain';
import { getActPrompt } from './prompts';

const StateAnnotation = Annotation.Root({
  // inputs
  initialMessages: Annotation<BaseMessageLike[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),
  // internal
  memories: Annotation<AgentMemory[]>({
    reducer: (a, b) => [...a, ...b],
    default: () => [],
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
  memoryProvider,
  tools,
  customInstructions,
  capabilities,
  conversation,
  logger,
}: {
  chatModel: InferenceChatModel;
  memoryProvider: AgentMemoryProvider;
  tools: StructuredTool[];
  capabilities: ResolvedAgentCapabilities;
  conversation?: Conversation;
  customInstructions?: string;
  logger: Logger;
}) => {
  const toolNode = new ToolNode<typeof StateAnnotation.State.addedMessages>(tools);

  const model = chatModel.bindTools(tools).withConfig({
    tags: ['onechat-agent'],
  });

  const recallMemory = async (state: StateType) => {
    const nextMessage = state.initialMessages[state.initialMessages.length - 1];
    const term = extractTextContent(nextMessage as BaseMessage);

    const memories = await memoryProvider.recall({
      message: term,
      previousRounds: conversation?.rounds,
      conversationId: conversation?.id,
    });

    console.log('*** recallMemory', memories);

    const toolCallId = generateFakeToolCallId();
    const recallToolCallMessage = createToolCallMessage({
      toolCallId,
      toolName: 'recall_memory',
      args: {},
    });
    const recallToolResultMessage = createToolResultMessage({
      toolCallId,
      content: { memories },
    });

    return {
      memories,
      addedMessages: [recallToolCallMessage, recallToolResultMessage],
    };
  };

  const callModel = async (state: StateType) => {
    const response = await model.invoke(
      getActPrompt({
        customInstructions,
        capabilities,
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
      return 'tools';
    }
    return '__end__';
  };

  const toolHandler = async (state: StateType) => {
    const toolNodeResult = await toolNode.invoke(state.addedMessages);

    return {
      addedMessages: [...toolNodeResult],
    };
  };

  // note: the node names are used in the event convertion logic, they should *not* be changed
  const graph = new StateGraph(StateAnnotation)
    .addNode('recallMemory', recallMemory)
    .addNode('agent', callModel)
    .addNode('tools', toolHandler)
    .addEdge('__start__', 'recallMemory')
    .addEdge('recallMemory', 'agent')
    .addEdge('tools', 'agent')
    .addConditionalEdges('agent', shouldContinue, {
      tools: 'tools',
      __end__: '__end__',
    })
    .compile();

  return graph;
};
