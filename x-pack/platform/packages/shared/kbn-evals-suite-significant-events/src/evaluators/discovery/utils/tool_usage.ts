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

const getRetryableBulkErrorCount = (step: ConverseStep): number => {
  if (step.type !== 'tool_call' || !Array.isArray(step.results)) return 0;
  return step.results.reduce<number>((count, result) => {
    if (!isRecord(result) || !isRecord(result.data) || !Array.isArray(result.data.results)) {
      return count;
    }
    return (
      count +
      result.data.results.filter(
        (item) => isRecord(item) && item.written === false && item.reason === 'bulk_error'
      ).length
    );
  }, 0);
};

const getBulkInputCount = (step: ConverseStep): number =>
  step.type === 'tool_call' && isRecord(step.params) && Array.isArray(step.params.items)
    ? step.params.items.length
    : 0;

export interface PersistenceCallSummary {
  count: number;
  valid: boolean;
  retriedPartialFailure: boolean;
}

/** One normal persistence call, or one retry after a completed call exposed item-level bulk errors. */
export function summarizePersistenceCalls(
  steps: ConverseStep[],
  toolId: string
): PersistenceCallSummary {
  const calls = steps.filter((step) => step.type === 'tool_call' && step.tool_id === toolId);
  if (calls.length === 1) {
    return { count: 1, valid: true, retriedPartialFailure: false };
  }
  const failedItemCount = calls.length === 2 ? getRetryableBulkErrorCount(calls[0]) : 0;
  const retriedPartialFailure =
    failedItemCount > 0 && getBulkInputCount(calls[1]) === failedItemCount;
  return { count: calls.length, valid: retriedPartialFailure, retriedPartialFailure };
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
