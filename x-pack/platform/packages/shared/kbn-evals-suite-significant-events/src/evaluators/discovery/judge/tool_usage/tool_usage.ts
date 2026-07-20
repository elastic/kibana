/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformCoreTools, platformSignificantEventsTools } from '@kbn/agent-builder-common';
import type { ConverseStep } from '@kbn/evals';
import type { Discovery } from '@kbn/significant-events-schema';
import { extractToolCallIds } from '../../utils/tool_usage';
import type { DiscoveryJudgeEvaluator } from '../../types';

const { executeEsql: TOOL_ID_EXECUTE_ESQL } = platformCoreTools;
const {
  searchKnowledgeIndicators: TOOL_ID_KI_SEARCH,
  eventsWrite: TOOL_ID_EVENTS_WRITE,
  discoveryWrite: TOOL_ID_DISCOVERY_WRITE,
} = platformSignificantEventsTools;

/** Require the judge-owned event write and reject workflow-owned discovery stamping. */
const scoreOutputTool = (
  calledTools: Set<string>
): { score: number; label: string; explanation: string } | null => {
  if (!calledTools.has(TOOL_ID_EVENTS_WRITE)) {
    return {
      score: 0,
      label: 'missing-output-write',
      explanation: `${TOOL_ID_EVENTS_WRITE} was not called — required to persist the decision`,
    };
  }
  if (calledTools.has(TOOL_ID_DISCOVERY_WRITE)) {
    return {
      score: 0.5,
      label: `unnecessary-${TOOL_ID_DISCOVERY_WRITE}`,
      explanation: `${TOOL_ID_DISCOVERY_WRITE} was called, but handled stamping belongs to the triage workflow`,
    };
  }
  return null;
};

export const scoreJudgeToolUsage = ({
  discoveries,
  steps,
}: {
  discoveries: Array<Pick<Discovery, 'signals'>>;
  steps: ConverseStep[];
}): { score: number; label: string; explanation: string } => {
  // Does at least one discovery need KI search (no pre-populated queries)?
  // Per-discovery check avoids falsely routing the entire batch to "both tools required"
  // when only one of several fully-evidenced discoveries is missing queries.
  const anyDiscoveryNeedsKiSearch = discoveries.some((d) => {
    const signals = d.signals ?? [];
    return (
      signals.length === 0 ||
      signals.some(
        (s) => s.evidence == null || s.evidence.esql_query == null || s.evidence.esql_query === ''
      )
    );
  });
  const allEvidencesHaveQuery = discoveries.length > 0 && !anyDiscoveryNeedsKiSearch;

  const calledTools = new Set(extractToolCallIds(steps));
  const expected = allEvidencesHaveQuery
    ? [TOOL_ID_EXECUTE_ESQL]
    : [TOOL_ID_KI_SEARCH, TOOL_ID_EXECUTE_ESQL];
  const missing = expected.filter((toolId) => !calledTools.has(toolId));
  const trajectoryScore = (expected.length - missing.length) / expected.length;

  if (allEvidencesHaveQuery) {
    // All evidences already carry queries — judge should re-verify directly via execute_esql
    // and skip search_knowledge_indicators entirely.
    if (missing.length > 0 && calledTools.has(TOOL_ID_KI_SEARCH)) {
      return {
        score: 0,
        label: 'wrong-tools',
        explanation: `Called ${TOOL_ID_KI_SEARCH} instead of ${TOOL_ID_EXECUTE_ESQL} — all input evidences had esql_query; KI search should have been skipped`,
      };
    }
    if (missing.length > 0) {
      return {
        score: 0,
        label: `missing-${TOOL_ID_EXECUTE_ESQL}`,
        explanation: `${TOOL_ID_EXECUTE_ESQL} was not called — required for evidence re-verification before promoting`,
      };
    }
    if (calledTools.has(TOOL_ID_KI_SEARCH)) {
      return {
        score: 0.5,
        label: `unnecessary-${TOOL_ID_KI_SEARCH}`,
        explanation: `${TOOL_ID_EXECUTE_ESQL} called correctly but ${TOOL_ID_KI_SEARCH} was also called — all input evidences carried esql_query, so KI search was unnecessary`,
      };
    }
    const outputCheck = scoreOutputTool(calledTools);
    if (outputCheck) {
      return outputCheck;
    }
    return {
      score: 1,
      label: 'correct',
      explanation: `Correctly called ${TOOL_ID_EXECUTE_ESQL} and ${TOOL_ID_EVENTS_WRITE}; ${TOOL_ID_KI_SEARCH} skipped as expected when all evidences have pre-populated esql_query`,
    };
  }

  const outputCheck = scoreOutputTool(calledTools);
  if (outputCheck) {
    return outputCheck;
  }

  return {
    score: trajectoryScore,
    label: trajectoryScore === 1 ? 'correct' : 'missing-tools',
    explanation:
      trajectoryScore === 1 ? 'Correctly called all tools' : `Missing tools: ${missing.join(', ')}`,
  };
};

export const createJudgeToolUsageEvaluator = (): DiscoveryJudgeEvaluator => ({
  name: 'trajectory',
  kind: 'CODE',
  evaluate: ({ output }) => {
    // Use output.inputDiscoveries — the actual discoveries fed to the agent — rather than
    // input.discoveries (canonical ground truth). In snapshot mode the two differ.
    return Promise.resolve(
      scoreJudgeToolUsage({
        discoveries: output.inputDiscoveries ?? [],
        steps: output.steps ?? [],
      })
    );
  },
});
