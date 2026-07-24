/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConverseStep } from '@kbn/evals';
import { platformCoreTools, platformSignificantEventsTools } from '@kbn/agent-builder-common';
import { extractToolCallIds, summarizePersistenceCalls } from '../../utils/tool_usage';
import type { DiscoveryEvaluator } from '../../types';
import type {
  ContinuationCycle,
  ContinuationEvaluator,
} from '../continuation/continuation_stability';

const { executeEsql: TOOL_ID_EXECUTE_ESQL } = platformCoreTools;
const {
  searchKnowledgeIndicators: TOOL_ID_KI_SEARCH,
  searchEvent: TOOL_ID_EVENT_SEARCH,
  discoveryWrite: TOOL_ID_DISCOVERY_WRITE,
} = platformSignificantEventsTools;

export interface ToolUsageScore {
  score: number;
  label: string;
  explanation: string;
}

export function scoreToolUsage(steps: ConverseStep[], detectionsCount: number): ToolUsageScore {
  const calledTools = new Set(extractToolCallIds(steps));

  // Empty batch — agent should return immediately with no tool calls.
  if (detectionsCount === 0) {
    const unexpectedCalls = calledTools.size;
    return {
      score: unexpectedCalls === 0 ? 1 : 0,
      label: unexpectedCalls === 0 ? 'correct' : 'unexpected-tools',
      explanation:
        unexpectedCalls === 0
          ? 'Empty batch: no tool calls made as expected'
          : `Empty batch: agent made ${unexpectedCalls} unexpected tool call(s) instead of early-exiting`,
    };
  }

  const expected = [TOOL_ID_EVENT_SEARCH, TOOL_ID_KI_SEARCH, TOOL_ID_EXECUTE_ESQL];
  const missing = expected.filter((t) => !calledTools.has(t));
  const trajectoryScore = (expected.length - missing.length) / expected.length;

  if (!calledTools.has(TOOL_ID_DISCOVERY_WRITE)) {
    return {
      score: 0,
      label: `missing-${TOOL_ID_DISCOVERY_WRITE}`,
      explanation: `${TOOL_ID_DISCOVERY_WRITE} was not called — required to emit at least one discovery`,
    };
  }

  const persistenceCalls = summarizePersistenceCalls(steps, TOOL_ID_DISCOVERY_WRITE);
  if (!persistenceCalls.valid) {
    return {
      score: 0.75,
      label: 'multiple-discovery-write-calls',
      explanation: `${TOOL_ID_DISCOVERY_WRITE} was called ${persistenceCalls.count} times without one justified partial-failure retry`,
    };
  }

  // Graded score (0 / 1/3 / 2/3 / 1) keeps the per-tool signal for prompt tuning; a distinct label
  // per failure mode makes the miss attributable/aggregatable across an eval run (free-text
  // explanation is not). The label enumerates exactly which expected tools were skipped.
  const label = missing.length === 0 ? 'correct' : `missing-${missing.join('-')}`;

  return {
    score: trajectoryScore,
    label,
    explanation:
      trajectoryScore === 1
        ? persistenceCalls.retriedPartialFailure
          ? 'Correctly called all tools and retried only failed discovery items'
          : 'Correctly called all tools'
        : `Missing tools: ${missing.join(', ')}`,
  };
}

export const createDiscoveryToolUsageEvaluator = (): DiscoveryEvaluator => ({
  name: 'trajectory',
  kind: 'CODE',
  evaluate: ({ input, output }) => {
    const detections = output.inputDetections ?? input.detections ?? [];
    return Promise.resolve(scoreToolUsage(output.steps ?? [], detections.length));
  },
});

export function scoreToolUsageContinuation(cycles: ContinuationCycle[]): ToolUsageScore {
  if (cycles.length === 0) {
    return { score: 0, label: 'no-cycles', explanation: 'No cycles to score' };
  }

  const perCycle = cycles.map((cycle) => scoreToolUsage(cycle.steps ?? [], 1));
  const score = perCycle.reduce((sum, result) => sum + result.score, 0) / perCycle.length;
  const explanation = perCycle
    .map((result, index) => `cycle ${index + 1}: ${result.label} (${result.score})`)
    .join('; ');

  return { score, label: score === 1 ? 'correct' : 'partial', explanation };
}

/** CODE evaluator: mean per-cycle tool-usage score for the continuation test, reusing `scoreToolUsage`. */
export const continuationTrajectoryEvaluator: ContinuationEvaluator = {
  name: 'trajectory',
  kind: 'CODE',
  evaluate: ({ output }) => Promise.resolve(scoreToolUsageContinuation(output.cycles ?? [])),
};
