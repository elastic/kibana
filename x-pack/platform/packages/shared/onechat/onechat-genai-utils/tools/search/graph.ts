/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StateGraph, Annotation } from '@langchain/langgraph';
import type { BaseMessage } from '@langchain/core/messages';
import { isToolMessage } from '@langchain/core/messages';
import { messagesStateReducer } from '@langchain/langgraph';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import type { ScopedModel } from '@kbn/onechat-server';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { ToolResult } from '@kbn/onechat-common/tools';
import { ToolResultType } from '@kbn/onechat-common/tools';
import { extractTextContent } from '../../langchain';
import { indexExplorer } from '../index_explorer';
import { createNaturalLanguageSearchTool, createRelevanceSearchTool } from './inner_tools';
import { getSearchPrompt } from './prompts';
import type { SearchTarget } from './types';

const StateAnnotation = Annotation.Root({
  // inputs
  nlQuery: Annotation<string>(),
  targetPattern: Annotation<string | undefined>(),
  // inner
  indexIsValid: Annotation<boolean>(),
  searchTarget: Annotation<SearchTarget>(),
  messages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),
  // outputs
  error: Annotation<string>(),
  results: Annotation<ToolResult[]>({
    reducer: (a, b) => [...a, ...b],
    default: () => [],
  }),
});

export type StateType = typeof StateAnnotation.State;

export const createSearchToolGraph = ({
  model,
  esClient,
  logger,
}: {
  model: ScopedModel;
  esClient: ElasticsearchClient;
  logger: Logger;
}) => {
  const tools = [
    createRelevanceSearchTool({ model, esClient }),
    createNaturalLanguageSearchTool({ model, esClient }),
  ];

  const toolNode = new ToolNode<typeof StateAnnotation.State.messages>(tools);

  const selectAndValidateIndex = async (state: StateType) => {
    const explorerRes = await indexExplorer({
      nlQuery: state.nlQuery,
      indexPattern: state.targetPattern ?? '*',
      esClient,
      model,
      logger,
      limit: 1,
    });

    if (explorerRes.resources.length > 0) {
      const selectedResource = explorerRes.resources[0];
      return {
        indexIsValid: true,
        searchTarget: { type: selectedResource.type, name: selectedResource.name },
      };
    } else {
      return {
        indexIsValid: false,
        error: `Could not figure out which index to use`,
      };
    }
  };

  const terminateIfInvalidIndex = async (state: StateType) => {
    return state.indexIsValid ? 'agent' : '__end__';
  };

  const searchModel = model.chatModel.bindTools(tools).withConfig({
    tags: ['onechat-search-tool'],
  });

  const callSearchAgent = async (state: StateType) => {
    const response = await searchModel.invoke(
      getSearchPrompt({ nlQuery: state.nlQuery, searchTarget: state.searchTarget })
    );
    return {
      messages: [response],
    };
  };

  const decideContinueOrEnd = async (state: StateType) => {
    // only one call for now
    return '__end__';
  };

  const executeTool = async (state: StateType) => {
    const toolNodeResult = await toolNode.invoke(state.messages);
    const toolResults = extractToolResults(toolNodeResult[toolNodeResult.length - 1]);

    return {
      messages: [...toolNodeResult],
      results: [...toolResults],
    };
  };

  const graph = new StateGraph(StateAnnotation)
    // nodes
    .addNode('check_index', selectAndValidateIndex)
    .addNode('agent', callSearchAgent)
    .addNode('execute_tool', executeTool)
    // edges
    .addEdge('__start__', 'check_index')
    .addConditionalEdges('check_index', terminateIfInvalidIndex, {
      agent: 'agent',
      __end__: '__end__',
    })
    .addEdge('agent', 'execute_tool')
    .addConditionalEdges('execute_tool', decideContinueOrEnd, {
      agent: 'agent',
      __end__: '__end__',
    })
    .compile();

  return graph;
};

const extractToolResults = (message: BaseMessage): ToolResult[] => {
  if (!isToolMessage(message)) {
    throw new Error(`Trying to extract tool results for non-tool result`);
  }
  if (message.artifact) {
    if (!Array.isArray(message.artifact.results)) {
      throw new Error(
        `Artifact is not a structured tool artifact. Received artifact=${JSON.stringify(
          message.artifact
        )}`
      );
    }
    return message.artifact.results as ToolResult[];
  } else {
    const content = extractTextContent(message);
    if (content.startsWith('Error:')) {
      return [{ type: ToolResultType.error, data: { message: content } }];
    } else {
      throw new Error(`No artifact attached to tool message. Content was ${message.content}`);
    }
  }
};
