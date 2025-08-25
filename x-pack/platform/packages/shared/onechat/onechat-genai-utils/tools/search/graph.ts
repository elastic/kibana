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
import type { ElasticsearchClient } from '@kbn/core/server';
import type { ToolResult } from '@kbn/onechat-common/tools';
import { isNotFoundError } from '@kbn/es-errors';
import { indexExplorer } from '../index_explorer';
import { createNaturalLanguageSearchTool, createRelevanceSearchTool } from './inner_tools';
import { getSearchPrompt } from './prompts';

const StateAnnotation = Annotation.Root({
  // inputs
  nlQuery: Annotation<string>(),
  index: Annotation<string | undefined>(),
  // inner
  indexIsValid: Annotation<boolean>(),
  selectedIndex: Annotation<string>(),
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
}: {
  model: ScopedModel;
  esClient: ElasticsearchClient;
}) => {
  const tools = [
    createRelevanceSearchTool({ model, esClient }),
    createNaturalLanguageSearchTool({ model, esClient }),
  ];

  const toolNode = new ToolNode<typeof StateAnnotation.State.messages>(tools);

  const selectAndValidateIndex = async (state: StateType) => {
    if (state.index) {
      let exists = false;
      try {
        const response = await esClient.indices.resolveIndex({
          name: state.index,
          allow_no_indices: true,
        });
        exists =
          response.indices.length > 0 ||
          response.aliases.length > 0 ||
          response.data_streams.length > 0;
      } catch (e) {
        if (isNotFoundError(e)) {
          exists = false;
        }
      }

      if (exists) {
        return {
          selectedIndex: state.index,
          indexIsValid: true,
        };
      } else {
        return {
          indexIsValid: false,
          error: `No index, alias or data streams found for '${state.index}'`,
        };
      }
    } else {
      const explorerRes = await indexExplorer({
        nlQuery: state.nlQuery,
        indexPattern: '*',
        esClient,
        model,
        limit: 1,
      });

      if (explorerRes.indices.length > 0) {
        return {
          indexIsValid: true,
          selectedIndex: explorerRes.indices[0].indexName,
        };
      } else {
        return {
          indexIsValid: false,
          error: `Could not figure out which index to use`,
        };
      }
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
      getSearchPrompt({ nlQuery: state.nlQuery, index: state.selectedIndex })
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
  if (!isToolMessage(message) || !message.artifact || !Array.isArray(message.artifact.results)) {
    throw new Error('No artifact attached to tool message');
  }

  return message.artifact.results as ToolResult[];
};
