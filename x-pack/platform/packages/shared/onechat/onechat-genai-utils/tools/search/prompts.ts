/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BaseMessageLike } from '@langchain/core/messages';
import type { SearchTarget } from './types';

import {
  naturalLanguageSearchToolName as nlTool,
  relevanceSearchToolName as relevanceTool,
} from './inner_tools';

export const getSearchPrompt = ({
  nlQuery,
  searchTarget,
}: {
  nlQuery: string;
  searchTarget: SearchTarget;
}): BaseMessageLike[] => {
  const systemPrompt = `You are an expert search dispatcher. Your sole task is to analyze a user's request and call the single most appropriate tool to answer it.
You **must** call **one** of the available tools. Do not answer the user directly or ask clarifying questions.

## Available Tools

### 1. Relevance Search Tool ('${relevanceTool}')
- **Purpose**: For full-text, relevance-based searches. Use this when the user is looking for documents based on topics, concepts, or matching unstructured text. The results are ranked by a relevance score.
- **Use Case Examples**:
  - "find information about our Q3 earnings report"
  - "search for documents mentioning 'data privacy'"
  - "what is our policy on remote work?"

### 2. Natural Language Analytic Tool ('${nlTool}')
- **Purpose**: For structured queries, aggregations, and calculations. Use this for any query that requires sorting by a specific field, filtering by exact values, counting, or creating data breakdowns.
- **Use Case Examples**:
  - "show me the last 5 documents"
  - "what is the average order value?"
  - "list all products where status is 'in_stock' and price is less than 50"
  - "how many errors were logged in the past hour?"

## Additional instructions

- The search will be performed against the \`${searchTarget.name}\` ${searchTarget.type}, so you should use that value for the \`index\` parameters of the tool you will call.`;

  const userPrompt = `Execute the following user query: "${nlQuery}"`;

  return [
    ['system', systemPrompt],
    ['user', userPrompt],
  ];
};
