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
import type { ScopedModel, ToolEventEmitter } from '@kbn/onechat-server';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { ToolResult } from '@kbn/onechat-common/tools';
import { ToolResultType } from '@kbn/onechat-common/tools';
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
  maxAttempts: Annotation<number>({ value: (_, b) => b, default: () => 3 }),
  // inner
  indexIsValid: Annotation<boolean>(),
  searchTarget: Annotation<SearchTarget>(),
  messages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),
  attempt: Annotation<number>({ value: (_, b) => b, default: () => 0 }),
  hadAnyResult: Annotation<boolean>({ value: (_, b) => b, default: () => false }),
  // outputs
  error: Annotation<string>(),
  results: Annotation<ToolResult[]>({
    reducer: (a, b) => [...a, ...b],
    default: () => [],
  }),
  failureSummary: Annotation<string>(),
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
  events?: ToolEventEmitter;
}) => {
  const tools = [
    createRelevanceSearchTool({ model, esClient, events }),
    createNaturalLanguageSearchTool({ model, esClient, events }),
  ];

  const toolNode = new ToolNode<typeof StateAnnotation.State.messages>(tools);

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
      events?.reportProgress(progressMessages.selectedTarget(selectedResource.name));

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
    const nextAttempt = state.attempt + 1;
    events?.reportProgress(
      progressMessages.searchAttempt({ attempt: nextAttempt, max: state.maxAttempts })
    );
    events?.reportProgress(progressMessages.resolvingSearchStrategy());
    const response = await searchModel.invoke(
      getSearchPrompt({ nlQuery: state.nlQuery, searchTarget: state.searchTarget })
    );
    return {
      messages: [response],
      attempt: nextAttempt,
    };
  };

  const decideContinueOrEnd = async (state: StateType) => {
    // Continue if: we haven't exceeded attempts AND last tool call produced no results/errors
    if (state.attempt < state.maxAttempts) {
      // we loop until we have at least one non-error result
      const hasUseful = state.results.some((r) => r.type !== ToolResultType.error);
      if (!hasUseful) {
        return 'agent';
      }
    }
    if (state.attempt >= state.maxAttempts) {
      const hasUseful = state.results.some((r) => r.type !== ToolResultType.error);
      if (!hasUseful) {
        events?.reportProgress(progressMessages.exhaustedAttempts());
        return 'summarize_failure';
      }
    }
    return '__end__';
  };

  const executeTool = async (state: StateType) => {
    try {
      const toolNodeResult = await toolNode.invoke(state.messages);
      const toolResults = extractToolResults(toolNodeResult[toolNodeResult.length - 1]);

      const hadAnyResult =
        state.hadAnyResult || toolResults.some((r) => r.type !== ToolResultType.error);

      return {
        messages: [...toolNodeResult],
        results: [...toolResults],
        hadAnyResult,
      };
    } catch (e) {
      // treat invocation failure as error result but keep looping if attempts remain
      return {
        results: [
          {
            type: ToolResultType.error,
            data: { message: e instanceof Error ? e.message : String(e) },
          },
        ],
        hadAnyResult: state.hadAnyResult,
      };
    }
  };

  const summarizeFailure = async (state: StateType) => {
    if (state.results.length === 0) {
      return {
        failureSummary: `No results returned after ${state.attempt} attempts.`,
      };
    }
    const attempts = state.attempt;
    const errorMessages = state.results
      .filter((r) => r.type === ToolResultType.error)
      .map((r) => (r as any).data?.message)
      .slice(-5);
    const summary = `Exhausted ${attempts} attempts without usable results. Last errors: ${errorMessages.join(
      ' | '
    )}`;
    return { failureSummary: summary };
  };

  const graph = new StateGraph(StateAnnotation)
    // nodes
    .addNode('check_index', selectAndValidateIndex)
    .addNode('agent', callSearchAgent)
    .addNode('execute_tool', executeTool)
    .addNode('summarize_failure', summarizeFailure)
    // edges
    .addEdge('__start__', 'check_index')
    .addConditionalEdges('check_index', terminateIfInvalidIndex, {
      agent: 'agent',
      __end__: '__end__',
    })
    .addEdge('agent', 'execute_tool')
    .addConditionalEdges('execute_tool', decideContinueOrEnd, {
      agent: 'agent',
      summarize_failure: 'summarize_failure',
      __end__: '__end__',
    })
    .addEdge('summarize_failure', '__end__')
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
