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
  attemptBudget,
  attemptSummaries,
}: {
  nlQuery: string;
  searchTarget: SearchTarget;
  attemptBudget: { used: number; max: number; remaining: number };
  attemptSummaries: string[];
}): BaseMessageLike[] => {
  const budgetLine = `ATTEMPT STATUS: used ${attemptBudget.used} / ${attemptBudget.max} (remaining ${attemptBudget.remaining}).`;
  const historyBlock = attemptSummaries.length
    ? `PRIOR ATTEMPTS (most recent last):\n${attemptSummaries.join('\n')}`
    : 'PRIOR ATTEMPTS: (none yet)';

  const refinementRule = `You MUST NOT issue a tool call with exactly the same tool name AND identical argument values (after JSON normalization) as any prior attempt above unless you change at least one meaningful parameter (e.g. different tool, adjusted term/query, changed size, added/changed a filter or temporal constraint).`;

  const systemPrompt = `You are an expert iterative search strategist.
On each attempt you MUST call exactly ONE of the available tools (never both in the same attempt) and then stop to let the runtime execute it.
You operate in a loop. After each tool result you may be re-invoked with the prior conversation messages (including tool output) to decide the next step.

${budgetLine}
${historyBlock}

Rules:
1. ONLY call a tool – never answer the user directly.
2. ${refinementRule}
3. Prefer switching tool OR refining parameters when prior output produced zero usable results.
4. If you already obtained meaningful results that answer the user request, focus on the most informative single follow-up call ONLY if it can materially improve coverage; otherwise choose the most direct tool configuration to finalize.
5. On your final remaining attempt (remaining = 1) choose the highest-probability strategy (switch tool if previous tool failed, otherwise refine parameters). If remaining = 0 you would not be called again.
6. Avoid hallucinating field names; only use generic names unless prior results revealed concrete fields.
7. Keep arguments minimal and deterministic (no prose in parameters).

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

- Target: \`${searchTarget.name}\` (${searchTarget.type}). Always set the 'index' argument to this exact value.
- Natural language analytic tool for aggregations / counts / filtering / temporal logic; relevance tool for unstructured topical / keyword retrieval.
- Change something meaningful each time prior attempt produced 0 results or only errors (term broadening/narrowing, switching tool, adjusting size, introducing/relaxing a time constraint if implied).
- Never reuse an identical parameter set.
`;

  const userPrompt = `Execute the following user query: "${nlQuery}"`;

  return [
    ['system', systemPrompt],
    ['user', userPrompt],
  ];
};
