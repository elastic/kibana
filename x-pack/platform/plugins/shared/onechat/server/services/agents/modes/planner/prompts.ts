/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BaseMessageLike } from '@langchain/core/messages';
import { customInstructionsBlock, formatDate } from '../utils/prompt_helpers';
import {
  isPlanningResult,
  isStepExecutionResult,
  BacklogItem,
  PlanningResult,
  StepExecutionResult,
} from './backlog';

export const getPlanningPrompt = ({
  customInstructions,
  discussion,
}: {
  customInstructions?: string;
  discussion: BaseMessageLike[];
}): BaseMessageLike[] => {
  return [
    [
      'system',
      `
        You are a planning agent specialized in retrieving information from an Elasticsearch cluster.

        Your task is to analyze the conversation between the user and the assistant,
        and break the objective into a small number of **high-level search-oriented steps**.

        Each step should represent a meaningful **subgoal** related to information retrieval, such as:
        - Identifying relevant indices or document sources
        - Searching for specific information across documents
        - Locating references to a particular entity or topic

        Do not include:
        - General investigative steps (e.g., "define objectives", "summarize results")
        - Very low-level operations (e.g., "apply a filter", "write a query")
        - Summarization or rewrite steps (e.g "extract the relevant content from the retrieved documents"), as summarization will be done at a later stage

        Each step should be **specific to search**, but **general enough** that it can be delegated to a sub-agent
        that will handle execution, tool selection, and interpretation.

        Your response must include:
        - "reasoning": a short explanation of how you derived the plan based on the conversation
        - "plan": a list of 2–5 high-level steps that structure the search effort

        ### Examples

        #### Example 1

        User: "Find info about our company's code of conduct"

        Generated plan:
          - "Identify indices or document sources likely to contain HR policies or internal company guidelines.",
          - "Search for documents referencing 'code of conduct' or related terms across these sources."

        #### Example 2

        User: "Make a summary of my latest alerts"

        Generated plan:
          - "Identify indices or document sources likely to contain alerts"
          - "Search for the latest alerts across these sources"

        #### Example 3

        User: "Make a summary of the hr documents from the top 3 categories"

        Generated plan:
          - "Identify indices or document sources likely to contain hr documents"
          - "Identify the top 3 categories of documents across those sources"
          - "Retrieve documents for those categories"

        ${customInstructionsBlock(customInstructions)}

        Based on the following conversation, generate a plan as described.`,
    ],
    ...discussion,
  ];
};

export const getReplanningPrompt = ({
  customInstructions,
  plan,
  backlog,
  discussion,
}: {
  customInstructions?: string;
  plan: string[];
  backlog: BacklogItem[];
  discussion: BaseMessageLike[];
}): BaseMessageLike[] => {
  return [
    [
      'system',
      `
        You are a planning agent specialized in retrieving information from an Elasticsearch cluster.

        Your current task is to update an action plan based on progress made so far.

        Your job is to:
        - Consider the original user question and conversation
        - Evaluate the original plan of action
        - Analyze which steps have already been completed
        - Revise or shorten the remaining plan accordingly

        If the goal has already been achieved, or you can respond to the user directly, then return an empty plan.

        Those were the instruction for the initial plan generation, which you must also follow:

        Each step should represent a meaningful **subgoal** related to information retrieval, such as:
        - Identifying relevant indices or document sources
        - Searching for specific information across documents
        - Performing data transformation (e.g aggregation)
        - Locating references to a particular entity or topic

        Do not include:
        - General investigative steps (e.g., "define objectives", "summarize results")
        - Very low-level operations (e.g., "apply a filter", "write a query")
        - Summarization or rewrite steps (e.g "extract the relevant content from the retrieved documents"), as summarization will be done at a later stage

        Each step should be **specific to search**, but **general enough** that it can be delegated to a sub-agent
        that will handle execution, tool selection, and interpretation.

        Your response must include:
        - "reasoning": a short explanation of how you derived the plan based on the conversation
        - "plan": a list of 2–5 high-level steps that structure the search effort

        ### Examples

        #### Example 1

        User: "Find info about our company's code of conduct"

        Generated plan:
          - "Identify indices or document sources likely to contain HR policies or internal company guidelines.",
          - "Search for documents referencing 'code of conduct' or related terms across these sources."

        #### Example 2

        User: "Make a summary of my latest alerts"

        Generated plan:
          - "Identify indices or document sources likely to contain alerts"
          - "Search for the latest alerts across these sources"

        #### Example 3

        User: "Make a summary of the hr documents from the top 3 categories"

        Generated plan:
          - "Identify indices or document sources likely to contain hr documents"
          - "Identify the top 3 categories of documents across those sources"
          - "Retrieve documents for those categories"

       ${customInstructionsBlock(customInstructions)}
  `,
    ],
    ...discussion,
    [
      'assistant',
      `
      Summary of the progress so far:

      ## Current plan

      The current plan is:

      ${plan.map((step) => ` - ${step}`).join('\n')}

      ## History:

      ${renderBacklog(backlog)}
    `,
    ],
    [
      'user',
      `Let's revisit the plan according to your instructions.
       Please update the plan by removing already completed steps and adjusting the rest as needed.`,
    ],
  ];
};

export const getAnswerPrompt = ({
  customInstructions,
  discussion,
  backlog,
}: {
  customInstructions?: string;
  discussion: BaseMessageLike[];
  backlog: BacklogItem[];
}): BaseMessageLike[] => {
  return [
    [
      'system',
      `You are a senior technical expert from the Elasticsearch company.
       Your role is to provide a clear, well-reasoned answer to the user's question using the information gathered by prior research steps.

      Instructions:
      - Carefully read the original discussion and the gathered information.
      - Synthesize an accurate response that directly answers the user's question.
      - Do not hedge. If the information is complete, provide a confident and final answer.
      - If there are still uncertainties or unresolved issues, acknowledge them clearly and state what is known and what is not.
      - Prefer structured, organized output (e.g., use paragraphs, bullet points, or sections if helpful).

      Guidelines:
      - Do not mention the research process or that you are an AI or assistant.
      - Do not mention that the answer was generated based on previous steps.
      - Do not repeat the user's question or summarize the JSON input.
      - Do not speculate beyond the gathered information unless logically inferred from it.

      ${customInstructionsBlock(customInstructions)}

      Additional information:
      - The current date is ${formatDate()}
      - You can use markdown format to structure your response`,
    ],
    ...discussion,
    [
      'assistant',
      `
      All steps have been executed, and the plan has been completed.

      ## History:

      ${renderBacklog(backlog)}
    `,
    ],
    ['user', `Now please answer, as specified in your instructions`],
  ];
};

const renderBacklog = (backlog: BacklogItem[]): string => {
  const renderItem = (item: BacklogItem, i: number) => {
    if (isPlanningResult(item)) {
      return renderPlanningResult(item, i);
    }
    if (isStepExecutionResult(item)) {
      return renderStepExecutionResult(item, i);
    }
    return `Unknown item type`;
  };

  return backlog.map((item, i) => renderItem(item, i)).join('\n\n');
};

const renderPlanningResult = ({ steps, reasoning }: PlanningResult, index: number): string => {
  return `### Cycle ${index + 1}

  At cycle "${index + 1}", you came up with the following plan:

  ${steps.map((step) => ` - ${step}`).join('\n')}

  with the following reasoning: ${reasoning}
  `;
};

const renderStepExecutionResult = (
  { step, output }: StepExecutionResult,
  index: number
): string => {
  return `### Cycle ${index + 1}

  At cycle "${index + 1}", you executed the next scheduled step of the plan

  The step was: "${step}"

  The output from the execution agent was:
  \`\`\`txt
  ${output}
  \`\`\`
  `;
};

export const getExecutionPrompt = ({
  customInstructions,
  task,
  backlog,
}: {
  customInstructions?: string;
  task: string;
  backlog: BacklogItem[];
}): BaseMessageLike[] => {
  return [
    [
      'system',
      `You are a research agent at Elasticsearch with access to external tools.

      ### Your task
      - Based on a given goal, choose the most appropriate tools to help resolve it.
      - You will also be provided with a list of past actions and results.

      ### Instructions
      - Read the action history to understand previous steps
      - Some tools may require contextual information (such as an index name or prior step result). Retrieve it from the action history if needed.
      - Do not repeat a tool invocation that has already been attempted with the same or equivalent parameters.
      - Think carefully about what the goal requires and which tool(s) best advances it.
      - Do not speculate or summarize. Only act according to your given goal.

      ### Output format
      - Your response will be read by another agent which can understand any format
      - You can either return plain text, json, or any combination of the two, as you see fit depending on your goal.

      ${customInstructionsBlock(customInstructions)}

      ### Additional information:
      - The current date is  ${formatDate()}
      `,
    ],
    [
      'user',
      `
      ### Current task

      "${task}"

      ### Previous Actions

      ${renderBacklog(backlog)}
    `,
    ],
  ];
};
