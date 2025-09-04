/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StateGraph, Annotation } from '@langchain/langgraph';
import type { BaseMessage, AIMessage } from '@langchain/core/messages';
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
  maxAttempts: Annotation<number>({
    // numeric fields need a value reducer; keep last provided value
    value: (_prev, next) => next,
    default: () => 4,
  }),
  // inner
  indexIsValid: Annotation<boolean>(),
  searchTarget: Annotation<SearchTarget>(),
  messages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),
  attempt: Annotation<number>({
    value: (_prev, next) => next,
    default: () => 0,
  }),
  attemptSummaries: Annotation<string[]>({
    reducer: (a, b) => [...a, ...b],
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

  const searchModel = model.chatModel.bindTools(tools).withConfig({ tags: ['onechat-search-tool'] });

  const callSearchAgent = async (state: StateType) => {
    const response = await searchModel.invoke(
      getSearchPrompt({
        nlQuery: state.nlQuery,
        searchTarget: state.searchTarget,
        attempt: state.attempt,
        previousAttemptSummaries: state.attemptSummaries,
        maxAttempts: state.maxAttempts,
      })
    );
    return {
      messages: [response],
    };
  };

  const decideContinueOrEnd = async (state: StateType) => {
    // If we have results that are not errors, end.
    const hasNonError = state.results.some((r) => r.type !== ToolResultType.error);
    if (hasNonError) {
      return '__end__';
    }
    const nextAttempt = state.attempt + 1;
    if (nextAttempt >= state.maxAttempts) {
      return 'finalize';
    }
    return 'agent';
  };

  const executeTool = async (state: StateType) => {
    // Guard: the model might return a response without any tool_calls.
    const lastMessage = state.messages[state.messages.length - 1] as AIMessage | undefined;
    const plannedToolCalls = lastMessage?.tool_calls?.length ?? 0;
    if (plannedToolCalls === 0) {
      const summary = `Attempt ${state.attempt + 1}: model response had no tool call`;
      return {
        // no new messages added (we didn't run a tool)
        results: [
          {
            type: ToolResultType.error,
            data: { message: 'Search sub-agent produced a response without a tool call.' },
          },
        ],
        attemptSummaries: [summary],
        attempt: state.attempt + 1,
      };
    }

    const toolNodeResult = await toolNode.invoke(state.messages);
    const lastToolMessage = toolNodeResult[toolNodeResult.length - 1];
    const toolResults = extractToolResults(lastToolMessage);

    // create a short attempt summary (error or tool call details)
    let summary: string;
    const errorResult = toolResults.find((r) => r.type === ToolResultType.error);
    if (errorResult) {
      summary = `Attempt ${state.attempt + 1}: error - ${(errorResult.data as any).message}`;
    } else if (toolResults.length === 0) {
      summary = `Attempt ${state.attempt + 1}: no results`;
    } else {
      summary = `Attempt ${state.attempt + 1}: returned ${toolResults.length} result$${
        toolResults.length === 1 ? '' : 's'
      } (types: ${[...new Set(toolResults.map((r) => r.type))].join(', ')})`;
    }

    return {
      messages: [...toolNodeResult],
      results: [...toolResults],
      attemptSummaries: [summary],
      attempt: state.attempt + 1,
    };
  };

  const finalizeNoResults = async (state: StateType) => {
    // If we ended up here without non-error results, provide guidance to outer agent.
    const hasNonError = state.results.some((r) => r.type !== ToolResultType.error);
    if (hasNonError) {
      return {};
    }
    const guidance =
      'Search attempts exhausted with only errors or empty results. Consider refining the query (be more specific, include key terms, specify timeframe or fields) or check if the target index actually contains relevant data.';
    return {
      error: guidance,
    };
  };

  const graph = new StateGraph(StateAnnotation)
    // nodes
    .addNode('check_index', selectAndValidateIndex)
    .addNode('agent', callSearchAgent)
    .addNode('execute_tool', executeTool)
    .addNode('finalize', finalizeNoResults)
    // edges
    .addEdge('__start__', 'check_index')
    .addConditionalEdges('check_index', terminateIfInvalidIndex, {
      agent: 'agent',
      __end__: '__end__',
    })
    .addEdge('agent', 'execute_tool')
    .addConditionalEdges('execute_tool', decideContinueOrEnd, {
      agent: 'agent',
      finalize: 'finalize',
      __end__: '__end__',
    })
    .addEdge('finalize', '__end__')
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
