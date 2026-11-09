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
  { datasetId = 'ds-1', evaluatorName = 'correctness', repetition = 0, totalRepetitions = 1 } = {}
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
    repetition_index: repetition,
    output: {},
    model: { id: 'gpt-4', family: 'gpt', provider: 'openai' },
  },
  evaluator: {
    name: evaluatorName,
    score,
    direction: 'maximize',
    model: { id: 'gpt-4o-mini', family: 'gpt', provider: 'openai' },
  },
  metadata: { execution_id: experimentId, total_repetitions: totalRepetitions },
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
  const flags = getFlags(argv, compareCmd.flags);
  const flagsReader = new FlagsReader(flags);
  const log = new ToolingLog({ level: 'silent', writeTo: { write: () => {} } });
  try {
    await compareCmd.run({ log, flags, flagsReader } as RunContext);
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

  it('judges the gate on raw p-values with --no-multiplicity-correction', async () => {
    // Six drops: exact Wilcoxon p = 2 / 2^6 ~ 0.031, which Holm doubles past 0.05 next to a
    // second, unchanged evaluator. 2 / 2^6 is also the floor at six pairs, so under Holm neither
    // row could reach significance: inconclusive, not passed.
    const sixPairs = (
      experimentId: string,
      evaluatorName: string,
      scoreAt: (i: number) => number
    ) =>
      Array.from({ length: 6 }, (_, index) =>
        scoreDoc(experimentId, index, scoreAt(index), { evaluatorName })
      );
    stubScores(
      [
        ...sixPairs(TARGET, 'correctness', (index) => 0.4 - 0.01 * index),
        ...sixPairs(
          TARGET,
          'groundedness',
          (index) => 0.8 + (index % 2 ? 1 : -1) * 0.01 * (index + 1)
        ),
      ],
      [
        ...sixPairs(BASELINE, 'correctness', () => 0.8),
        ...sixPairs(BASELINE, 'groundedness', () => 0.8),
      ]
    );
    const argv = [...GATE, '--min-pairs', '5'];

    const corrected = await runCompare(argv);
    expect(corrected.exitCode).toBe(GATE_INCONCLUSIVE_EXIT_CODE);
    expect('error' in corrected && corrected.error.message).toContain('underpowered (n=6');
    expect((await runCompare([...argv, '--no-multiplicity-correction'])).exitCode).toBe(
      GATE_REGRESSION_EXIT_CODE
    );
  });

  it('counts examples, not repetitions, towards --min-pairs', async () => {
    // 5 examples x 3 repetitions: 15 docs per side, but only 5 independent pairs.
    const repeated = (experimentId: string, scoreAt: (example: number) => number) =>
      [0, 1, 2, 3, 4].flatMap((example) =>
        [0, 1, 2].map((repetition) =>
          scoreDoc(experimentId, example, scoreAt(example), { repetition, totalRepetitions: 3 })
        )
      );
    stubScores(
      repeated(TARGET, (example) => 0.4 - 0.01 * example),
      repeated(BASELINE, () => 0.8)
    );

    const outcome = await runCompare([...GATE, '--min-pairs', '10']);

    expect(outcome.exitCode).toBe(GATE_INCONCLUSIVE_EXIT_CODE);
    expect('error' in outcome && outcome.error.message).toContain('inconclusive');
  });

  it('does not read 3 repetitions against 1 as a regression when the shared repetition is unchanged', async () => {
    // Repetition 0 matches the baseline everywhere; only the extra target repetitions fail. The
    // target means drop on every example, but the baseline never ran those repetitions.
    const target = Array.from({ length: PAIR_COUNT }, (_, example) =>
      [1, 0, 0].map((score, repetition) =>
        scoreDoc(TARGET, example, score, { repetition, totalRepetitions: 3 })
      )
    ).flat();
    stubScores(
      target,
      experiment(BASELINE, () => 1)
    );

    const outcome = await runCompare(GATE);

    // Averaging all 3 target repetitions would give 1/3 against 1 on every example and trip.
    expect(outcome).toEqual({ exitCode: 0 });
  });

  it('ranks averaged repetitions with exact ties, as the pass counts they came from', async () => {
    // Pass counts out of 3 repetitions per example. Averaged into thirds, roundoff splits tied
    // differences and Wilcoxon gives p ~ 0.031; the counts themselves give p ~ 0.055.
    const passCounts = (experimentId: string, digits: string) =>
      [...digits].flatMap((count, example) =>
        [0, 1, 2].map((repetition) =>
          scoreDoc(experimentId, example, repetition < Number(count) ? 1 : 0, {
            repetition,
            totalRepetitions: 3,
          })
        )
      );
    stubScores(passCounts(TARGET, '012102111210221'), passCounts(BASELINE, '112231133313310'));

    expect(await runCompare(GATE)).toEqual({ exitCode: 0 });
  });

  it('keeps pairing per repetition without --fail-on-regression', async () => {
    const repeated = (experimentId: string, score: number) =>
      [0, 1, 2].flatMap((example) =>
        [0, 1, 2].map((repetition) =>
          scoreDoc(experimentId, example, score, { repetition, totalRepetitions: 3 })
        )
      );
    stubScores(repeated(TARGET, 0.4), repeated(BASELINE, 0.8));
    const write = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
    try {
      await runCompare([TARGET, BASELINE, '--format', 'markdown']);
      const markdown = write.mock.calls.map(([chunk]) => String(chunk)).join('');
      // 3 examples x 3 repetitions, as the evals UI and compare route pair them.
      expect(markdown).toMatch(/\| correctness \| 9 \|/);
    } finally {
      write.mockRestore();
    }
  });

  describe('multiplicity correction default', () => {
    const markdownFor = async (argv: string[]) => {
      stubScores(regressedScores, baselineScores);
      const write = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
      try {
        const outcome = await runCompare([...argv, '--format', 'markdown']);
        return { outcome, markdown: write.mock.calls.map(([chunk]) => String(chunk)).join('') };
      } finally {
        write.mockRestore();
      }
    };

    it.each([
      ['off without the gate, matching the evals UI', [TARGET, BASELINE], false],
      ['on when asked for without the gate', [TARGET, BASELINE, '--multiplicity-correction'], true],
      ['on by default under the gate', GATE, true],
      [
        'off under the gate with --no-multiplicity-correction',
        [...GATE, '--no-multiplicity-correction'],
        false,
      ],
    ])('is %s', async (_label, argv, adjusted) => {
      const { markdown } = await markdownFor(argv);
      expect(markdown.includes('Adj. p-value')).toBe(adjusted);
    });
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
      ['--min-pairs', '99999999999999999999'],
      ['--min-pairs', '2.5'],
      ['--regression-evaluators', ','],
    ])('rejects %s %j as a usage error before contacting Kibana', async (flag, value) => {
      const outcome = await runCompare([...GATE, flag, value]);

      expect(outcome.exitCode).toBe(1);
      expect('error' in outcome && outcome.error.message).toContain(flag);
      expect(mockEvalsClient.assertPluginEnabled).not.toHaveBeenCalled();
    });

    it.each([
      ['--min-pairs', '5'],
      ['--regression-evaluators', 'correctness'],
    ])('rejects %s without --fail-on-regression', async (flag, value) => {
      const outcome = await runCompare([TARGET, BASELINE, flag, value]);

      expect(outcome.exitCode).toBe(1);
      expect('error' in outcome && outcome.error.message).toContain('--fail-on-regression');
      expect(mockEvalsClient.assertPluginEnabled).not.toHaveBeenCalled();
    });

    it('accepts a padded integer for --min-pairs', async () => {
      expect(await runCompare([...GATE, '--min-pairs', ' 5 '])).toEqual({ exitCode: 0 });
    });
  });

  describe('direction and neutral rows', () => {
    const asEvaluator = (
      docs: EvaluationScoreDocument[],
      name: string,
      direction: EvaluationScoreDocument['evaluator']['direction'] = 'maximize'
    ) => docs.map((doc) => ({ ...doc, evaluator: { ...doc.evaluator, name, direction } }));

    it(`exits ${GATE_INCONCLUSIVE_EXIT_CODE} when every significant row is a direction conflict`, async () => {
      // 20 pairs up by 0.03, 3 pairs collapse from 1 to 0: the mean drops, the ranks say better.
      const pair = (experimentId: string, index: number, score: number) =>
        scoreDoc(experimentId, index, score);
      const target = [
        ...Array.from({ length: 20 }, (_, i) => pair(TARGET, i, 0.53)),
        ...Array.from({ length: 3 }, (_, i) => pair(TARGET, 20 + i, 0)),
      ];
      const baseline = [
        ...Array.from({ length: 20 }, (_, i) => pair(BASELINE, i, 0.5)),
        ...Array.from({ length: 3 }, (_, i) => pair(BASELINE, 20 + i, 1)),
      ];
      stubScores(target, baseline);

      const outcome = await runCompare(GATE);

      expect(outcome.exitCode).toBe(GATE_INCONCLUSIVE_EXIT_CODE);
      expect('error' in outcome && outcome.error.message).toContain('the rank test and the mean');
    });

    it(`exits ${GATE_INCONCLUSIVE_EXIT_CODE} with a note when only neutral evaluators are in scope`, async () => {
      stubScores(
        asEvaluator(regressedScores, 'length', 'neutral'),
        asEvaluator(baselineScores, 'length', 'neutral')
      );

      const outcome = await runCompare(GATE);

      expect(outcome.exitCode).toBe(GATE_INCONCLUSIVE_EXIT_CODE);
      expect('error' in outcome && outcome.error.message).toContain(
        '1 neutral evaluator comparison(s) in scope were skipped'
      );
    });
  });

  describe('markdown report under the gate', () => {
    const captureMarkdown = async (argv: string[]) => {
      const write = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
      try {
        const outcome = await runCompare([...argv, '--format', 'markdown']);
        return { outcome, markdown: write.mock.calls.map(([chunk]) => String(chunk)).join('') };
      } finally {
        write.mockRestore();
      }
    };

    it('marks a regression the gate cannot trip on as not gated', async () => {
      stubScores(regressedScores, baselineScores);

      const gated = await captureMarkdown([...GATE, '--min-pairs', String(PAIR_COUNT + 1)]);
      expect(gated.outcome.exitCode).toBe(GATE_INCONCLUSIVE_EXIT_CODE);
      expect(gated.markdown).toContain('| Regression (not gated) |');

      const ungated = await captureMarkdown([TARGET, BASELINE]);
      expect(ungated.markdown).toContain('| Regression |');
      expect(ungated.markdown).not.toContain('(not gated)');
    });
  });

  describe('failed reads', () => {
    it('asks the client to throw instead of returning an empty result', async () => {
      await runCompare(GATE);

      expect(mockEvalsClient.getExperimentScores).toHaveBeenCalledTimes(2);
      for (const call of mockEvalsClient.getExperimentScores.mock.calls) {
        expect(call[2]).toEqual({ throwOnError: true });
      }
    });

    it('exits 1, not inconclusive, when the scores cannot be fetched', async () => {
      mockEvalsClient.getExperimentScores.mockRejectedValue(
        new Error('Failed to retrieve scores for experiment ID target-exp: 503')
      );

      const outcome = await runCompare(GATE);

      expect(outcome.exitCode).toBeUndefined();
      expect('error' in outcome && isFailError(outcome.error)).toBe(false);
      expect('error' in outcome && outcome.error.message).toContain('503');
    });

    it('exits 1, not inconclusive, when the --baseline-branch lookup fails', async () => {
      mockEvalsClient.findLatestBaselineExperiment.mockRejectedValueOnce(
        new Error('Failed to find baseline experiment for suite suite on branch main: 502')
      );

      const outcome = await runCompare([
        'bk-1::suite::model',
        '--baseline-branch',
        'main',
        '--suite',
        'suite',
        '--fail-on-regression',
      ]);

      expect('error' in outcome && isFailError(outcome.error)).toBe(false);
      expect('error' in outcome && outcome.error.message).toContain('502');
      expect(mockEvalsClient.findLatestBaselineExperiment).toHaveBeenCalledWith(
        expect.objectContaining({ throwOnError: true })
      );
      expect(mockEvalsClient.getExperimentScores).not.toHaveBeenCalled();
    });

    it.each([
      ['--baseline-branch', ['bk-1', '--baseline-branch', 'main', '--suite', 'suite']],
      ['--suite', ['bk-1', 'bk-2', '--suite', 'suite']],
    ])('exits 1 when resolving a build ID under %s fails', async (_label, argv) => {
      mockEvalsClient.findLatestExperimentForBuild.mockRejectedValueOnce(
        new Error('Failed to find experiment for build bk-1 on branch undefined: 500')
      );

      const outcome = await runCompare([...argv, '--fail-on-regression']);

      expect('error' in outcome && isFailError(outcome.error)).toBe(false);
      expect('error' in outcome && outcome.error.message).toContain('500');
      expect(mockEvalsClient.getExperimentScores).not.toHaveBeenCalled();
    });

    const resolveBuildIds = () =>
      mockEvalsClient.findLatestExperimentForBuild.mockImplementation(
        async ({ baseExecutionId }: { baseExecutionId: string }) => ({
          executionId: baseExecutionId === 'bk-1' ? TARGET : BASELINE,
          timestamp: '2026-05-01T11:00:00.000Z',
          gitCommitSha: null,
          gitBranch: null,
        })
      );

    const runMarkdown = async (argv: string[]) => {
      const write = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
      try {
        const outcome = await runCompare([...argv, '--format', 'markdown']);
        return { outcome, markdown: write.mock.calls.map(([chunk]) => String(chunk)).join('') };
      } finally {
        write.mockRestore();
      }
    };

    it('resolves build IDs strictly under the gate, but not the report-only baseline lookup', async () => {
      resolveBuildIds();

      await runMarkdown(['bk-1', 'bk-2', '--suite', 'suite', '--fail-on-regression']);

      const calls = mockEvalsClient.findLatestExperimentForBuild.mock.calls.map(([args]) => args);
      expect(calls).toHaveLength(3);
      const [target, baseline, reportOnly] = calls;
      expect(target).toEqual(expect.objectContaining({ throwOnError: true }));
      expect(baseline).toEqual(expect.objectContaining({ throwOnError: true }));
      expect(reportOnly.throwOnError).toBeUndefined();
    });

    it('still writes the markdown report when the report-only baseline lookup finds nothing', async () => {
      // The real client logs a failed lookup and returns undefined when throwOnError is off.
      mockEvalsClient.findLatestExperimentForBuild
        .mockImplementationOnce(async () => ({ executionId: TARGET }))
        .mockImplementationOnce(async () => ({ executionId: BASELINE }))
        .mockImplementationOnce(async () => undefined);

      const { outcome, markdown } = await runMarkdown([
        'bk-1',
        'bk-2',
        '--suite',
        'suite',
        '--fail-on-regression',
      ]);

      expect(outcome).toEqual({ exitCode: 0 });
      expect(markdown).toContain(TARGET);
    });

    it('keeps the lenient reads without --fail-on-regression', async () => {
      resolveBuildIds();

      expect(await runCompare(['bk-1', 'bk-2', '--suite', 'suite'])).toEqual({ exitCode: 0 });

      for (const [args] of mockEvalsClient.findLatestExperimentForBuild.mock.calls) {
        expect(args.throwOnError).toBeFalsy();
      }
      for (const call of mockEvalsClient.getExperimentScores.mock.calls) {
        expect(call[2]).toEqual({ throwOnError: false });
      }
    });
  });

  it('reports an unreachable evals plugin as a usage error (exit 1)', async () => {
    mockEvalsClient.assertPluginEnabled.mockRejectedValue(new Error('evals plugin is disabled'));

    const outcome = await runCompare(GATE);

    expect(outcome.exitCode).toBe(1);
    expect('error' in outcome && outcome.error.message).toContain('evals plugin is disabled');
  });
});
