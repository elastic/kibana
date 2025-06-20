/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { StateGraph, Annotation, Send } from '@langchain/langgraph';
import { BaseMessage } from '@langchain/core/messages';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import type { StructuredTool } from '@langchain/core/tools';
import type { Logger } from '@kbn/core/server';
import { InferenceChatModel } from '@kbn/inference-langchain';
import { getToolCalls, extractTextContent } from '../chat/utils/from_langchain_messages';
import { getReflectionPrompt, getExecutionPrompt, getAnswerPrompt } from './prompts';
import { extractToolResults } from './utils';
import { ActionResult, ReflectionResult, BacklogItem, lastReflectionResult } from './backlog';

const StateAnnotation = Annotation.Root({
  // inputs
  initialQuery: Annotation<string>(), // the search query
  cycleBudget: Annotation<number>(), // budget in number of cycles
  // internal state
  remainingCycles: Annotation<number>(),
  actionsQueue: Annotation<ResearchGoal[], ResearchGoal[]>({
    reducer: (state, actions) => {
      return actions ?? state;
    },
    default: () => [],
  }),
  pendingActions: Annotation<ActionResult[], ActionResult[] | 'clear'>({
    reducer: (state, actions) => {
      return actions === 'clear' ? [] : [...state, ...actions];
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

export type StateType = typeof StateAnnotation.State;

type ResearchStepState = StateType & {
  researchGoal: ResearchGoal;
};

export interface ResearchGoal {
  question: string;
}

export const createResearcherAgentGraph = async ({
  chatModel,
  tools,
  logger: log,
}: {
  chatModel: InferenceChatModel;
  tools: StructuredTool[];
  logger: Logger;
}) => {
  const stringify = (obj: unknown) => JSON.stringify(obj, null, 2);

  /**
   * Initialize the flow by adding a first index explorer call to the action queue.
   */
  const initialize = async (state: StateType) => {
    const firstAction: ResearchGoal = {
      question: state.initialQuery,
    };
    return {
      actionsQueue: [firstAction],
      remainingCycles: state.cycleBudget,
    };
  };

  const dispatchActions = async (state: StateType) => {
    return state.actionsQueue.map((action) => {
      return new Send('perform_search', {
        ...state,
        researchGoal: action,
      } satisfies ResearchStepState);
    });
  };

  const performSearch = async (state: ResearchStepState) => {
    const nextItem = state.researchGoal;

    log.trace(() => `performSearch - nextItem: ${stringify(nextItem)}`);

    const toolNode = new ToolNode<BaseMessage[]>(tools);
    const executionModel = chatModel.bindTools(tools);

    const response = await executionModel.invoke(
      getExecutionPrompt({
        currentResearchGoal: nextItem,
        backlog: state.backlog,
      })
    );
    const toolCalls = getToolCalls(response);

    log.trace(() => `performSearch - toolCalls: ${stringify(toolCalls)}`);

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
      pendingActions: [...actionResults],
    };
  };

  const collectResults = async (state: StateType) => {
    log.trace(
      () =>
        `collectResults - pending actions: ${stringify(
          state.pendingActions.map((action) => action.researchGoal)
        )}`
    );

    return {
      pendingActions: 'clear',
      actionsQueue: [],
      backlog: [...state.pendingActions],
    };
  };

  const reflection = async (state: StateType) => {
    const reflectModel = chatModel
      .withStructuredOutput(
        z.object({
          isSufficient: z.boolean().describe(
            `Set to true if the current information fully answers the user question without requiring further research.
           Set to false if any knowledge gaps or unresolved sub-problems remain.`
          ),
          nextQuestions: z.array(z.string()).describe(
            `A list of self-contained, actionable research questions or sub-problems that need to be explored
          further to fully answer the user question. Leave empty if isSufficient is true.`
          ),
          reasoning: z.string().describe(
            `Brief internal reasoning explaining why the current information is sufficient or not.
            You may list what was already answered, what gaps exist, or whether decomposition was necessary.
            Use this as your thought process or scratchpad before producing the final output.`
          ),
        })
      )
      .withConfig({
        tags: ['researcher-reflection'],
      });

    const response: ReflectionResult = await reflectModel.invoke(
      getReflectionPrompt({
        userQuery: state.initialQuery,
        backlog: state.backlog,
        maxFollowUpQuestions: 3,
        remainingCycles: state.remainingCycles - 1,
      })
    );

    log.trace(
      () =>
        `reflection - remaining cycles: ${state.remainingCycles} - response: ${stringify(response)}`
    );

    return {
      remainingCycles: state.remainingCycles - 1,
      backlog: [response],
      actionsQueue: [
        ...state.actionsQueue,
        ...response.nextQuestions.map<ResearchGoal>((nextQuestion) => ({ question: nextQuestion })),
      ],
    };
  };

  const evaluateReflection = async (state: StateType) => {
    const remainingCycles = state.remainingCycles;
    const reflectionResult = lastReflectionResult(state.backlog);

    if (reflectionResult.isSufficient || remainingCycles <= 0) {
      return 'answer';
    }
    return dispatchActions(state);
  };

  const answer = async (state: StateType) => {
    const answerModel = chatModel.withConfig({
      tags: ['researcher-answer'],
    });

    const response = await answerModel.invoke(
      getAnswerPrompt({
        userQuery: state.initialQuery,
        backlog: state.backlog,
      })
    );

    const generatedAnswer = extractTextContent(response);

    log.trace(() => `answer - response ${stringify(generatedAnswer)}`);

    return {
      generatedAnswer,
    };
  };

  // note: the node names are used in the event convertion logic, they should *not* be changed
  const graph = new StateGraph(StateAnnotation)
    // nodes
    .addNode('initialize', initialize)
    .addNode('perform_search', performSearch)
    .addNode('collect_results', collectResults)
    .addNode('reflection', reflection)
    .addNode('answer', answer)
    // edges
    .addEdge('__start__', 'initialize')
    .addConditionalEdges('initialize', dispatchActions, {
      perform_search: 'perform_search',
    })
    .addEdge('perform_search', 'collect_results')
    .addEdge('collect_results', 'reflection')
    .addConditionalEdges('reflection', evaluateReflection, {
      perform_search: 'perform_search',
      answer: 'answer',
    })
    .addEdge('answer', '__end__')
    .compile();

  return graph;
};
