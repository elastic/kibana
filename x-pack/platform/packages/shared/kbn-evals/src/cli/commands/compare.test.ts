/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isFailError } from '@kbn/dev-cli-errors';
import { FlagsReader, getFlags } from '@kbn/dev-cli-runner';
import type { RunContext } from '@kbn/dev-cli-runner';
import type { EvaluationScoreDocument } from '@kbn/evals-common';
import { ToolingLog } from '@kbn/tooling-log';
import { compareCmd, GATE_INCONCLUSIVE_EXIT_CODE, GATE_REGRESSION_EXIT_CODE } from './compare';

const mockEvalsClient = {
  assertPluginEnabled: jest.fn(),
  assertSpacesExist: jest.fn(),
  findLatestExperimentForBuild: jest.fn(),
  findLatestBaselineExperiment: jest.fn(),
  getExperimentScores: jest.fn(),
};

jest.mock('../../utils/evals_client', () => ({
  EvalsClient: jest.fn().mockImplementation(() => mockEvalsClient),
}));
jest.mock('../../utils/evaluations_kbn_client', () => ({
  getEvaluationsKbnClient: jest.fn(() => ({})),
}));
jest.mock('@kbn/kbn-client', () => ({ KbnClient: jest.fn() }));

const TARGET = 'target-exp';
const BASELINE = 'baseline-exp';
const PAIR_COUNT = 15;

const scoreDoc = (
  experimentId: string,
  exampleIndex: number,
  score: number,
  { datasetId = 'ds-1', evaluatorName = 'correctness' } = {}
): EvaluationScoreDocument => ({
  '@timestamp': '2026-05-01T11:00:00.000Z',
  experiment_id: experimentId,
  example: {
    id: `example-${exampleIndex}`,
    index: exampleIndex,
    input: {},
    dataset: { id: datasetId, name: 'Dataset One' },
  },
  task: {
    trace_id: null,
    repetition_index: 0,
    output: {},
    model: { id: 'gpt-4', family: 'gpt', provider: 'openai' },
  },
  evaluator: {
    name: evaluatorName,
    score,
    direction: 'maximize',
    model: { id: 'gpt-4o-mini', family: 'gpt', provider: 'openai' },
  },
  metadata: { execution_id: experimentId, total_repetitions: 1 },
});

const experiment = (experimentId: string, scoreAt: (index: number) => number) =>
  Array.from({ length: PAIR_COUNT }, (_, index) => scoreDoc(experimentId, index, scoreAt(index)));

const baselineScores = experiment(BASELINE, () => 0.8);
// Every pair drops: an exact Wilcoxon p of 2 / 2^15.
const regressedScores = experiment(TARGET, (index) => 0.4 - 0.01 * index);
// Alternating small moves with magnitudes 1..15: nowhere near significant.
const unchangedScores = experiment(
  TARGET,
  (index) => 0.8 + (index % 2 === 1 ? 1 : -1) * 0.01 * (index + 1)
);

const stubScores = (target: EvaluationScoreDocument[], baseline: EvaluationScoreDocument[]) => {
  mockEvalsClient.getExperimentScores.mockImplementation(async (experimentId: string) =>
    experimentId === TARGET ? target : baseline
  );
};

type Outcome = { exitCode: 0 } | { exitCode: number | undefined; error: Error };

const runCompare = async (argv: string[]): Promise<Outcome> => {
  const flagsReader = new FlagsReader(getFlags(argv, compareCmd.flags));
  const log = new ToolingLog({ level: 'silent', writeTo: { write: () => {} } });
  try {
    await compareCmd.run({ log, flagsReader } as RunContext);
    return { exitCode: 0 };
  } catch (error) {
    if (!(error instanceof Error)) throw error;
    return { exitCode: isFailError(error) ? error.exitCode : undefined, error };
  }
};

const GATE = [TARGET, BASELINE, '--fail-on-regression'];

describe('compareCmd exit codes', () => {
  const env = { ...process.env };

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.EVAL_SPACE_IDS;
    delete process.env.EVAL_KBN_URL;
    mockEvalsClient.assertPluginEnabled.mockResolvedValue(undefined);
    mockEvalsClient.assertSpacesExist.mockResolvedValue(undefined);
    stubScores(unchangedScores, baselineScores);
  });

  afterAll(() => {
    process.env = env;
  });

  it('exits 0 when the gate checked evaluators and found no regression', async () => {
    expect(await runCompare(GATE)).toEqual({ exitCode: 0 });
  });

  it(`exits ${GATE_REGRESSION_EXIT_CODE} on a significant regression`, async () => {
    stubScores(regressedScores, baselineScores);

    const outcome = await runCompare(GATE);

    expect(outcome.exitCode).toBe(GATE_REGRESSION_EXIT_CODE);
    expect('error' in outcome && outcome.error.message).toContain('Regression gate tripped');
  });

  it('does not fail on a regression without --fail-on-regression', async () => {
    stubScores(regressedScores, baselineScores);

    expect(await runCompare([TARGET, BASELINE])).toEqual({ exitCode: 0 });
  });

  it(`exits ${GATE_INCONCLUSIVE_EXIT_CODE} when no evaluator has enough pairs`, async () => {
    stubScores(regressedScores, baselineScores);

    const outcome = await runCompare([...GATE, '--min-pairs', String(PAIR_COUNT + 1)]);

    expect(outcome.exitCode).toBe(GATE_INCONCLUSIVE_EXIT_CODE);
    expect('error' in outcome && outcome.error.message).toContain('inconclusive');
  });

  it(`exits ${GATE_INCONCLUSIVE_EXIT_CODE} when --regression-evaluators matches nothing`, async () => {
    stubScores(regressedScores, baselineScores);

    const outcome = await runCompare([...GATE, '--regression-evaluators', 'typo']);

    expect(outcome.exitCode).toBe(GATE_INCONCLUSIVE_EXIT_CODE);
    expect('error' in outcome && outcome.error.message).toContain('Available: correctness');
  });

  it('only gates the evaluators in --regression-evaluators', async () => {
    stubScores(
      [
        ...regressedScores,
        ...experiment(TARGET, () => 0.5).map((doc) => ({
          ...doc,
          evaluator: { ...doc.evaluator, name: 'groundedness' },
        })),
      ],
      [
        ...baselineScores,
        ...experiment(BASELINE, () => 0.5).map((doc) => ({
          ...doc,
          evaluator: { ...doc.evaluator, name: 'groundedness' },
        })),
      ]
    );

    const outcome = await runCompare([...GATE, '--regression-evaluators', 'groundedness,missing']);

    // groundedness has only zero differences, so no usable p-value: nothing checked.
    expect(outcome.exitCode).toBe(GATE_INCONCLUSIVE_EXIT_CODE);
  });

  describe('nothing to compare', () => {
    it.each([
      ['the target has no scores', () => stubScores([], baselineScores)],
      ['the baseline has no scores', () => stubScores(regressedScores, [])],
      [
        'no dataset overlaps',
        () =>
          stubScores(
            regressedScores.map((doc) => ({
              ...doc,
              example: { ...doc.example, dataset: { id: 'other', name: 'Other' } },
            })),
            baselineScores
          ),
      ],
      [
        'no example pairs up',
        () =>
          stubScores(
            regressedScores.map((doc) => ({
              ...doc,
              example: { ...doc.example, id: `${doc.example.id}-renamed` },
            })),
            baselineScores
          ),
      ],
    ])(`exits ${GATE_INCONCLUSIVE_EXIT_CODE} under the gate when %s`, async (_label, arrange) => {
      arrange();

      const gated = await runCompare(GATE);
      expect(gated.exitCode).toBe(GATE_INCONCLUSIVE_EXIT_CODE);
      expect('error' in gated && gated.error.message).toContain(
        'regression gate was NOT evaluated'
      );

      const ungated = await runCompare([TARGET, BASELINE]);
      expect('error' in ungated && isFailError(ungated.error)).toBe(false);
    });

    it(`exits ${GATE_INCONCLUSIVE_EXIT_CODE} when --baseline-branch finds no baseline`, async () => {
      mockEvalsClient.findLatestBaselineExperiment.mockResolvedValue(undefined);
      const argv = ['bk-1::suite::model', '--baseline-branch', 'main', '--suite', 'suite'];

      const gated = await runCompare([...argv, '--fail-on-regression']);
      expect(gated.exitCode).toBe(GATE_INCONCLUSIVE_EXIT_CODE);
      expect(mockEvalsClient.getExperimentScores).not.toHaveBeenCalled();

      expect(await runCompare(argv)).toEqual({ exitCode: 0 });
    });
  });

  describe('flag validation', () => {
    it.each([
      ['--min-pairs', '0'],
      ['--min-pairs', '10abc'],
      ['--min-pairs', '2.5'],
      ['--regression-evaluators', ','],
    ])('rejects %s %j as a usage error before contacting Kibana', async (flag, value) => {
      const outcome = await runCompare([...GATE, flag, value]);

      expect(outcome.exitCode).toBe(1);
      expect('error' in outcome && outcome.error.message).toContain(flag);
      expect(mockEvalsClient.assertPluginEnabled).not.toHaveBeenCalled();
    });

    it('accepts a padded integer for --min-pairs', async () => {
      expect(await runCompare([...GATE, '--min-pairs', ' 5 '])).toEqual({ exitCode: 0 });
    });
  });

  it('reports an unreachable evals plugin as a usage error (exit 1)', async () => {
    mockEvalsClient.assertPluginEnabled.mockRejectedValue(new Error('evals plugin is disabled'));

    const outcome = await runCompare(GATE);

    expect(outcome.exitCode).toBe(1);
    expect('error' in outcome && outcome.error.message).toContain('evals plugin is disabled');
  });
});
