/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InvestigatorEvaluator, InvestigatorOutput } from '../types';

const TOOL_SEARCH_KI = 'search_knowledge_indicators';
const TOOL_EXECUTE_ESQL = 'execute_esql';

/**
 * CODE evaluator: checks that `search_knowledge_indicators` appears in
 * `toolCallRecords` before any `execute_esql` call.
 * Score 1 = correct order, 0 = order violated, null = no calls at all.
 */
export const toolUsageSequenceEvaluator: InvestigatorEvaluator = {
  name: 'tool_usage_sequence',
  kind: 'CODE',
  evaluate: ({ output }) => {
    const toolCallRecords = (output as InvestigatorOutput)?.toolUsage?.tool_call_records ?? [];

    if (toolCallRecords.length === 0) {
      return Promise.resolve({
        score: null,
        label: 'unavailable',
        explanation: 'No tool calls made — cannot assess sequence',
      });
    }

    const firstKiIndex = toolCallRecords.findIndex((r) => r.tool_id === TOOL_SEARCH_KI);
    const firstEsqlIndex = toolCallRecords.findIndex((r) => r.tool_id === TOOL_EXECUTE_ESQL);

    if (firstKiIndex === -1) {
      return Promise.resolve({
        score: 0,
        explanation: `search_knowledge_indicators was never called`,
      });
    }

    if (firstEsqlIndex === -1) {
      return Promise.resolve({
        score: 1,
        explanation: `search_knowledge_indicators called at index ${firstKiIndex}; no execute_esql calls`,
      });
    }

    if (firstKiIndex < firstEsqlIndex) {
      return Promise.resolve({
        score: 1,
        explanation: `Correct order: search_knowledge_indicators (index ${firstKiIndex}) before execute_esql (index ${firstEsqlIndex})`,
      });
    }

    return Promise.resolve({
      score: 0,
      explanation: `Order violated: execute_esql (index ${firstEsqlIndex}) appeared before search_knowledge_indicators (index ${firstKiIndex})`,
    });
  },
};
