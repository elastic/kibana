/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BaseMessageLike } from '@langchain/core/messages';
import type { PlannedAction, ExecutedAction } from './graph';

export const getExecutionPrompt = ({
  nextAction,
  executedActions,
}: {
  nextAction: PlannedAction;
  executedActions: ExecutedAction[];
}): BaseMessageLike[] => {
  return [
    [
      'system',
      `You are an expert research assistant from the Elasticsearch company.

      Instructions:
       You will be with a goal, and a list of already executed actions. With those information,
       please choose which tool to call to reach the goal.

      Requirements:
      - You *must* call a tool
      - Be attentive, as some tools may require information from the previously executed action. For
        example, search tools usually require to target an index, which can be retrieved using the index explorer tool.
      - Be careful to not call the same tool twice with the same parameters. Check the action history.

      Action history and current goal will be provided in the next user message.
      `,
    ],
    [
      'user',
      `
      ### Current goal:

      Trying to find information about: "${nextAction.knowledgeGap}"

      ### Action history:

      ${executedActions.map((action) => JSON.stringify(action, undefined, 2)).join('\n')}
    `,
    ],
  ];
};

export const getReflectionPrompt = ({
  userQuery,
  summaries,
}: {
  userQuery: string;
  summaries: any[];
}): BaseMessageLike[] => {
  return [
    [
      'system',
      `You are an expert research assistant from the Elasticsearch company analyzing summaries about "${userQuery}".

      Instructions:
       Identify knowledge gaps or areas that need deeper exploration and generate the corresponding follow-up queries. (1 or multiple).
      - If provided summaries are sufficient to answer the user's question, don't generate a follow-up query.
      - Focus on technical details, implementation specifics, or emerging trends that weren't fully covered.

      Requirements:
      - Ensure the follow-up query is self-contained and includes necessary context for web search.

      Output Format:
      - Format your response as a JSON object with these exact keys:
         - "is_sufficient": true or false
         - "knowledge_gap": Describe what information is missing or needs clarification
         - "follow_up_queries": Write a specific question to address this gap

      Example 1: if information are sufficient:
      \`\`\`json
      {
          "isSufficient": true,
          "knowledgeGaps": [],
      }
      \`\`\`
      `,
    ],
    [
      'user',
      `
      ### Summaries:

      ${summaries.map((summary) => JSON.stringify(summary, undefined, 2)).join('\n')}
    `,
    ],
  ];
};

export const getAnswerPrompt = ({
  userQuery,
  executedActions,
}: {
  userQuery: string;
  executedActions: ExecutedAction[];
}): BaseMessageLike[] => {
  return [
    [
      'system',
      `Generate a high-quality answer to the user's question based on the provided summaries.

      Instructions:
      - The current date is ${new Date().toISOString()}.
      - You are the final step of a multi-step research process, don't mention that you are the final step.
      - You have access to all the information gathered from the previous steps.
      - You have access to the user's question.
      - Generate a high-quality answer to the user's question based on the provided summaries and the user's question.

      User Context:
      - {research_topic}

      Summaries:
      {summaries}
      `,
    ],
    [
      'user',
      `
      ### User question

      "${userQuery}"

      ### Gathered information

      \`\`\`json
      ${JSON.stringify(executedActions, undefined, 2)}
      \`\`\`
    `,
    ],
  ];
};
