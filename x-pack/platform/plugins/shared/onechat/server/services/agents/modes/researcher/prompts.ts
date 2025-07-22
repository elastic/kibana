/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BaseMessageLike } from '@langchain/core/messages';
import { customInstructionsBlock, formatDate } from '../utils/prompt_helpers';
import type { ResearchGoal } from './graph';
import {
  isSearchResult,
  isReflectionResult,
  isResearchGoalResult,
  BacklogItem,
  ReflectionResult,
  ResearchGoalResult,
  SearchResult,
} from './backlog';

export const getIdentifyResearchGoalPrompt = ({
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
      You are a thoughtful and rigorous research assistant preparing to initiate a deep research process.

      Your task is to extract the user's **research intent** based on the conversation so far. This intent will guide a costly and time-consuming investigation.
      The goal must be clear and specific — but you should not worry about *how* it will be achieved, only *what* the user wants to know.

      There are two possible outcomes:
        1. **If the user's messages clearly express a research goal**, use the \`set_research_goal\` tool with two fields:
           - \`researchGoal\`: A concise and actionable research objective.
           - \`reasoning\`: A brief explanation of how you interpreted the user’s input to reach this goal. Include what signal in their message pointed to the goal you chose. This will be surfaced to the user.

        2. **If the user's intent is vague or incomplete**, respond in plain text asking brief, high-signal questions
           aimed only at clarifying the *intent or focus of the research*. Do not ask for details about tools,
           data sources, indices, or execution — those will be handled later in the workflow.

      Constraints:
      - Only follow the possible outcomes: plain text response for clarification or calling \`set_research_goal\` to set the research goal.
      - Only use the \`set_research_goal\` tool when the user's intent is explicit.
      - Never make up a goal if the context is too vague.
      - When asking for clarification, keep your language natural, friendly, and streamable.

      ## Examples:

      ### Example A:

      User messages:

      > "I'd like to understand more about the effects of red meat consumption."

      *expected response ->* tool use:
      \`\`\`json
      {
        "tool_name": "set_research_goal",
        "parameters": {
          "researchGoal": "Investigate the health effects of red meat consumption based on current scientific evidence.",
          "reasoning": "The user asked to understand the effects of red meat consumption. I must investigate the health effects of red meat consumption. I should back my research on scientific evidences."
        }
      }

      ### Example B:

      User messages:

      > "I'm interested in tech and society, maybe something on AI."

      *expected response ->* Plain text reply:

      "Can you clarify what aspect of AI interests you most? For example, are you thinking about ethics, job displacement, regulation, or something else?"

      ${customInstructionsBlock(customInstructions)}

      Begin by reading the conversation so far. Either use the set_research_goal tool with a precise objective, or respond in plain text asking for clarification if needed.
      `,
    ],
    ...discussion,
  ];
};

export const getExecutionPrompt = ({
  customInstructions,
  currentResearchGoal,
  backlog,
}: {
  customInstructions?: string;
  currentResearchGoal: ResearchGoal;
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
      - The current date is: ${formatDate()}`,
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
  customInstructions,
  userQuery,
  backlog,
  maxFollowUpQuestions = 3,
  remainingCycles,
  cycleBoundaries = { exploration: 3, refinement: 2, finalization: 1 },
}: {
  customInstructions?: string;
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

      ### Instructions:
      - Analyze the completeness and depth of data available in your backlog history.
      - Identify any missing, unclear, or shallow information.
      - If necessary, break down complex questions into smaller sub-problems.
      - Your goal is to generate a precise list of actionable questions that will help drive the research forward.

      ### Cycle Awareness:
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

      ### Guidelines:
      - Only generate questions if the current information is incomplete or insufficient.
      - Do not generate more than ${maxFollowUpQuestions} actionable questions.
      - Focus on technical depth, implementation details, trade-offs, edge cases, or emerging trends.
      - Each question must be self-contained and ready to be used for search or further investigation.

      ${customInstructionsBlock(customInstructions)}

      ### Additional information:
      - The current date is: ${formatDate()}

      ### Output Format:
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
  customInstructions,
  userQuery,
  backlog,
}: {
  customInstructions?: string;
  userQuery: string;
  backlog: BacklogItem[];
}): BaseMessageLike[] => {
  return [
    [
      'system',
      `You are a senior technical expert from the Elasticsearch company.
       Your role is to provide a clear, well-reasoned answer to the user's question using the information gathered by prior research steps.

      ### Instructions:
      - Carefully read the user's original question and the gathered information.
      - Synthesize an accurate response that directly answers the user's question.
      - Do not hedge. If the information is complete, provide a confident and final answer.
      - If there are still uncertainties or unresolved issues, acknowledge them clearly and state what is known and what is not.
      - Prefer structured, organized output (e.g., use paragraphs, bullet points, or sections if helpful).

      ### Guidelines:
      - Do not mention the research process or that you are an AI or assistant.
      - Do not mention that the answer was generated based on previous steps.
      - Do not repeat the user's question or summarize the JSON input.
      - Do not speculate beyond the gathered information unless logically inferred from it.

      ${customInstructionsBlock(customInstructions)}

      ### Additional information:
      - The current date is: ${formatDate()}
      - You can use markdown format to structure your response`,
    ],
    [
      'user',
      `
      ### User question

      "${userQuery}"

      ### Gathered information

      ${renderBacklog(backlog.filter(isSearchResult))}
    `,
    ],
  ];
};

const renderBacklog = (backlog: BacklogItem[]): string => {
  const renderItem = (item: BacklogItem, i: number) => {
    if (isResearchGoalResult(item)) {
      return renderResearchGoalResult(item, i);
    }
    if (isSearchResult(item)) {
      return renderActionResult(item, i);
    }
    if (isReflectionResult(item)) {
      return renderReflectionResult(item, i);
    }
    return `Unknown item type`;
  };

  return backlog.map((item, i) => renderItem(item, i)).join('\n\n');
};

const renderResearchGoalResult = (
  { researchGoal, reasoning }: ResearchGoalResult,
  index: number
): string => {
  return `### Cycle ${index + 1}

  At cycle "${index + 1}", you identified the main research topic based on the current discussion:

  - You defined the research goal as: "${researchGoal}"
  - The reasoning behind this decision was: "${reasoning}"
  `;
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

const renderActionResult = (actionResult: SearchResult, index: number): string => {
  return `### Cycle ${index + 1}

  At cycle "${index + 1}", you delegated one of the sub-tasks to another agent:

  - Research goal: "${actionResult.researchGoal}"

  - The agent's response:
  \`\`\`json
  ${actionResult.output}
  \`\`\`
  `;
};
