/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformCoreTools, platformSignificantEventsTools } from '@kbn/agent-builder-common';
import type { ConverseStep } from '@kbn/evals';
import type { SignificantEvent } from '@kbn/significant-events-schema';
import { extractToolCallIds, summarizePersistenceCalls } from '../../utils/tool_usage';
import type { DiscoveryJudgeEvaluator } from '../../types';

const { executeEsql: TOOL_ID_EXECUTE_ESQL } = platformCoreTools;
const { searchEvent: TOOL_ID_EVENT_SEARCH, eventsWrite: TOOL_ID_EVENTS_WRITE } =
  platformSignificantEventsTools;

/** Require the judge-owned event write and reject workflow-owned discovery stamping. */
const scoreOutputTool = (
  calledTools: Set<string>,
  steps: ConverseStep[]
): { score: number; label: string; explanation: string } | null => {
  if (!calledTools.has(TOOL_ID_EVENTS_WRITE)) {
    return {
      score: 0,
      label: 'missing-output-write',
      explanation: `${TOOL_ID_EVENTS_WRITE} was not called — required to persist the decision`,
    };
  }
  const persistenceCalls = summarizePersistenceCalls(steps, TOOL_ID_EVENTS_WRITE);
  if (!persistenceCalls.valid) {
    return {
      score: 0.75,
      label: 'multiple-events-write-calls',
      explanation: `${TOOL_ID_EVENTS_WRITE} was called ${persistenceCalls.count} times without one justified partial-failure retry`,
    };
  }
  return null;
};

export const scoreJudgeToolUsage = ({
  discoveries,
  steps,
}: {
  discoveries: Array<Pick<SignificantEvent, 'signals'>>;
  steps: ConverseStep[];
}): { score: number; label: string; explanation: string } => {
  // The judge always fetches each discovery itself; execute_esql is only expected when at
  // least one signal carries a runnable esql_query — otherwise there is no check to run.
  const anyRunnableCheck = discoveries.some((d) =>
    (d.signals ?? []).some(
      (s) => s.evidence != null && s.evidence.esql_query != null && s.evidence.esql_query !== ''
    )
  );

  const calledTools = new Set(extractToolCallIds(steps));

  if (!calledTools.has(TOOL_ID_EVENT_SEARCH)) {
    return {
      score: 0,
      label: `missing-${TOOL_ID_EVENT_SEARCH}`,
      explanation: `${TOOL_ID_EVENT_SEARCH} was not called — required to fetch each discovery before classifying`,
    };
  }

  if (anyRunnableCheck && !calledTools.has(TOOL_ID_EXECUTE_ESQL)) {
    return {
      score: 0,
      label: `missing-${TOOL_ID_EXECUTE_ESQL}`,
      explanation: `${TOOL_ID_EXECUTE_ESQL} was not called — required for evidence re-verification before promoting`,
    };
  }

  const outputCheck = scoreOutputTool(calledTools, steps);
  if (outputCheck) {
    return outputCheck;
  }

  const calledExpected = anyRunnableCheck
    ? [TOOL_ID_EVENT_SEARCH, TOOL_ID_EXECUTE_ESQL, TOOL_ID_EVENTS_WRITE]
    : [TOOL_ID_EVENT_SEARCH, TOOL_ID_EVENTS_WRITE];
  return {
    score: 1,
    label: 'correct',
    explanation: `Correctly called ${calledExpected.join(', ')}`,
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
