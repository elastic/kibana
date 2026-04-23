/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StateGraph, Annotation } from '@langchain/langgraph';
import type { TimeRange } from '@kbn/agent-builder-common';
import type { BaseMessage } from '@langchain/core/messages';
import { isToolMessage } from '@langchain/core/messages';
import { messagesStateReducer } from '@langchain/langgraph';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import type { ScopedModel, ToolEventEmitter, ToolHandlerResult } from '@kbn/agent-builder-server';
import { createErrorResult } from '@kbn/agent-builder-server';
import { EsResourceType } from '@kbn/agent-builder-common';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { createToolCallMessage, extractTextContent, generateFakeToolCallId } from '../../langchain';
import { indexExplorer } from '../index_explorer';
import { listSearchSources } from '../steps/list_search_sources';
import {
  createNaturalLanguageSearchTool,
  createRelevanceSearchTool,
  naturalLanguageSearchToolName,
} from './inner_tools';
import type { TopSnippetsConfig } from '../steps/extract_snippets';
import { getSearchPrompt } from './prompts';
import { isIndexPattern } from './target_patterns';
import type { SearchTarget } from './types';
import { progressMessages } from './i18n';

const StateAnnotation = Annotation.Root({
  // inputs
  nlQuery: Annotation<string>(),
  targetPattern: Annotation<string | undefined>(),
  rowLimit: Annotation<number | undefined>(),
  customInstructions: Annotation<string | undefined>(),
  /** When true, pattern targets (e.g. logs-*) search all matching indices. When false, a single index is chosen via index explorer. */
  allowPatternTarget: Annotation<boolean>(),
  timeRange: Annotation<TimeRange>(),
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

const isPatternTargetEnabled = (state: StateType): state is StateType & { targetPattern: string } =>
  Boolean(
    state.allowPatternTarget &&
      state.targetPattern &&
      isIndexPattern(state.targetPattern) &&
      state.targetPattern !== '*' // When no index pattern is specified, we rather use the index explorer
  );

export const createSearchToolGraph = ({
  model,
  esClient,
  logger,
  events,
  topSnippetsConfig,
}: {
  model: ScopedModel;
  esClient: ElasticsearchClient;
  logger: Logger;
  events: ToolEventEmitter;
  topSnippetsConfig?: TopSnippetsConfig;
}) => {
  const getTools = (state: StateType) => {
    const relevanceTool = createRelevanceSearchTool({
      model,
      esClient,
      events,
      logger,
      topSnippetsConfig,
    });
    const nlSearchTool = createNaturalLanguageSearchTool({
      model,
      esClient,
      events,
      logger,
      rowLimit: state.rowLimit,
      customInstructions: state.customInstructions,
      timeRange: state.timeRange,
    });
    return [relevanceTool, nlSearchTool];
  };

  const selectAndValidateIndex = async (state: StateType) => {
    events?.reportProgress(progressMessages.selectingTarget());

    if (isPatternTargetEnabled(state)) {
      const sources = await listSearchSources({
        pattern: state.targetPattern,
        excludeIndicesRepresentedAsDatastream: true,
        excludeIndicesRepresentedAsAlias: false,
        esClient,
        includeKibanaIndices: true,
      });
      const matchedResourceCount =
        sources.indices.length + sources.aliases.length + sources.data_streams.length;

      if (matchedResourceCount === 0) {
        return {
          indexIsValid: false,
          error: `No resources found for pattern "${state.targetPattern}"`,
        };
      }

      return {
        indexIsValid: true,
        searchTarget: {
          type: EsResourceType.indexPattern,
          name: state.targetPattern,
        },
      };
    }

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

  const routeAfterIndexValidation = async (state: StateType) => {
    if (!state.indexIsValid) {
      return '__end__';
    }
    // If the target is an index pattern, we need to call the NL search tool
    return state.searchTarget.type === EsResourceType.indexPattern ? 'get_nl_search_tool' : 'agent';
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

  const getNlSearchTool = async (state: StateType) => {
    if (state.searchTarget.type !== EsResourceType.indexPattern) {
      throw new Error('get_nl_search_tool should only be called for index pattern targets');
    }

    return {
      messages: [
        createToolCallMessage({
          toolCallId: generateFakeToolCallId(),
          toolName: naturalLanguageSearchToolName,
          args: {
            query: state.nlQuery,
            index: state.searchTarget.name,
          },
        }),
      ],
    };
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
    .addNode('get_nl_search_tool', getNlSearchTool)
    .addNode('agent', callSearchAgent)
    .addNode('execute_tool', executeTool)
    // edges
    .addEdge('__start__', 'check_index')
    .addConditionalEdges('check_index', routeAfterIndexValidation, {
      get_nl_search_tool: 'get_nl_search_tool',
      agent: 'agent',
      __end__: '__end__',
    })
    .addEdge('get_nl_search_tool', 'execute_tool')
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
