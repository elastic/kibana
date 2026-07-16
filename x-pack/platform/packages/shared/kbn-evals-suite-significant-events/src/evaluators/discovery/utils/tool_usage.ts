/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConverseStep } from '@kbn/evals';
import { platformCoreTools, platformSignificantEventsTools } from '@kbn/agent-builder-common';

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
export function getToolCallCount(steps: ConverseStep[]): number {
  return steps.filter((step) => step.type === 'tool_call').length;
}

/**
 * Number of continuation candidates the (last) `platform_sig_events_event_search` call in
 * `steps` returned, or `null` if the tool was never called. Reads `data.total` when present
 * (the tool's declared response shape), falling back to `data.events.length`.
 */
export function extractEventSearchCandidateCount(steps: ConverseStep[]): number | null {
  let candidateCount: number | null = null;
  for (const step of steps) {
    if (step.type !== 'tool_call' || step.tool_id !== platformSignificantEventsTools.searchEvent) {
      continue;
    }
    const results = Array.isArray(step.results) ? step.results : [];
    for (const result of results) {
      if (!isRecord(result) || !isRecord(result.data)) continue;
      if (typeof result.data.total === 'number') {
        candidateCount = result.data.total;
      } else if (Array.isArray(result.data.events)) {
        candidateCount = result.data.events.length;
      }
    }
  }
  return candidateCount;
}

/** Whether an `execute_esql` call returned at least one row (`data.values` on a results entry). */
function didExecuteEsqlToolReturnRows(results: unknown[]): boolean {
  for (const result of results) {
    if (isRecord(result) && isRecord(result.data) && Array.isArray(result.data.values)) {
      return result.data.values.length > 0;
    }
  }
  return false;
}

export interface EsqlGroundingSummary {
  /** Number of `execute_esql` tool calls. */
  noOfToolCalls: number;
  /** How many of those returned at least one row. */
  noOfToolCallsWithResults: number;
}

/** `execute_esql` call count and how many returned rows. */
export function summarizeEsqlGrounding(steps: ConverseStep[]): EsqlGroundingSummary {
  let noOfToolCalls = 0;
  let noOfToolCallsWithResults = 0;

  for (const step of steps) {
    if (step.type !== 'tool_call' || step.tool_id !== platformCoreTools.executeEsql) {
      continue;
    }
    noOfToolCalls++;
    const results = Array.isArray(step.results) ? step.results : [];
    if (didExecuteEsqlToolReturnRows(results)) {
      noOfToolCallsWithResults++;
    }
  }

  return { noOfToolCalls, noOfToolCallsWithResults };
}
