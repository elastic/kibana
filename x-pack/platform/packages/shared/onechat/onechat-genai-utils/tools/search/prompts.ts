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
  attempt,
  previousAttemptSummaries,
  maxAttempts,
}: {
  nlQuery: string;
  searchTarget: SearchTarget;
  attempt?: number; // 0-based
  previousAttemptSummaries?: string[];
  maxAttempts?: number;
}): BaseMessageLike[] => {
  const attemptNumber = (attempt ?? 0) + 1; // human readable 1-based
  const remaining = maxAttempts ? Math.max(maxAttempts - attemptNumber, 0) : undefined;
  const hasHistory = (previousAttemptSummaries?.length ?? 0) > 0;

  const historySection = hasHistory
    ? `\n\nPrevious attempts (${previousAttemptSummaries!.length}):\n- ${previousAttemptSummaries!
        .map((s) => s.replace(/\n+/g, ' '))
        .join('\n- ')}\n\nIf a previous attempt produced only errors or no meaningful results, you MUST adjust your strategy: choose the alternative tool or modify the parameters (shorter / more specific term for relevance search; clearer analytical intent for natural language analytic tool).`
    : '';

  const retryGuidance = maxAttempts
    ? `\nYou are on attempt ${attemptNumber} of up to ${maxAttempts}. ${
        remaining && remaining > 0
          ? `If this attempt fails to produce a non-error result, you will still have ${remaining} more attempt$${
              remaining === 1 ? '' : 's'
            }.`
          : 'This is the final attempt, so produce the best possible tool call.'
      }`
    : '';

  const systemPrompt = `You are an expert search dispatcher. Your sole task is to analyze a user's request and call the single most appropriate tool to answer it.
You operate in a lightweight ReAct style (Think -> Tool). You MUST always:
1. Think: silently decide the best strategy (keep reasoning ultra concise)
2. Call exactly ONE tool with well-formed, non-redundant arguments

CRITICAL: Do NOT answer the user directly. Do NOT ask clarifying questions. Never fabricate results. If unsure, still pick the most plausible tool and adjust parameters.

## Available Tools (choose EXACTLY ONE per attempt)

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

## Execution Rules

- Target: use \`${searchTarget.name}\` (${searchTarget.type}) for any index-related parameter.
- Format your response so the model emits a tool call (not plain text output to user).
- Provide at most one short reasoning line BEFORE the tool call (<= 40 words). Avoid lists, markdown, or restating the query.
- Adapt: if prior attempts failed or were empty, CHANGE something (tool choice, query terms, filters, aggregation focus). Never repeat an identical call.
- Prefer relevance search for unstructured semantic / conceptual queries; prefer natural language analytic tool for structured, filter, sort, aggregate, count, or top-N style tasks.
- If this is the final allowed attempt, be decisive and broaden or strategically narrow to maximize useful signal.
- Never include raw previous attempt summaries verbatim in parameters—derive improvements from them.
- Absolutely no multiple tool calls in a single response.
${historySection}${retryGuidance}`;

  const userPrompt = `Execute the following user query: "${nlQuery}"`;

  return [
    ['system', systemPrompt],
    ['user', userPrompt],
  ];
};
