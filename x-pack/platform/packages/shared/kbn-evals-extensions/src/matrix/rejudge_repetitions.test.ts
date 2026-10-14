/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvaluationScoreDocument } from '@kbn/evals-common';
import { fetchScoreDocs, selectRepetitionDocs } from './fetch_score_docs';
import { planReplay } from './replay_plan';
import { runRejudge, type CellJudge } from './run_rejudge';

const refs = (id: string) => (id === 'ex-1' ? 'reference' : undefined);

const scoreDoc = (repetition: number | undefined, evaluator = 'Factuality') =>
  ({
    '@timestamp': '2026-10-01T00:00:00.000Z',
    example: { id: 'ex-1', input: { question: 'q?' }, output: {} },
    task: {
      ...(repetition === undefined ? {} : { repetition_index: repetition }),
      model: { id: 'model-x' },
      output: { messages: [{ message: { content: `answer from rep ${repetition}` } }] },
    },
    evaluator: { name: evaluator, kind: 'llm' },
    metadata: { execution_id: 'exec-1', total_repetitions: 2 },
  } as unknown as EvaluationScoreDocument);

describe('planReplay with multi-repetition executions', () => {
  it('plans one cell per repetition, each carrying its own trajectory', () => {
    // Two repetitions x two evaluators = four documents, two trajectories.
    const plan = planReplay(
      [scoreDoc(0), scoreDoc(0, 'Groundedness'), scoreDoc(1), scoreDoc(1, 'Groundedness')],
      refs
    );

    expect(plan.skipped).toEqual([]);
    expect(plan.cells.map((c) => [c.repetitionIndex, c.agentResponse])).toEqual([
      [0, 'answer from rep 0'],
      [1, 'answer from rep 1'],
    ]);
  });

  it('fails loudly when a document has no repetition index instead of collapsing', () => {
    expect(() => planReplay([scoreDoc(0), scoreDoc(undefined)], refs)).toThrow(
      /task\.repetition_index/
    );
  });
});

describe('runRejudge with multi-repetition executions', () => {
  it('judges every repetition and records distinct per-rep outputs', async () => {
    const plan = planReplay([scoreDoc(0), scoreDoc(1)], refs);
    const judge: CellJudge = async (cell) => ({
      scores: [{ name: 'Factuality', score: cell.repetitionIndex }],
      analyses: { response: cell.agentResponse },
    });

    const { results, failures } = await runRejudge({
      cells: plan.cells,
      judge,
      judgeTag: 'j',
    });

    expect(failures).toEqual([]);
    expect(results).toHaveLength(2);
    expect(results.map((r) => r.repetitionIndex)).toEqual([0, 1]);
    expect(results.map((r) => r.analyses?.response)).toEqual([
      'answer from rep 0',
      'answer from rep 1',
    ]);
  });
});

describe('selectRepetitionDocs', () => {
  it('keeps one document per repetition, preferring the payload-bearing one', () => {
    const empty = { task: { repetition_index: 1, output: {} } };
    const full = scoreDoc(1) as never;
    const picked = selectRepetitionDocs([scoreDoc(0) as never, empty, full]);

    expect(picked).toHaveLength(2);
    expect(picked[1]).toBe(full);
  });

  it('refuses a member without a repetition index', () => {
    expect(() => selectRepetitionDocs([scoreDoc(undefined) as never])).toThrow(
      /refusing to merge repetitions/
    );
  });
});

describe('fetchScoreDocs with multi-repetition executions', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  const respond = (members: unknown[], total = members.length) => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        hits: {
          hits: [
            {
              _source: members[0],
              inner_hits: {
                members: {
                  hits: { total: { value: total }, hits: members.map((_source) => ({ _source })) },
                },
              },
            },
          ],
        },
      }),
    }) as unknown as typeof global.fetch;
  };

  it('returns every repetition of a collapsed execution', async () => {
    respond([scoreDoc(0), scoreDoc(0, 'Groundedness'), scoreDoc(1), scoreDoc(1, 'Groundedness')]);

    const docs = await fetchScoreDocs({
      esUrl: 'https://es.example.com',
      apiKey: 'k',
      exampleIds: ['ex-1'],
      executionIds: ['exec-1'],
    });

    expect(docs.map((d) => d.task?.repetition_index)).toEqual([0, 1]);
  });

  it('errors when the member window truncates the group', async () => {
    respond([scoreDoc(0), scoreDoc(1)], 500);

    await expect(
      fetchScoreDocs({
        esUrl: 'https://es.example.com',
        apiKey: 'k',
        exampleIds: ['ex-1'],
        executionIds: ['exec-1'],
      })
    ).rejects.toThrow(/silently dropped/);
  });
});
