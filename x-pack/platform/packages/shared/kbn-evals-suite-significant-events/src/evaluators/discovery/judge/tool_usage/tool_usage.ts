/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformCoreTools, platformSignificantEventsTools } from '@kbn/agent-builder-common';
import { extractToolCallIds } from '../../utils/tool_usage';

const { executeEsql: TOOL_ID_EXECUTE_ESQL } = platformCoreTools;
const {
  searchKnowledgeIndicators: TOOL_ID_KI_SEARCH,
  eventsWrite: TOOL_ID_EVENTS_WRITE,
  discoveryWrite: TOOL_ID_DISCOVERY_WRITE,
} = platformSignificantEventsTools;
import type { DiscoveryJudgeEvaluator } from '../../types';

const OUTPUT_TOOLS = [TOOL_ID_EVENTS_WRITE, TOOL_ID_DISCOVERY_WRITE];

/** Score the output-tool pair (events_write + discovery_write) proportionally. */
const scoreOutputTools = (
  calledTools: Set<string>
): { score: number; label: string; explanation: string } | null => {
  const missing = OUTPUT_TOOLS.filter((toolId) => !calledTools.has(toolId));
  if (missing.length === 0) {
    return null; // pass through — let the trajectory score stand
  }
  if (missing.length === OUTPUT_TOOLS.length) {
    return {
      score: 0,
      label: 'missing-output-write',
      explanation:
        'Neither events_write nor discovery_write was called — both are required to persist the decision and stamp the event',
    };
  }
  return {
    score: 0.5,
    label: 'partial-output-write',
    explanation: `${missing[0]} was not called — both events_write (persist decision) and discovery_write (stamp episode) are required`,
  };
};

export const createJudgeToolUsageEvaluator = (): DiscoveryJudgeEvaluator => ({
  name: 'trajectory',
  kind: 'CODE',
  evaluate: ({ output }) => {
    // Use output.inputDiscoveries — the actual discoveries fed to the agent — rather than
    // input.discoveries (canonical ground truth). In snapshot mode the two differ: snapshot
    // discoveries may have different evidence/query coverage than the canonical dataset, so
    // allEvidencesHaveQuery must reflect what the agent actually received.
    const discoveries = output.inputDiscoveries ?? [];

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

    const calledTools = new Set(extractToolCallIds(output.steps ?? []));
    const expected = allEvidencesHaveQuery
      ? [TOOL_ID_EXECUTE_ESQL]
      : [TOOL_ID_KI_SEARCH, TOOL_ID_EXECUTE_ESQL];
    const missing = expected.filter((toolId) => !calledTools.has(toolId));
    const trajectoryScore = (expected.length - missing.length) / expected.length;

    if (allEvidencesHaveQuery) {
      // All evidences already carry queries — judge should re-verify directly via execute_esql
      // and skip search_knowledge_indicators entirely.
      if (missing.length > 0 && calledTools.has(TOOL_ID_KI_SEARCH)) {
        return Promise.resolve({
          score: 0,
          label: 'wrong-tools',
          explanation: `Called ${TOOL_ID_KI_SEARCH} instead of ${TOOL_ID_EXECUTE_ESQL} — all input evidences had esql_query; KI search should have been skipped`,
        });
      }
      if (missing.length > 0) {
        return Promise.resolve({
          score: 0,
          label: `missing-${TOOL_ID_EXECUTE_ESQL}`,
          explanation: `${TOOL_ID_EXECUTE_ESQL} was not called — required for evidence re-verification before promoting`,
        });
      }
      if (calledTools.has(TOOL_ID_KI_SEARCH)) {
        return Promise.resolve({
          score: 0.5,
          label: `unnecessary-${TOOL_ID_KI_SEARCH}`,
          explanation: `${TOOL_ID_EXECUTE_ESQL} called correctly but ${TOOL_ID_KI_SEARCH} was also called — all input evidences carried esql_query, so KI search was unnecessary`,
        });
      }
      const outputCheck = scoreOutputTools(calledTools);
      if (outputCheck) {
        return Promise.resolve(outputCheck);
      }
      return Promise.resolve({
        score: 1,
        label: 'correct',
        explanation: `Correctly called ${TOOL_ID_EXECUTE_ESQL} only — ${TOOL_ID_KI_SEARCH} skipped as expected when all evidences have pre-populated esql_query`,
      });
    }

    const outputCheck = scoreOutputTools(calledTools);
    if (outputCheck) {
      return Promise.resolve(outputCheck);
    }

    return Promise.resolve({
      score: trajectoryScore,
      label: trajectoryScore === 1 ? 'correct' : 'missing-tools',
      explanation:
        trajectoryScore === 1
          ? 'Correctly called all tools'
          : `Missing tools: ${missing.join(', ')}`,
    });
  },
});
