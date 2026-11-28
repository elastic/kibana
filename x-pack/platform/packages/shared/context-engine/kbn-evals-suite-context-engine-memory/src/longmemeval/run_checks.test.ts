/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { assessRun } from './run_checks';
import type { LongMemEvalTaskOutput } from './task';

const okOutput = (overrides: Partial<LongMemEvalTaskOutput> = {}): LongMemEvalTaskOutput => ({
  finalResponse: 'answer',
  taskStatus: 'ok',
  toolEvidence: {
    toolCalls: [],
    toolCallCount: 1,
    dataToolCallCount: 1,
    overBudgetCount: 0,
    usedReadFile: false,
    usedEsql: true,
    readsPocIndex: true,
    otherIndices: [],
    retrievedSessionIds: [],
  },
  ...overrides,
});

const run = (id: string, output: LongMemEvalTaskOutput) => ({
  metadata: { externalId: id },
  output,
});
const scoreRun = (id: string, score: number | null) => ({
  name: 'longmemeval-answer-accuracy',
  exampleId: id,
  result: { score },
});
const persisted = (id: string, score: number | null, judge = 'judge-model') => ({
  example: { id },
  evaluator: { name: 'longmemeval-answer-accuracy', score, model: { id: judge } },
});

describe('assessRun', () => {
  it('passes when every example is valid, judged and persisted by the judge', () => {
    const assessment = assessRun({
      selectedIds: ['a', 'b'],
      runs: [run('a', okOutput()), run('b', okOutput())],
      evaluationRuns: [scoreRun('a', 1), scoreRun('b', 0)],
      persistedScores: [persisted('a', 1), persisted('b', 0)],
      judgeModelId: 'judge-model',
    });
    expect(assessment).toMatchObject({ problems: [], coveragePct: 100, validTaskOutputs: 2 });
  });

  it('reports errored examples, missing scores, wrong judges and unknown IDs', () => {
    const assessment = assessRun({
      selectedIds: ['a', 'b'],
      runs: [
        run(
          'a',
          okOutput({ finalResponse: null, taskStatus: 'error', errorCode: 'agent_call_failed' })
        ),
        run('b', okOutput()),
      ],
      evaluationRuns: [scoreRun('a', null), scoreRun('b', 1)],
      persistedScores: [persisted('b', 1, 'other-model'), persisted('zzz', 1)],
      judgeModelId: 'judge-model',
    });
    expect(assessment.coveragePct).toBe(50);
    expect(assessment.erroredIds).toEqual(['a']);
    expect(assessment.problems).toEqual([
      'a: invalid task output: task error (agent_call_failed)',
      'a: no non-null longmemeval-answer-accuracy score',
      'a: longmemeval-answer-accuracy score not found in the score store',
      'Persisted scores carry unexpected example IDs: zzz',
      '1 persisted score(s) not attributed to judge judge-model',
    ]);
  });

  it('scores answers that never read the POC index instead of invalidating them', () => {
    const output = okOutput();
    const noPocRead = okOutput({
      toolEvidence: output.toolEvidence && { ...output.toolEvidence, readsPocIndex: false },
    });
    const assessment = assessRun({
      selectedIds: ['a'],
      runs: [run('a', noPocRead)],
      evaluationRuns: [scoreRun('a', 0)],
      persistedScores: [persisted('a', 0)],
      judgeModelId: 'judge-model',
    });
    expect(assessment.problems).toEqual([]);
  });

  it('treats reads of other indices as invalid', () => {
    const output = okOutput();
    const contaminated = okOutput({
      toolEvidence: output.toolEvidence && { ...output.toolEvidence, otherIndices: ['logs-app'] },
    });
    const assessment = assessRun({
      selectedIds: ['a'],
      runs: [run('a', contaminated)],
      evaluationRuns: [scoreRun('a', 1)],
      persistedScores: [persisted('a', 1)],
      judgeModelId: 'judge-model',
    });
    expect(assessment.problems).toEqual(['a: invalid task output: read other indices: logs-app']);
  });
});
