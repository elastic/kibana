/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StateGraph, Annotation } from '@langchain/langgraph';
import type { BaseMessage, AIMessage } from '@langchain/core/messages';
import { messagesStateReducer } from '@langchain/langgraph';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import type { ScopedModel } from '@kbn/onechat-server';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { ToolResult } from '@kbn/onechat-common/tools';
import { createNaturalLanguageSearchTool, createRelevanceSearchTool } from './inner_tools';
import { getSearchPrompt } from './prompts';

const StateAnnotation = Annotation.Root({
  // inputs
  nlQuery: Annotation<string>(),
  index: Annotation<string>(),
  // inner
  messages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),
  // outputs
  results: Annotation<ToolResult[]>({
    reducer: (a, b) => [...a, ...b],
    default: () => [],
  }),
});

export type StateType = typeof StateAnnotation.State;

export const createSearchToolGraph = ({
  model,
  esClient,
}: {
  model: ScopedModel;
  esClient: ElasticsearchClient;
}) => {
  const tools = [
    createRelevanceSearchTool({ model, esClient }),
    createNaturalLanguageSearchTool({ model, esClient }),
  ];

  const toolNode = new ToolNode<typeof StateAnnotation.State.messages>(tools);

  const searchModel = model.chatModel.bindTools(tools).withConfig({
    tags: ['onechat-agent'],
  });

  const callModel = async (state: StateType) => {
    const response = await searchModel.invoke(
      getSearchPrompt({ nlQuery: state.nlQuery, index: state.index })
    );
    return {
      messages: [response],
    };
  };

  const shouldContinue = async (state: StateType) => {
    const messages = state.messages;
    const lastMessage: AIMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.tool_calls?.length) {
      return 'tools';
    }
    return '__end__';
  };

  const toolHandler = async (state: StateType) => {
    const toolNodeResult = await toolNode.invoke(state.messages);

    return {
      messages: [...toolNodeResult],
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
