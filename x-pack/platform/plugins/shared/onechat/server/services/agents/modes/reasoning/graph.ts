/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StateGraph, Annotation } from '@langchain/langgraph';
import { BaseMessage, AIMessage } from '@langchain/core/messages';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import type { StructuredTool } from '@langchain/core/tools';
import type { Logger } from '@kbn/core/server';
import { InferenceChatModel } from '@kbn/inference-langchain';
import { extractTextContent } from '@kbn/onechat-genai-utils/langchain';
import { ReasoningStep, AddedMessage, isMessage } from './actions';
import { getReasoningPrompt, getActPrompt } from './prompts';

const StateAnnotation = Annotation.Root({
  // inputs
  initialMessages: Annotation<BaseMessage[]>({
    reducer: (current, next) => {
      return [...current, ...next];
    },
    default: () => [],
  }),
  // outputs
  addedMessages: Annotation<AddedMessage[]>({
    reducer: (current, next) => {
      return [...current, ...next];
    },
    default: () => [],
  }),
});

export type StateType = typeof StateAnnotation.State;

export const createAgentGraph = async ({
  chatModel,
  tools,
  customInstructions,
}: {
  chatModel: InferenceChatModel;
  tools: StructuredTool[];
  customInstructions?: string;
  logger: Logger;
}) => {
  const toolNode = new ToolNode<typeof StateAnnotation.State.addedMessages>(tools);

  const model = chatModel.bindTools(tools).withConfig({
    tags: ['onechat-agent'],
  });

  const reason = async (state: typeof StateAnnotation.State) => {
    const response = await model.invoke(
      getReasoningPrompt({
        messages: [...state.initialMessages, ...state.addedMessages],
        customInstructions,
      })
    );

    const reasoningEvent: ReasoningStep = {
      type: 'reasoning',
      reasoning: extractTextContent(response),
    };

    return {
      addedMessages: [reasoningEvent],
    };
  };

  const act = async (state: typeof StateAnnotation.State) => {
    const actModel = chatModel.bindTools(tools).withConfig({
      tags: ['reasoning:act'],
    });

    const response = await actModel.invoke(
      getActPrompt({
        initialMessages: state.initialMessages,
        addedMessages: state.addedMessages,
        customInstructions,
      })
    );
    return {
      addedMessages: [response],
    };
  };

  const shouldContinue = async (state: typeof StateAnnotation.State) => {
    const messages = state.addedMessages.filter(isMessage);
    const lastMessage: AIMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.tool_calls?.length) {
      return 'tools';
    }
    return '__end__';
  };

  const toolHandler = async (state: typeof StateAnnotation.State) => {
    const toolNodeResult = await toolNode.invoke(state.addedMessages);
    return {
      addedMessages: [...toolNodeResult],
    };
  };

  // note: the node names are used in the event convertion logic, they should *not* be changed
  const graph = new StateGraph(StateAnnotation)
    .addNode('reason', reason)
    .addNode('act', act)
    .addNode('tools', toolHandler)
    .addEdge('__start__', 'reason')
    .addEdge('reason', 'act')
    .addEdge('tools', 'reason')
    .addConditionalEdges('act', shouldContinue, {
      tools: 'tools',
      __end__: '__end__',
    })
    .compile();

  return graph;
};
