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
import { getToolCalls, extractTextContent } from '../chat/utils/from_langchain_messages';
import { getReflectionPrompt, getExecutionPrompt, getAnswerPrompt } from './prompts';
import { extractToolResults } from './utils';
import { ActionResult, ReflectionResult, BacklogItem, lastReflectionResult } from './backlog';

export interface ResearchGoal {
  question: string;
}

export const createAgentGraph = async ({
  chatModel,
  tools,
}: {
  chatModel: InferenceChatModel;
  tools: StructuredTool[];
  logger: Logger;
}) => {
  const StateAnnotation = Annotation.Root({
    // inputs
    initialQuery: Annotation<string>(), // the search query
    cycleBudget: Annotation<number>(), // budget in number of cycles - TODO
    // internal state
    actionsQueue: Annotation<ResearchGoal[], ResearchGoal[]>({
      reducer: (state, actions) => {
        return actions ?? state;
      },
      default: () => [],
    }),
    backlog: Annotation<BacklogItem[]>({
      reducer: (current, next) => {
        return [...current, ...next];
      },
      default: () => [],
    }),
    // outputs
    generatedAnswer: Annotation<string>(),
  });

  /**
   * Initialize the flow by adding a first index explorer call to the action queue.
   */
  const initialize = async (state: typeof StateAnnotation.State) => {
    const firstAction: ResearchGoal = {
      question: state.initialQuery,
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
        currentResearchGoal: nextItem,
        backlog: state.backlog,
      })
    );
    const toolCalls = getToolCalls(response);

    console.log('*** processQueueItem - toolCalls: ', toolCalls);

    const toolMessages = await toolNode.invoke([response]);
    const toolResults = extractToolResults(toolMessages);

    const actionResults: ActionResult[] = [];
    for (let i = 0; i < toolResults.length; i++) {
      const toolCall = toolCalls[i];
      const toolResult = toolResults[i];
      if (toolCall && toolResult) {
        const actionResult: ActionResult = {
          researchGoal: nextItem.question,
          toolName: toolCall.toolId.toolId,
          arguments: toolCall.args,
          response: toolResult.result,
        };
        actionResults.push(actionResult);
      }
    }

    return {
      actionsQueue: queue,
      backlog: [actionResults],
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
        isSufficient: z.boolean().describe(
          `Set to true if the current information fully answers the user question without requiring further research.
           Set to false if any knowledge gaps or unresolved sub-problems remain.`
        ),
        nextQuestions: z.array(z.string()).describe(
          `A list of self-contained, actionable research questions or sub-problems that need to be explored
          further to fully answer the user question. Leave empty if isSufficient is true.`
        ),
        reasoning: z
          .string()
          .optional()
          .describe(
            `Brief internal reasoning explaining why the current information is sufficient or not.
            You may list what was already answered, what gaps exist, or whether decomposition was necessary.
            Use this as your thought process or scratchpad before producing the final output.`
          ),
      })
    );

    const response: ReflectionResult = await reflectModel.invoke(
      getReflectionPrompt({
        userQuery: state.initialQuery,
        backlog: state.backlog,
      })
    );

    console.log('*** reflection response: ', response);

    return {
      backlog: [...state.backlog, response],
      actionsQueue: [
        ...state.actionsQueue,
        response.nextQuestions.map<ResearchGoal>((nextQuestion) => ({ question: nextQuestion })),
      ],
    };
  };

  const evaluateReflection = async (state: typeof StateAnnotation.State) => {
    const reflectionResult = lastReflectionResult(state.backlog);
    console.log(
      '*** evaluateReflection - state: ',
      reflectionResult.isSufficient,
      reflectionResult.reasoning
    );

    if (reflectionResult.isSufficient) {
      return 'answer';
    }
    return 'process_queue_item';
  };

  const answer = async (state: typeof StateAnnotation.State) => {
    console.log('*** answer - start');

    const answerModel = chatModel.withConfig({
      tags: ['researcher-answer'],
    });

    const response = await answerModel.invoke(
      getAnswerPrompt({
        userQuery: state.initialQuery,
        backlog: state.backlog,
      })
    );

    console.log('*** answer - raw response: ', response);

    const generatedAnswer = extractTextContent(response);

    console.log('*** answer - response: ', generatedAnswer);

    return {
      generatedAnswer,
    };
  };

  // note: the node names are used in the event convertion logic, they should *not* be changed
  const graph = new StateGraph(StateAnnotation)
    // nodes
    .addNode('initialize', initialize)
    .addNode('process_queue_item', processQueueItem)
    .addNode('reflection', reflection)
    .addNode('answer', answer)
    // edges
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
