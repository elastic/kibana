/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformCoreTools } from '@kbn/agent-builder-common';

const CREATE_VISUALIZATION_TOOL_ID = platformCoreTools.createVisualization;
const VISUALIZATION_RESULT_TYPE = 'visualization';

interface ConverseLikeOutput {
  steps?: Array<Record<string, unknown>>;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Extract the ES|QL strings backing every generated visualization. Returns an
 * empty array when the agent produced no renderable visualization.
 */
export function extractVisualizationEsql(output: ConverseLikeOutput): string[] {
  const steps = output?.steps ?? [];
  const queries: string[] = [];

  for (const step of steps) {
    if (
      step.type !== 'tool_call' ||
      step.tool_id !== CREATE_VISUALIZATION_TOOL_ID ||
      !Array.isArray(step.results)
    ) {
      continue;
    }

    for (const candidate of step.results) {
      if (
        !isRecord(candidate) ||
        candidate.type !== VISUALIZATION_RESULT_TYPE ||
        !isRecord(candidate.data)
      ) {
        continue;
      }

      const { esql } = candidate.data;
      if (typeof esql === 'string' && esql.trim().length > 0) {
        queries.push(esql);
      }
    }
  }

  return queries;
}

/**
 * Ordered list of tool ids invoked across the converse turn. Feeds the
 * trajectory evaluator's golden-tool-path comparison.
 */
export function getToolIds(output: ConverseLikeOutput): string[] {
  const steps = output?.steps ?? [];
  return steps
    .filter((step) => step.type === 'tool_call')
    .map((step) => (typeof step.tool_id === 'string' ? step.tool_id : ''))
    .filter(Boolean);
}
