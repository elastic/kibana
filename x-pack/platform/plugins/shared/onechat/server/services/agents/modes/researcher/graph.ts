/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { StateGraph, Annotation, Send } from '@langchain/langgraph';
import { BaseMessage } from '@langchain/core/messages';
import { messagesStateReducer } from '@langchain/langgraph';
import { StructuredTool, DynamicStructuredTool } from '@langchain/core/tools';
import type { Logger } from '@kbn/core/server';
import { InferenceChatModel } from '@kbn/inference-langchain';
import { extractToolCalls, extractTextContent } from '@kbn/onechat-genai-utils/langchain';
import { createAgentGraph } from '../chat/graph';
import {
  getIdentifyResearchGoalPrompt,
  getReflectionPrompt,
  getExecutionPrompt,
  getAnswerPrompt,
} from './prompts';
import { SearchResult, ReflectionResult, BacklogItem, lastReflectionResult } from './backlog';

const setResearchGoalToolName = 'set_research_goal';

const setResearchGoalTool = () => {
  return new DynamicStructuredTool({
    name: setResearchGoalToolName,
    description: 'use this tool to set the research goal that will be used for the research',
    schema: z.object({
      reasoning: z
        .string()
        .describe('brief reasoning of how and why you defined this research goal'),
      researchGoal: z.string().describe('the identified research goal'),
    }),
    func: () => {
      throw new Error(`${setResearchGoalToolName} was called and shouldn't have`);
    },
  });
};

const StateAnnotation = Annotation.Root({
  // inputs
  initialMessages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),
  cycleBudget: Annotation<number>(), // budget in number of cycles
  // internal state
  mainResearchGoal: Annotation<string>(),
  remainingCycles: Annotation<number>(),
  actionsQueue: Annotation<ResearchGoal[], ResearchGoal[]>({
    reducer: (state, actions) => {
      return actions ?? state;
    },
    default: () => [],
  }),
  pendingActions: Annotation<SearchResult[], SearchResult[] | 'clear'>({
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
  subResearchGoal: ResearchGoal;
};

export interface ResearchGoal {
  question: string;
}

export const createResearcherAgentGraph = async ({
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
   * Identify the research goal from the current discussion, or ask for additional info if required.
   */
  const identifyResearchGoal = async (state: StateType) => {
    const researchGoalModel = chatModel.bindTools([setResearchGoalTool()]).withConfig({
      tags: ['researcher-identify-research-goal', 'researcher-ask-for-clarification'],
    });

    const response = await researchGoalModel.invoke(
      getIdentifyResearchGoalPrompt({ discussion: state.initialMessages, customInstructions })
    );

    const toolCalls = extractToolCalls(response);
    const textContent = extractTextContent(response);

    log.trace(
      () =>
        `identifyResearchGoal - textContent: ${textContent} - toolCalls: ${stringify(toolCalls)}`
    );

    if (toolCalls.length > 0) {
      const { researchGoal, reasoning } = toolCalls[0].args as {
        researchGoal: string;
        reasoning: string;
      };
      const firstAction: ResearchGoal = {
        question: researchGoal,
      };
      return {
        mainResearchGoal: researchGoal,
        backlog: [{ researchGoal, reasoning }],
        actionsQueue: [firstAction],
        remainingCycles: state.cycleBudget,
      };
    } else {
      const generatedAnswer = textContent;
      return {
        generatedAnswer,
        remainingCycles: state.cycleBudget,
      };
    }
  };

  const evaluateResearchGoal = async (state: StateType) => {
    if (state.generatedAnswer) {
      return '__end__';
    }
    return dispatchActions(state);
  };

  const dispatchActions = async (state: StateType) => {
    return state.actionsQueue.map((action) => {
      return new Send('perform_search', {
        ...state,
        subResearchGoal: action,
      } satisfies ResearchStepState);
    });
  };

  const performSearch = async (state: ResearchStepState) => {
    const nextItem = state.subResearchGoal;

    log.trace(() => `performSearch - nextItem: ${stringify(nextItem)}`);

    const executorAgent = createAgentGraph({
      chatModel,
      tools,
      logger: log,
      noPrompt: true,
    });

    const { addedMessages } = await executorAgent.invoke(
      {
        initialMessages: getExecutionPrompt({
          currentResearchGoal: nextItem,
          backlog: state.backlog,
          customInstructions,
        }),
      },
      { tags: ['executor_agent'], metadata: { graphName: 'executor_agent' } }
    );

    const agentResponse = extractTextContent(addedMessages[addedMessages.length - 1]);

    const actionResult: SearchResult = {
      researchGoal: nextItem.question,
      output: agentResponse,
    };

    return {
      pendingActions: [actionResult],
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
        userQuery: state.mainResearchGoal,
        backlog: state.backlog,
        maxFollowUpQuestions: 3,
        remainingCycles: state.remainingCycles - 1,
        customInstructions,
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
        userQuery: state.mainResearchGoal,
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
    .addNode('identify_research_goal', identifyResearchGoal)
    .addNode('perform_search', performSearch)
    .addNode('collect_results', collectResults)
    .addNode('reflection', reflection)
    .addNode('answer', answer)
    // edges
    .addEdge('__start__', 'identify_research_goal')
    .addConditionalEdges('identify_research_goal', evaluateResearchGoal, {
      perform_search: 'perform_search',
      __end__: '__end__',
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
