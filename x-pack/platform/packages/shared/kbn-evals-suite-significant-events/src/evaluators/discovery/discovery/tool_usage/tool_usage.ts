/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConverseStep } from '@kbn/evals';
import { platformCoreTools, platformSignificantEventsTools } from '@kbn/agent-builder-common';
import {
  extractOrderedToolCalls,
  extractToolCallIds,
  summarizePersistenceCalls,
} from '../../utils/tool_usage';
import type { DiscoveryEvaluator } from '../../types';
import type {
  ContinuationCycle,
  ContinuationEvaluator,
} from '../continuation/continuation_stability';

const { executeEsql: TOOL_ID_EXECUTE_ESQL } = platformCoreTools;
const {
  searchKnowledgeIndicators: TOOL_ID_KI_SEARCH,
  searchEvent: TOOL_ID_EVENT_SEARCH,
  eventsWrite: TOOL_ID_EVENTS_WRITE,
} = platformSignificantEventsTools;

export interface ToolUsageScore {
  score: number;
  label: string;
  explanation: string;
}

/** Require events_write and reject workflow-owned discovery stamping. */
const scoreOutputTool = (
  calledTools: Set<string>,
  steps: ConverseStep[]
): ToolUsageScore | null => {
  if (!calledTools.has(TOOL_ID_EVENTS_WRITE)) {
    return {
      score: 0,
      label: `missing-${TOOL_ID_EVENTS_WRITE}`,
      explanation: `${TOOL_ID_EVENTS_WRITE} was not called — required to persist the decision`,
    };
  }

  const persistenceCalls = summarizePersistenceCalls(steps, TOOL_ID_EVENTS_WRITE);
  if (!persistenceCalls.valid) {
    return {
      score: 0.75,
      label: `multiple-${TOOL_ID_EVENTS_WRITE}-calls`,
      explanation: `${TOOL_ID_EVENTS_WRITE} was called ${persistenceCalls.count} times without one justified partial-failure retry`,
    };
  }
  return null;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const didRuleSearchReturnNoCandidates = ({
  params,
  results,
  toolId,
}: ReturnType<typeof extractOrderedToolCalls>[number]): boolean =>
  toolId === TOOL_ID_EVENT_SEARCH &&
  Array.isArray(params.rule_uuids) &&
  params.rule_uuids.length > 0 &&
  results.some(
    (result) =>
      isRecord(result) &&
      isRecord(result.data) &&
      (result.data.total === 0 ||
        (Array.isArray(result.data.events) && result.data.events.length === 0))
  );

const writesTopology = ({ params, toolId }: ReturnType<typeof extractOrderedToolCalls>[number]) =>
  toolId === TOOL_ID_EVENTS_WRITE &&
  Array.isArray(params.items) &&
  params.items.some(
    (item) =>
      isRecord(item) &&
      ((Array.isArray(item.causal_features) && item.causal_features.length > 0) ||
        (Array.isArray(item.blast_radius) && item.blast_radius.length > 0))
  );

export const scoreToolUsage = ({
  steps,
  detectionCount,
}: {
  steps: ConverseStep[];
  detectionCount: number;
}): ToolUsageScore => {
  const calledTools = new Set(extractToolCallIds(steps));

  if (detectionCount === 0) {
    return calledTools.size === 0
      ? { score: 1, label: 'correct', explanation: 'Empty batch: no tool calls made as expected' }
      : {
          score: 0,
          label: 'unexpected-tools',
          explanation: `Empty batch: agent made ${calledTools.size} unexpected tool call(s) instead of early-exiting`,
        };
  }

  const outputCheck = scoreOutputTool(calledTools, steps);
  if (outputCheck) {
    return outputCheck;
  }

  const orderedCalls = extractOrderedToolCalls(steps);
  const hasQueryKiSearch = orderedCalls.some(
    ({ toolId, params }) =>
      toolId === TOOL_ID_KI_SEARCH && Array.isArray(params.kind) && params.kind.includes('query')
  );
  if (!hasQueryKiSearch) {
    return {
      score: 0,
      label: `missing-${TOOL_ID_KI_SEARCH}`,
      explanation: `${TOOL_ID_KI_SEARCH} was not called — required to decide whether ES|QL is available`,
    };
  }

  const hasUnfilteredEventSearch = orderedCalls.some(
    ({ toolId, params }) =>
      toolId === TOOL_ID_EVENT_SEARCH && params.exclude_unconfirmed_signals !== true
  );
  if (hasUnfilteredEventSearch) {
    return {
      score: 0,
      label: `unfiltered-${TOOL_ID_EVENT_SEARCH}`,
      explanation: `${TOOL_ID_EVENT_SEARCH} was not called with exclude_unconfirmed_signals: true — required to exclude signals whose confirmed value is false`,
    };
  }

  const ruleSearchFoundNoCandidates = orderedCalls.some(didRuleSearchReturnNoCandidates);
  const hasTopologySearch = orderedCalls.some(
    ({ params, toolId }) =>
      toolId === TOOL_ID_EVENT_SEARCH &&
      Array.isArray(params.topology_feature_ids) &&
      params.topology_feature_ids.length > 0
  );
  if (ruleSearchFoundNoCandidates && orderedCalls.some(writesTopology) && !hasTopologySearch) {
    return {
      score: 0,
      label: 'missing-topology-search',
      explanation:
        'A rule-filtered event search returned no candidates, but the agent wrote topology-bearing event data without running the required topology-filtered event search',
    };
  }

  const expected = [TOOL_ID_EVENT_SEARCH, TOOL_ID_KI_SEARCH, TOOL_ID_EXECUTE_ESQL];
  const missing = expected.filter((t) => !calledTools.has(t));
  const score = (expected.length - missing.length) / expected.length;
  // Graded score (0 / 1/3 / 2/3 / 1) keeps the per-tool signal for prompt tuning; a distinct label
  // per failure mode makes the miss attributable/aggregatable across an eval run (free-text
  // explanation is not). The label enumerates exactly which expected tools were skipped.
  const persistenceCalls = summarizePersistenceCalls(steps, TOOL_ID_EVENTS_WRITE);
  return {
    score,
    label: missing.length === 0 ? 'correct' : `missing-${missing.join('-')}`,
    explanation:
      score === 1
        ? persistenceCalls.retriedPartialFailure
          ? 'Correctly called all tools and retried only failed event items'
          : 'Correctly called all tools'
        : `Missing tools: ${missing.join(', ')}`,
  };
};

export const createDiscoveryToolUsageEvaluator = (): DiscoveryEvaluator => ({
  name: 'trajectory',
  kind: 'CODE',
  evaluate: ({ input, output }) => {
    const detections = output.inputDetections ?? input.detections ?? [];
    return Promise.resolve(
      scoreToolUsage({ steps: output.steps ?? [], detectionCount: detections.length })
    );
  },
});

export const scoreToolUsageContinuation = (cycles: ContinuationCycle[]): ToolUsageScore => {
  if (cycles.length === 0) {
    return { score: 0, label: 'no-cycles', explanation: 'No cycles to score' };
  }

  const perCycle = cycles.map((cycle): ToolUsageScore => {
    const steps = cycle.steps ?? [];
    const baseScore = scoreToolUsage({ steps, detectionCount: 1 });
    if (
      cycle.expectTopologyEventSearch &&
      !extractOrderedToolCalls(steps).some(
        ({ toolId, params }) =>
          toolId === TOOL_ID_EVENT_SEARCH &&
          Array.isArray(params.topology_feature_ids) &&
          params.topology_feature_ids.length > 0
      )
    ) {
      return {
        score: 0,
        label: 'missing-topology-search',
        explanation: `${TOOL_ID_EVENT_SEARCH} was not called with topology_feature_ids: […] — required to filter events by topology`,
      };
    }
    return baseScore;
  });

  const score = perCycle.reduce((sum, r) => sum + r.score, 0) / perCycle.length;
  return {
    score,
    label: score === 1 ? 'correct' : 'partial',
    explanation: perCycle.map((r, i) => `cycle ${i + 1}: ${r.label} (${r.score})`).join('; '),
  };
};

/** CODE evaluator: mean per-cycle tool-usage score for the continuation test. */
export const continuationTrajectoryEvaluator: ContinuationEvaluator = {
  name: 'trajectory',
  kind: 'CODE',
  evaluate: ({ output }) => Promise.resolve(scoreToolUsageContinuation(output.cycles ?? [])),
};
