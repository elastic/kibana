/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EVALUATOR_NAME } from './constants';
import type { LongMemEvalTaskOutput } from './task';

/** The subset of a kbn/evals task run these checks need. */
export interface TaskRunLike {
  metadata?: Record<string, unknown> | null;
  output: unknown;
}

/** The subset of a kbn/evals evaluation run these checks need. */
export interface EvaluationRunLike {
  name: string;
  exampleId?: string;
  result?: { score?: number | null };
}

/** The subset of a persisted score document these checks need. */
export interface PersistedScoreLike {
  example: { id: string };
  evaluator: { name: string; score?: number | null; model?: { id: string } };
}

export interface RunAssessment {
  selected: number;
  validTaskOutputs: number;
  scored: number;
  persistedScored: number;
  erroredIds: string[];
  coveragePct: number;
  problems: string[];
}

const exampleIdOf = (run: TaskRunLike): string | undefined => {
  const externalId = run.metadata?.externalId;
  return typeof externalId === 'string' ? externalId : undefined;
};

const asTaskOutput = (output: unknown): LongMemEvalTaskOutput | undefined =>
  typeof output === 'object' && output !== null && 'taskStatus' in output
    ? (output as LongMemEvalTaskOutput)
    : undefined;

const invalidReason = (output: LongMemEvalTaskOutput | undefined): string | undefined => {
  if (!output) {
    return 'missing task output';
  }
  if (output.taskStatus !== 'ok') {
    return `task error (${output.errorCode ?? 'unknown'})`;
  }
  // Not reading the POC index is a legitimate (usually wrong) answer path, so it is scored, not
  // invalidated. Reading any other index would contaminate the run, so that is invalid.
  const otherIndices = output.toolEvidence?.otherIndices ?? [];
  if (otherIndices.length > 0) {
    return `read other indices: ${otherIndices.join(', ')}`;
  }
  return undefined;
};

/**
 * Checks the POC invariants after an experiment: every selected example produced a valid,
 * judged answer, and its LongMemEval score was persisted by the expected judge. Coverage must
 * be 100%; a lower count is a blocker, never a score over survivors.
 */
export const assessRun = ({
  selectedIds,
  runs,
  evaluationRuns,
  persistedScores,
  judgeModelId,
}: {
  selectedIds: readonly string[];
  runs: readonly TaskRunLike[];
  evaluationRuns: readonly EvaluationRunLike[];
  persistedScores: readonly PersistedScoreLike[];
  judgeModelId: string | undefined;
}): RunAssessment => {
  const problems: string[] = [];
  const runsById = new Map(
    runs.flatMap((run) => {
      const id = exampleIdOf(run);
      return id ? [[id, run] as const] : [];
    })
  );

  const erroredIds: string[] = [];
  for (const id of selectedIds) {
    const reason = invalidReason(asTaskOutput(runsById.get(id)?.output));
    if (reason) {
      erroredIds.push(id);
      problems.push(`${id}: invalid task output: ${reason}`);
    }
  }
  const unexpected = [...runsById.keys()].filter((id) => !selectedIds.includes(id));
  if (unexpected.length > 0) {
    problems.push(`Unexpected example IDs in runs: ${unexpected.join(', ')}`);
  }

  const scoredIds = new Set(
    evaluationRuns
      .filter(({ name, result }) => name === EVALUATOR_NAME && typeof result?.score === 'number')
      .flatMap(({ exampleId }) => (exampleId ? [exampleId] : []))
  );
  for (const id of selectedIds) {
    if (!scoredIds.has(id)) {
      problems.push(`${id}: no non-null ${EVALUATOR_NAME} score`);
    }
  }

  const persisted = persistedScores.filter(({ evaluator }) => evaluator.name === EVALUATOR_NAME);
  const persistedScoredIds = new Set(
    persisted
      .filter(({ evaluator }) => typeof evaluator.score === 'number')
      .map(({ example }) => example.id)
  );
  for (const id of selectedIds) {
    if (!persistedScoredIds.has(id)) {
      problems.push(`${id}: ${EVALUATOR_NAME} score not found in the score store`);
    }
  }
  const foreignIds = persisted
    .map(({ example }) => example.id)
    .filter((id) => !selectedIds.includes(id));
  if (foreignIds.length > 0) {
    problems.push(
      `Persisted scores carry unexpected example IDs: ${[...new Set(foreignIds)].join(', ')}`
    );
  }
  const wrongJudge = persisted.filter(({ evaluator }) => evaluator.model?.id !== judgeModelId);
  if (wrongJudge.length > 0) {
    problems.push(
      `${wrongJudge.length} persisted score(s) not attributed to judge ${judgeModelId ?? 'unknown'}`
    );
  }

  const validTaskOutputs = selectedIds.length - erroredIds.length;
  return {
    selected: selectedIds.length,
    validTaskOutputs,
    scored: scoredIds.size,
    persistedScored: persistedScoredIds.size,
    erroredIds,
    coveragePct:
      selectedIds.length === 0 ? 0 : Math.round((validTaskOutputs / selectedIds.length) * 100),
    problems,
  };
};
