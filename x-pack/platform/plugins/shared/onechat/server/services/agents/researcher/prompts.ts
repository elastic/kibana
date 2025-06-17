/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BaseMessageLike } from '@langchain/core/messages';
import { BuiltinToolIds as Tools } from '@kbn/onechat-common';
import type { ResearchGoal } from './graph';
import {
  isActionResult,
  isReflectionResult,
  BacklogItem,
  ReflectionResult,
  ActionResult,
} from './backlog';

export const getExecutionPrompt = ({
  currentResearchGoal,
  backlog,
}: {
  currentResearchGoal: ResearchGoal;
  backlog: BacklogItem[];
}): BaseMessageLike[] => {
  return [
    [
      'system',
      `You are a research agent at Elasticsearch with access to external tools.

      ### Your task
      - Based on a research goal, choose the most appropriate tool to help resolve it.
      - You will also be provided with a list of past actions and results.

      ### Instructions
      - You must select one tool and invoke it with the most relevant and precise parameters.
      - Choose the tool that will best help fulfill the current research goal.
      - Some tools (e.g., search) may require contextual information (such as an index name or prior step result). Retrieve it from the action history if needed.
      - Do not repeat a tool invocation that has already been attempted with the same or equivalent parameters.
      - Think carefully about what the goal requires and which tool best advances it.

      ### Constraints
      - Tool use is mandatory. You must respond with a tool call.
      - Do not speculate or summarize. Only act by selecting the best next tool and invoking it.

      ### Tools description
      Your two main search tools are "${Tools.relevanceSearch}" and "${Tools.naturalLanguageSearch}"
      - When doing fulltext search, prefer the "${
        Tools.relevanceSearch
      }" tool as it performs better for plain fulltext searches.
      - For more advanced queries (filtering, aggregation, buckets), use the "${
        Tools.naturalLanguageSearch
      }" tool.


      ### Output format
      Respond using the tool-calling schema provided by the system.

      ### Additional information
      - The current date is ${new Date().toISOString()}.
      `,
    ],
    [
      'user',
      `
      ### Current Research Goal

      Trying to find information about: "${currentResearchGoal.question}"

      ### Previous Actions

      ${renderBacklog(backlog)}
    `,
    ],
  ];
};

export const getReflectionPrompt = ({
  userQuery,
  backlog,
  maxFollowUpQuestions = 3,
  remainingCycles,
  cycleBoundaries = { exploration: 3, refinement: 2, finalization: 1 },
}: {
  userQuery: string;
  backlog: BacklogItem[];
  remainingCycles: number;
  maxFollowUpQuestions?: number;
  cycleBoundaries?: { exploration: number; refinement: number; finalization: number };
}): BaseMessageLike[] => {
  return [
    [
      'system',
      `You are an expert research assistant from the Elasticsearch company analyzing information about the user's question: "${userQuery}".

      Instructions:
      - Analyze the completeness and depth of data available in your backlog history.
      - Identify any missing, unclear, or shallow information.
      - If necessary, break down complex questions into smaller sub-problems.
      - Your goal is to generate a precise list of actionable questions that will help drive the research forward.

      Cycle Awareness:
      - The research process is bounded. There is exactly **${remainingCycles} cycles remaining** before a final answer must be produced.
      - Use the following strategy based on that number:
        - If ${cycleBoundaries.exploration} or more cycles remain:
          - You may explore deeper subtopics or decompositions.
          - Pursue emerging trends, architectural alternatives, or implementation-specific nuances.
        - If ${cycleBoundaries.refinement} or more cycles remain:
          - Focus on clarifying known gaps or weak spots in the current summaries.
          - Prefer precision over breadth.
        - If ${cycleBoundaries.finalization} or less cycle remains:
          - There is no time for further exploration.
          - Surface only essential missing information that would block the final answer.
          - Avoid speculative or marginal questions.

      Guidelines:
      - Only generate questions if the current information is incomplete or insufficient.
      - Do not generate more than ${maxFollowUpQuestions} actionable questions.
      - Focus on technical depth, implementation details, trade-offs, edge cases, or emerging trends.
      - Each question must be self-contained and ready to be used for search or further investigation.

      Additional information:
      - The current date is ${new Date().toISOString()}.

      Output Format:
      - Format your response as a JSON object with these exact keys:
         - "isSufficient": true or false
         - "nextQuestions": list of standalone research questions (empty if isSufficient is true)
         - "reasoning": internal reasoning (brief thought process for your analysis)

      ### Example 1: information is sufficient
      \`\`\`json
        {
          "isSufficient": true,
          "nextQuestions": [],
          "reasoning": "The provided summaries fully explain how Elasticsearch handles vector search, including indexing, retrieval, and trade-offs."
        }
      \`\`\`

      ### Example 2: minor gaps or missing details
      \`\`\`json
        {
          "isSufficient": false,
          "nextQuestions": [
            "How does Elasticsearch query performance scale with large document sizes?",
            "What is the default scoring mechanism used in Elasticsearch for dense vector fields?"
          ],
          "reasoning": "While the summaries explain vector search basics, they lack detail on scaling performance and scoring behavior."
        }
      \`\`\`

      ### Example 3: complex decomposition
      \`\`\`json
        {
          "isSufficient": false,
          "nextQuestions": [
            "What is the architecture of Elasticsearch when used as a retrieval component in RAG pipelines with LLMs?",
            "How does hybrid search compare to dense retrieval in Elasticsearch in terms of accuracy and recall?",
            "What are the performance and cost trade-offs between using vector search and keyword-based search in Elasticsearch?"
          ],
          "reasoning": "The summaries cover general Elasticsearch features but miss details about RAG architectures, hybrid retrieval comparisons, and performance trade-offs."
        }
      \`\`\`
      `,
    ],
    [
      'user',
      `
      ## User question

      "${userQuery}"

      ## Backlog

      ${renderBacklog(backlog)}
    `,
    ],
  ];
};

export const getAnswerPrompt = ({
  userQuery,
  backlog,
}: {
  userQuery: string;
  backlog: BacklogItem[];
}): BaseMessageLike[] => {
  return [
    [
      'system',
      `You are a senior technical expert from the Elasticsearch company.
       Your role is to provide a clear, well-reasoned answer to the user's question using the information gathered by prior research steps.

      Instructions:
      - Carefully read the user's original question and the gathered information.
      - Synthesize an accurate response that directly answers the user's question.
      - Do not hedge. If the information is complete, provide a confident and final answer.
      - If there are still uncertainties or unresolved issues, acknowledge them clearly and state what is known and what is not.
      - Prefer structured, organized output (e.g., use paragraphs, bullet points, or sections if helpful).

      Guidelines:
      - Do not mention the research process or that you are an AI or assistant.
      - Do not mention that the answer was generated based on previous steps.
      - Do not repeat the user's question or summarize the JSON input.
      - Do not speculate beyond the gathered information unless logically inferred from it.

      Additional information:
      - The current date is ${new Date().toISOString()}.

      `,
    ],
    [
      'user',
      `
      ### User question

      "${userQuery}"

      ### Gathered information

      ${renderBacklog(backlog.filter(isActionResult))}
    `,
    ],
  ];
};

const renderBacklog = (backlog: BacklogItem[]): string => {
  const renderItem = (item: BacklogItem, i: number) => {
    if (isActionResult(item)) {
      return renderActionResult(item, i);
    }
    if (isReflectionResult(item)) {
      return renderReflectionResult(item, i);
    }
    return `Unknown item type`;
  };

  return backlog.map((item, i) => renderItem(item, i)).join('\n\n');
};

const renderReflectionResult = (
  { isSufficient, nextQuestions, reasoning }: ReflectionResult,
  index: number
): string => {
  return `### Cycle ${index + 1}

  At cycle "${index + 1}", you reflected on the data gathered so far:

  - You decided that the current information were ${
    isSufficient ? '*sufficient*' : '*insufficient*'
  } to fully answer the question, with the following reasoning: ${reasoning}

  ${
    nextQuestions.length > 0
      ? `- You identified the following questions to follow up on:
${nextQuestions.map((question) => `  - ${question}`).join('\n')}`
      : ''
  }
  `;
};

const renderActionResult = (actionResult: ActionResult, index: number): string => {
  return `### Cycle ${index + 1}

  At cycle "${index + 1}", you performed the following action:

  - Action type: tool execution

  - Tool name: ${actionResult.toolName}

  - Tool parameters:
  \`\`\`json
  ${JSON.stringify(actionResult.arguments, undefined, 2)}
  \`\`\`

  - Tool response:
    \`\`\`json
  ${JSON.stringify(actionResult.response, undefined, 2)}
  \`\`\`
  `;
};
