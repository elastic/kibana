/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { StateGraph, Annotation } from '@langchain/langgraph';
import { BaseMessage } from '@langchain/core/messages';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import type { StructuredTool } from '@langchain/core/tools';
import type { Logger } from '@kbn/core/server';
import { InferenceChatModel } from '@kbn/inference-langchain';
import { getReflectionPrompt, getExecutionPrompt, getAnswerPrompt } from './prompts';
import { extractToolResults } from './utils';
import { getToolCalls, extractTextContent } from '../conversational/utils/from_langchain_messages';

// tool_choice: toolName

export interface PlannedAction {
  knowledgeGap: string;
}

export interface ExecutedAction {
  knowledgeGap: string;
  toolName: string;
  arguments: any;
  response: any;
}

//
// process queue -> create knowledge entries -> reason
//

// tools:
// - index explorer
// - fulltext search
// - get_document_by_id
// - ES|QL?

interface ReflectionResult {
  isSufficient: boolean;
  knowledgeGaps: string[];
  reasoning?: string;
}

export const createAgentGraph = async ({
  chatModel,
  tools,
  systemPrompt,
}: {
  chatModel: InferenceChatModel;
  tools: StructuredTool[];
  systemPrompt?: string;
  logger: Logger;
}) => {
  const StateAnnotation = Annotation.Root({
    // inputs
    initialQuery: Annotation<string>(), // the search query
    cycleBudget: Annotation<number>(), // budget in number of cycles - TODO
    // internal state
    actionsQueue: Annotation<PlannedAction[], PlannedAction[]>({
      reducer: (state, actions) => {
        return actions ?? state;
      },
      default: () => [],
    }),
    processedActions: Annotation<ExecutedAction[], ExecutedAction[]>({
      reducer: (current, next) => {
        return [...current, ...next];
      },
      default: () => [],
    }),
    lastReflectionResult: Annotation<ReflectionResult>(),
    // outputs
    generatedAnswer: Annotation<string>(),
  });

  /**
   * Initialize the flow by adding a first index explorer call to the action queue.
   */
  const initialize = async (state: typeof StateAnnotation.State) => {
    const firstAction: PlannedAction = {
      knowledgeGap: state.initialQuery,
    };
    return {
      actionsQueue: [firstAction],
    };
  };

  const processQueueItem = async (state: typeof StateAnnotation.State) => {
    const [nextItem, ...queue] = state.actionsQueue;

    console.log('*** processQueueItem - nextItem: ', nextItem);

    const toolNode = new ToolNode<BaseMessage[]>(tools);
    const executionModel = chatModel.bindTools(tools);

    const response = await executionModel.invoke(
      getExecutionPrompt({
        nextAction: nextItem,
        executedActions: state.processedActions,
      })
    );
    const toolCalls = getToolCalls(response);

    console.log('*** processQueueItem - toolCalls: ', toolCalls);

    const toolMessages = await toolNode.invoke([response]);
    const toolResults = extractToolResults(toolMessages);

    const processedActions: ExecutedAction[] = [];
    processedActions.push({
      ...nextItem,
      toolName: toolCalls[0].toolId.toolId,
      arguments: toolCalls[0].args,
      response: toolResults[0].result,
    });

    return {
      actionsQueue: queue,
      processedActions: [processedActions],
    };
  };

  const evaluateQueue = async (state: typeof StateAnnotation.State) => {
    const { actionsQueue } = state;
    if (actionsQueue.length) {
      return 'process_queue_item';
    }
    return 'reflection';
  };

  const reflection = async (state: typeof StateAnnotation.State) => {
    const reflectModel = chatModel.withStructuredOutput(
      z.object({
        isSufficient: z
          .boolean()
          .describe('Whether the provided info are sufficient to answer the user question'),
        knowledgeGaps: z
          .array(z.string())
          .describe('A description of what information is missing or needs clarification'),
        reasoning: z
          .string()
          .optional()
          .describe(
            'Optional reasoning on why the provided info are sufficient or not. Can be used as scratch pad for thoughts.'
          ),
      })
    );

    const response: ReflectionResult = await reflectModel.invoke(
      getReflectionPrompt({
        userQuery: state.initialQuery,
        summaries: state.processedActions,
      })
    );

    console.log('*** reflection response: ', response);

    return {
      lastReflectionResult: response,
      actionsQueue: [
        ...state.actionsQueue,
        response.knowledgeGaps.map((gap) => ({ knowledgeGap: gap })),
      ],
    };
  };

  const evaluateReflection = async (state: typeof StateAnnotation.State) => {
    if (state.lastReflectionResult.isSufficient) {
      return 'answer';
    }
    return 'process_queue_item';
  };

  const answer = async (state: typeof StateAnnotation.State) => {
    const response = await chatModel.invoke(
      getAnswerPrompt({
        userQuery: state.initialQuery,
        executedActions: state.processedActions,
      })
    );

    const generatedAnswer = extractTextContent(response);

    console.log('*** answer - response: ', generatedAnswer);

    return {
      generatedAnswer,
    };
  };

  // note: the node names are used in the event convertion logic, they should *not* be changed
  const graph = new StateGraph(StateAnnotation)
    .addNode('initialize', initialize)
    .addNode('process_queue_item', processQueueItem)
    .addNode('reflection', reflection)
    .addNode('answer', answer)
    .addEdge('__start__', 'initialize')
    .addEdge('initialize', 'process_queue_item')
    .addConditionalEdges('process_queue_item', evaluateQueue, {
      process_queue_item: 'process_queue_item',
      reflection: 'reflection',
    })
    .addConditionalEdges('reflection', evaluateReflection, {
      process_queue_item: 'process_queue_item',
      answer: 'answer',
    })
    .addEdge('answer', '__end__')
    .compile();

  return graph;
};
