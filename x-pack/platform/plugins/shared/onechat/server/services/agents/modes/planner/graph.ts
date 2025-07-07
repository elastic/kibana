/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { StateGraph, Annotation } from '@langchain/langgraph';
import { BaseMessage } from '@langchain/core/messages';
import { messagesStateReducer } from '@langchain/langgraph';
import { StructuredTool } from '@langchain/core/tools';
import type { Logger } from '@kbn/core/server';
import { InferenceChatModel } from '@kbn/inference-langchain';
import { extractTextContent } from '@kbn/onechat-genai-utils/langchain';
import { createAgentGraph } from '../chat/graph';
import {
  getPlanningPrompt,
  getExecutionPrompt,
  getReplanningPrompt,
  getAnswerPrompt,
} from './prompts';
import { BacklogItem, PlanningResult } from './backlog';

const StateAnnotation = Annotation.Root({
  // inputs
  initialMessages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),
  remainingCycles: Annotation<number>(),
  // internal state
  plan: Annotation<string[]>(),
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

export const createPlannerAgentGraph = async ({
  chatModel,
  tools,
  customInstructions,
  logger: log,
}: {
  chatModel: InferenceChatModel;
  tools: StructuredTool[];
  customInstructions?: string;
  logger: Logger;
}) => {
  const stringify = (obj: unknown) => JSON.stringify(obj, null, 2);

  /**
   * Create a plan based on the current discussion.
   */
  const createPlan = async (state: StateType) => {
    const plannerModel = chatModel
      .withStructuredOutput(
        z.object({
          reasoning: z.string().describe(`Internal reasoning of how you come to such plan`),
          plan: z.array(z.string()).describe('Steps identified for the action plan'),
        })
      )
      .withConfig({
        tags: ['planner:create_plan'],
      });

    const response = await plannerModel.invoke(
      getPlanningPrompt({ discussion: state.initialMessages, customInstructions })
    );

    log.trace(() => `createPlan - response: ${stringify(response)}`);

    const plan: PlanningResult = {
      reasoning: response.reasoning,
      steps: response.plan,
    };

    return {
      plan: plan.steps,
      backlog: [plan],
    };
  };

  /**
   * Delegates execution of the next step in the plan to an executor agent.
   */
  const executeStep = async (state: StateType) => {
    const nextTask = state.plan[0];

    const executorAgent = createAgentGraph({
      chatModel,
      tools,
      logger: log,
      noPrompt: true,
    });

    const { addedMessages } = await executorAgent.invoke(
      {
        initialMessages: getExecutionPrompt({
          task: nextTask,
          backlog: state.backlog,
          customInstructions,
        }),
      },
      { tags: ['executor_agent'], metadata: { graphName: 'executor_agent' } }
    );

    const messageContent = extractTextContent(addedMessages[addedMessages.length - 1]);

    log.trace(() => `executeStep - step: ${nextTask} - response: ${messageContent}`);

    return {
      plan: state.plan.slice(1),
      backlog: [{ step: nextTask, output: messageContent }],
    };
  };

  /**
   * Eventually revise the plan according to the result of the last action.
   */
  const revisePlan = async (state: StateType) => {
    const revisePlanModel = chatModel
      .withStructuredOutput(
        z.object({
          reasoning: z.string().describe(`Internal reasoning of how you come to update the plan`),
          plan: z.array(z.string()).describe('Steps identified for the revised action plan'),
        })
      )
      .withConfig({
        tags: ['planner:revise-plan'],
      });

    const response = await revisePlanModel.invoke(
      getReplanningPrompt({
        discussion: state.initialMessages,
        plan: state.plan,
        backlog: state.backlog,
        customInstructions,
      })
    );

    const plan: PlanningResult = {
      reasoning: response.reasoning,
      steps: response.plan,
    };

    log.trace(() => `revisePlan - ${stringify(plan)}`);

    return {
      plan: plan.steps,
      backlog: [plan],
    };
  };

  const revisePlanTransition = async (state: StateType) => {
    const remainingCycles = state.remainingCycles;
    if (state.plan.length <= 0 || remainingCycles <= 0) {
      return 'answer';
    }
    return 'execute_step';
  };

  const answer = async (state: StateType) => {
    const answerModel = chatModel.withConfig({
      tags: ['planner:answer'],
    });

    const response = await answerModel.invoke(
      getAnswerPrompt({
        discussion: state.initialMessages,
        backlog: state.backlog,
        customInstructions,
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
    .addNode('create_plan', createPlan)
    .addNode('execute_step', executeStep)
    .addNode('revise_plan', revisePlan)
    .addNode('answer', answer)
    // edges
    .addEdge('__start__', 'create_plan')
    .addEdge('create_plan', 'execute_step')
    .addEdge('execute_step', 'revise_plan')
    .addConditionalEdges('revise_plan', revisePlanTransition, {
      execute_step: 'execute_step',
      answer: 'answer',
    })
    .addEdge('answer', '__end__')
    .compile();

  return graph;
};
