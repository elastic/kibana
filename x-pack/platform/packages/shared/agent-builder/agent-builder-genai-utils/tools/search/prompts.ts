/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BaseMessageLike } from '@langchain/core/messages';
import type { SearchTarget } from './types';
import { cleanPrompt } from '../../prompts';

import {
  naturalLanguageSearchToolName as nlTool,
  relevanceSearchToolName as relevanceTool,
} from './inner_tools';

export const getSearchPrompt = ({
  nlQuery,
  searchTarget,
  customInstructions,
}: {
  nlQuery: string;
  searchTarget: SearchTarget;
  customInstructions?: string;
}): BaseMessageLike[] => {
  const systemPrompt =
    cleanPrompt(`You are a search dispatcher. Your ONLY task is to call the appropriate search tool with the correct parameters.

## CRITICAL INSTRUCTIONS

- You MUST call exactly ONE tool. Do NOT respond with text.
- Do NOT ask clarifying questions. Make your best judgment.

## Search Target

- Name: \`${searchTarget.name}\`
- Type: ${searchTarget.type}
- Use this value for the \`index\` parameter in your tool call.

## Available Tools

### 1. Relevance Search Tool ('${relevanceTool}')
- **Purpose**: For full-text, relevance-based searches. Use this when the user is looking for documents based on topics, concepts, or matching unstructured text. The results are ranked by a relevance score.
- **Schema**: { index: string, term: string }
- **Use Case Examples**:
  - "find information about our Q3 earnings report"
  - "search for documents mentioning 'data privacy'"
  - "what is our policy on remote work?"

### 2. Natural Language Analytic Tool ('${nlTool}')
- **Purpose**: For structured queries, aggregations, and calculations. Use this for any query that requires sorting by a specific field, filtering by exact values, counting, or creating data breakdowns.
- **Schema**: { index: string, query: string }
- **Use Case Examples**:
  - "show me the last 5 documents"
  - "what is the average order value?"
  - "list all products where status is 'in_stock' and price is less than 50"
  - "how many errors were logged in the past hour?"

${customInstructions ? `## Additional Instructions\n\n${customInstructions}\n` : ''}
`);

  const userPrompt = `Execute the following user query: "${nlQuery}"

Call exactly ONE tool now with index="${searchTarget.name}".`;

  return [
    ['system', systemPrompt],
    ['user', userPrompt],
  ];
};
