/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConverseStep } from '@kbn/evals';

/**
 * Fully-qualified Agent Builder tool ids the discovery agents call. Canonical source:
 * `@kbn/agent-builder-common` (`platformCoreTools.executeEsql`,
 * `platformStreamsSigEventsTools.searchKnowledgeIndicators`). Duplicated here as plain
 * strings so this eval suite doesn't take a dependency on the agent-builder package.
 */
export const TOOL_ID_EXECUTE_ESQL = 'platform.core.execute_esql';
export const TOOL_ID_KI_SEARCH = 'platform.streams.sig_events.ki_search';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Tool ids of every `tool_call` step, in call order. Feeds the trajectory (coverage) evaluator. */
export function extractToolCallIds(steps: ConverseStep[]): string[] {
  return steps
    .filter((step) => step.type === 'tool_call')
    .map((step) => (typeof step.tool_id === 'string' ? step.tool_id : ''))
    .filter(Boolean);
}

/** Total number of `tool_call` steps (the agent's tool-call budget usage). */
export function countToolCalls(steps: ConverseStep[]): number {
  return steps.filter((step) => step.type === 'tool_call').length;
}

/** Whether an `execute_esql` call returned at least one row (`data.values` on a results entry). */
function executeEsqlReturnedRows(results: unknown[]): boolean {
  for (const result of results) {
    if (isRecord(result) && isRecord(result.data) && Array.isArray(result.data.values)) {
      return result.data.values.length > 0;
    }
  }
  return false;
}

export interface EsqlGroundingSummary {
  /** Number of `execute_esql` tool calls. */
  calls: number;
  /** How many of those returned at least one row. */
  callsWithRows: number;
}

/**
 * Coarse grounding signal: how many `execute_esql` calls the agent ran and how many returned rows.
 * Used as a floor check ("did the agent ground its analysis in real data") — tool presence/coverage
 * is handled separately by the trajectory evaluator.
 */
export function summarizeEsqlGrounding(steps: ConverseStep[]): EsqlGroundingSummary {
  let calls = 0;
  let callsWithRows = 0;

  for (const step of steps) {
    if (step.type !== 'tool_call' || step.tool_id !== TOOL_ID_EXECUTE_ESQL) {
      continue;
    }
    calls++;
    const results = Array.isArray(step.results) ? step.results : [];
    if (executeEsqlReturnedRows(results)) {
      callsWithRows++;
    }
  }

  return { calls, callsWithRows };
}
