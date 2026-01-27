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
import type { ScopedModel, ToolEventEmitter, ToolHandlerResult } from '@kbn/agent-builder-server';
import { createErrorResult } from '@kbn/agent-builder-server';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { extractTextContent } from '../../langchain';
import { indexExplorer } from '../index_explorer';
import { createNaturalLanguageSearchTool, createRelevanceSearchTool } from './inner_tools';
import { getSearchPrompt } from './prompts';
import type { SearchTarget } from './types';
import { progressMessages } from './i18n';

const StateAnnotation = Annotation.Root({
  // inputs
  nlQuery: Annotation<string>(),
  targetPattern: Annotation<string | undefined>(),
  rowLimit: Annotation<number | undefined>(),
  customInstructions: Annotation<string | undefined>(),
  // inner
  indexIsValid: Annotation<boolean>(),
  searchTarget: Annotation<SearchTarget>(),
  messages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),
  // outputs
  error: Annotation<string>(),
  results: Annotation<ToolHandlerResult[]>({
    reducer: (a, b) => [...a, ...b],
    default: () => [],
  }),
});

export type StateType = typeof StateAnnotation.State;

export const createSearchToolGraph = ({
  model,
  esClient,
  logger,
  events,
}: {
  model: ScopedModel;
  esClient: ElasticsearchClient;
  logger: Logger;
  events: ToolEventEmitter;
}) => {
  const getTools = (state: StateType) => {
    const relevanceTool = createRelevanceSearchTool({ model, esClient, events, logger });
    const nlSearchTool = createNaturalLanguageSearchTool({
      model,
      esClient,
      events,
      logger,
      rowLimit: state.rowLimit,
      customInstructions: state.customInstructions,
    });
    return [relevanceTool, nlSearchTool];
  };

  const selectAndValidateIndex = async (state: StateType) => {
    events?.reportProgress(progressMessages.selectingTarget());

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

  const callSearchAgent = async (state: StateType) => {
    events?.reportProgress(
      progressMessages.resolvingSearchStrategy({
        target: state.searchTarget.name,
      })
    );

    const tools = getTools(state);
    const searchModel = model.chatModel.bindTools(tools, { tool_choice: 'any' }).withConfig({
      tags: ['agent-builder-search-tool'],
    });

    const response = await searchModel.invoke(
      getSearchPrompt({
        nlQuery: state.nlQuery,
        searchTarget: state.searchTarget,
        customInstructions: state.customInstructions,
      })
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
    const tools = getTools(state);
    const toolNode = new ToolNode<typeof StateAnnotation.State.messages>(tools);

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

const extractToolResults = (message: BaseMessage): ToolHandlerResult[] => {
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
    return message.artifact.results as ToolHandlerResult[];
  } else {
    const content = extractTextContent(message);
    if (content.startsWith('Error:')) {
      return [createErrorResult(content)];
    } else {
      throw new Error(`No artifact attached to tool message. Content was ${message.content}`);
    }
  }
};
