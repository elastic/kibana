/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildMatrix } from './build_matrix';
import { parseMatrixConfig, type MatrixConfig } from './load_matrix_config';
import type { AggregatedModelScores } from './query_matrix_scores';

const config: MatrixConfig = parseMatrixConfig({
  columns: [
    { id: 'triage', label: 'Triage', suites: ['suite-a'], weight: 1 },
    { id: 'detect', label: 'Detect', suites: ['suite-b'], weight: 2 },
  ],
  models: [
    { id: 'model-good', label: 'Good Model' },
    { id: 'model-oss', label: 'OSS Model', openSource: true },
    { id: 'model-missing', label: 'Absent Model' },
  ],
});

const evaluator = (mean: number, count = 10) => ({ evaluatorName: 'correctness', mean, count });

const aggregated: AggregatedModelScores[] = [
  {
    modelId: 'model-good',
    provider: 'anthropic',
    suites: [
      {
        suiteId: 'suite-a',
        experimentId: 'run-1',
        datasets: [{ datasetId: 'd1', datasetName: 'D1', evaluators: [evaluator(0.9)] }],
      },
      {
        suiteId: 'suite-b',
        experimentId: 'run-2',
        datasets: [{ datasetId: 'd2', datasetName: 'D2', evaluators: [evaluator(0.8)] }],
      },
    ],
  },
  {
    modelId: 'model-oss',
    provider: 'meta',
    suites: [
      {
        suiteId: 'suite-a',
        experimentId: 'run-3',
        datasets: [{ datasetId: 'd1', datasetName: 'D1', evaluators: [evaluator(0.5)] }],
      },
      // No suite-b data -> "detect" column missing for this model.
    ],
  },
];

describe('buildMatrix coverage floor', () => {
  // Reproduces the 2026-08-29 matrix: GLM-5.2 answered 2 of 24 prompts, scored
  // 10.0 on both, and outranked every frontier model. A thin run must never
  // publish an Overall number.
  const floorConfig: MatrixConfig = parseMatrixConfig({
    minCoverage: 2,
    columns: [
      { id: 'triage', label: 'Triage', suites: ['suite-a'], weight: 1 },
      { id: 'detect', label: 'Detect', suites: ['suite-b'], weight: 1 },
      { id: 'hunt', label: 'Hunt', suites: ['suite-c'], weight: 1 },
    ],
    models: [
      { id: 'model-thin', label: 'Thin Model' },
      { id: 'model-broad', label: 'Broad Model' },
    ],
  });

  const suite = (suiteId: string, id: string, mean: number) => ({
    suiteId,
    experimentId: `run-${id}`,
    datasets: [{ datasetId: id, datasetName: id, evaluators: [evaluator(mean)] }],
  });

  it('withholds Overall and ranks last when scored on too few columns', () => {
    const scores: AggregatedModelScores[] = [
      // One perfect cell — a 1.0 mean that would average to a rank-topping 10.
      { modelId: 'model-thin', provider: 'zai', suites: [suite('suite-a', 'd1', 1.0)] },
      // Two solid-but-lower cells from a model that actually ran the suite.
      {
        modelId: 'model-broad',
        provider: 'anthropic',
        suites: [suite('suite-a', 'd1', 0.8), suite('suite-b', 'd2', 0.8)],
      },
    ];

    const matrix = buildMatrix(scores, floorConfig);
    const thin = matrix.proprietary.find((r) => r.modelId === 'model-thin')!;
    const broad = matrix.proprietary.find((r) => r.modelId === 'model-broad')!;

    // The thin row must not publish a number...
    expect(thin.overall.kind).toBe('insufficient-coverage');
    expect(thin.coverage.covered).toBe(1);
    // ...and must rank BELOW the model with real coverage, despite scoring 10.
    expect(broad.overall.kind).toBe('score');
    expect(matrix.proprietary.indexOf(broad)).toBeLessThan(matrix.proprietary.indexOf(thin));
  });

  it('publishes Overall once the floor is met', () => {
    const scores: AggregatedModelScores[] = [
      {
        modelId: 'model-thin',
        provider: 'zai',
        suites: [suite('suite-a', 'd1', 1.0), suite('suite-b', 'd2', 1.0)],
      },
    ];
    const matrix = buildMatrix(scores, floorConfig);
    const row = matrix.proprietary.find((r) => r.modelId === 'model-thin')!;
    expect(row.overall.kind).toBe('score');
    expect(row.coverage.covered).toBe(2);
  });
});

describe('buildMatrix', () => {
  it('scales evaluator means onto a 0-10 scale and splits proprietary/open-source', () => {
    const matrix = buildMatrix(aggregated, config);

    expect(matrix.proprietary).toHaveLength(1);
    expect(matrix.openSource).toHaveLength(1);

    const good = matrix.proprietary[0];
    expect(good.modelLabel).toBe('Good Model');
    expect(good.cells.triage).toEqual({ kind: 'score', value: 9 });
    expect(good.cells.detect).toEqual({ kind: 'score', value: 8 });
    // Weighted overall: (9*1 + 8*2) / 3 = 8.33
    expect(good.overall).toEqual({ kind: 'score', value: 8.33 });
  });

  it('marks columns with no data as missing and counts them as 0 in the overall', () => {
    const matrix = buildMatrix(aggregated, config);
    const oss = matrix.openSource[0];

    expect(oss.cells.triage).toEqual({ kind: 'score', value: 5 });
    expect(oss.cells.detect).toEqual({ kind: 'missing' });
    // detect is missing (excluded entirely), so overall = triage only = 5.
    expect(oss.overall).toEqual({ kind: 'score', value: 5 });
  });

  it('skips models absent from the aggregated data', () => {
    const matrix = buildMatrix(aggregated, config);
    const labels = [...matrix.proprietary, ...matrix.openSource].map((row) => row.modelLabel);
    expect(labels).not.toContain('Absent Model');
  });

  it('renders "not recommended" when a scaled score is at/under the threshold', () => {
    const zeroConfig = parseMatrixConfig({
      columns: [{ id: 'triage', label: 'Triage', suites: ['suite-a'] }],
      models: [{ id: 'm', label: 'M' }],
    });
    const matrix = buildMatrix(
      [
        {
          modelId: 'm',
          suites: [
            {
              suiteId: 'suite-a',
              experimentId: 'r',
              datasets: [{ datasetId: 'd', datasetName: 'D', evaluators: [evaluator(0)] }],
            },
          ],
        },
      ],
      zeroConfig
    );

    expect(matrix.proprietary[0].cells.triage).toEqual({ kind: 'not-recommended' });
  });

  it('excludes observability-tier evaluators (latency/tokens/tool calls) by default', () => {
    const matrix = buildMatrix(
      [
        {
          modelId: 'm',
          suites: [
            {
              suiteId: 'suite-a',
              experimentId: 'r',
              datasets: [
                {
                  datasetId: 'd',
                  datasetName: 'D',
                  evaluators: [
                    { evaluatorName: 'Factuality', mean: 0.8, count: 10 },
                    { evaluatorName: 'Latency', mean: 4200, count: 10 },
                    { evaluatorName: 'Input Tokens', mean: 51234, count: 10 },
                    { evaluatorName: 'Tool Calls', mean: 7, count: 10 },
                    { evaluatorName: 'Skill Invoked (alert-analysis)', mean: 1, count: 10 },
                  ],
                },
              ],
            },
          ],
        },
      ],
      parseMatrixConfig({
        columns: [{ id: 'triage', label: 'Triage', suites: ['suite-a'] }],
        models: [{ id: 'm', label: 'M' }],
      })
    );

    // Only Factuality (0.8) contributes -> 0.8 * 10 = 8, not blown out by tokens/latency.
    expect(matrix.proprietary[0].cells.triage).toEqual({ kind: 'score', value: 8 });
  });

  it('honors a column evaluator allowlist over the global exclusion list', () => {
    const matrix = buildMatrix(
      [
        {
          modelId: 'm',
          suites: [
            {
              suiteId: 'suite-a',
              experimentId: 'r',
              datasets: [
                {
                  datasetId: 'd',
                  datasetName: 'D',
                  evaluators: [
                    { evaluatorName: 'Factuality', mean: 0.8, count: 10 },
                    { evaluatorName: 'Latency', mean: 0.2, count: 10 },
                  ],
                },
              ],
            },
          ],
        },
      ],
      parseMatrixConfig({
        // Explicit allowlist including 'Latency' opts it back in despite the default exclusion.
        columns: [{ id: 'triage', label: 'Triage', suites: ['suite-a'], evaluators: ['Latency'] }],
        models: [{ id: 'm', label: 'M' }],
      })
    );

    expect(matrix.proprietary[0].cells.triage).toEqual({ kind: 'score', value: 2 });
  });

  describe('composites', () => {
    const compositeConfig: MatrixConfig = parseMatrixConfig({
      showOverall: false,
      columns: [
        { id: 'c1', label: 'C1', group: 'Group', suites: ['s1'] },
        { id: 'c2', label: 'C2', group: 'Group', suites: ['s2'] },
        { id: 'feat', label: 'Feat', suites: ['s3'] },
      ],
      composites: [
        { id: 'group_score', label: 'Group Score', from: ['c1', 'c2'] },
        { id: 'overall_score', label: 'Overall Score', from: ['group_score', 'feat'] },
      ],
      layout: ['c1', 'c2', 'group_score', 'feat', 'overall_score'],
      models: [
        { id: 'm1', label: 'M1' },
        { id: 'm2', label: 'M2' },
      ],
    });

    const suite = (suiteId: string, mean: number) => ({
      suiteId,
      experimentId: `e-${suiteId}`,
      datasets: [{ datasetId: 'd', datasetName: 'D', evaluators: [evaluator(mean)] }],
    });

    it('averages base cells into a composite and layers composites of composites', () => {
      const matrix = buildMatrix(
        [{ modelId: 'm1', suites: [suite('s1', 0.8), suite('s2', 0.6)] }],
        compositeConfig
      );
      const row = matrix.proprietary[0];

      expect(row.cells.group_score).toEqual({ kind: 'score', value: 7 });
      // feat has no data -> missing, so overall = group_score only = 7.
      expect(row.cells.feat).toEqual({ kind: 'missing' });
      expect(row.cells.overall_score).toEqual({ kind: 'score', value: 7 });
    });

    it('counts "Not recommended" sources as 0 inside a composite', () => {
      const matrix = buildMatrix(
        [{ modelId: 'm1', suites: [suite('s1', 0), suite('s2', 0.6)] }],
        compositeConfig
      );
      const row = matrix.proprietary[0];

      expect(row.cells.c1).toEqual({ kind: 'not-recommended' });
      // mean(0, 6) = 3.
      expect(row.cells.group_score).toEqual({ kind: 'score', value: 3 });
    });

    it('marks a composite missing when none of its sources have data', () => {
      const matrix = buildMatrix([{ modelId: 'm1', suites: [suite('s3', 0.9)] }], compositeConfig);
      const row = matrix.proprietary[0];

      expect(row.cells.group_score).toEqual({ kind: 'missing' });
      // overall = feat only = 9.
      expect(row.cells.overall_score).toEqual({ kind: 'score', value: 9 });
    });

    it('builds display columns in layout order and suppresses the legacy overall', () => {
      const matrix = buildMatrix(
        [{ modelId: 'm1', suites: [suite('s1', 0.8), suite('s2', 0.6)] }],
        compositeConfig
      );

      expect(matrix.displayColumns?.map((column) => column.id)).toEqual([
        'c1',
        'c2',
        'group_score',
        'feat',
        'overall_score',
      ]);
      expect(matrix.displayColumns?.find((column) => column.id === 'group_score')?.kind).toBe(
        'composite'
      );
      expect(matrix.displayColumns?.some((column) => column.kind === 'overall')).toBe(false);
      expect(matrix.displayColumns?.find((column) => column.id === 'c1')?.group).toBe('Group');
    });

    it('ranks rows by the final composite (Overall Score) descending', () => {
      const matrix = buildMatrix(
        [
          { modelId: 'm1', suites: [suite('s1', 0.3), suite('s2', 0.3)] },
          { modelId: 'm2', suites: [suite('s1', 0.9), suite('s2', 0.9)] },
        ],
        compositeConfig
      );

      expect(matrix.proprietary.map((row) => row.modelLabel)).toEqual(['M2', 'M1']);
    });

    it('throws when the layout references an unknown id', () => {
      const badConfig = parseMatrixConfig({
        columns: [{ id: 'c1', label: 'C1', suites: ['s1'] }],
        layout: ['c1', 'nope'],
        models: [{ id: 'm1', label: 'M1' }],
      });
      expect(() => buildMatrix([{ modelId: 'm1', suites: [suite('s1', 0.5)] }], badConfig)).toThrow(
        /unknown column\/composite id/
      );
    });
  });

  it('sorts rows by overall score descending', () => {
    const matrix = buildMatrix(
      [
        {
          modelId: 'model-good',
          suites: [
            {
              suiteId: 'suite-a',
              experimentId: 'r1',
              datasets: [{ datasetId: 'd', datasetName: 'D', evaluators: [evaluator(0.3)] }],
            },
          ],
        },
        {
          modelId: 'model-missing',
          suites: [
            {
              suiteId: 'suite-a',
              experimentId: 'r2',
              datasets: [{ datasetId: 'd', datasetName: 'D', evaluators: [evaluator(0.9)] }],
            },
          ],
        },
      ],
      parseMatrixConfig({
        columns: [{ id: 'triage', label: 'Triage', suites: ['suite-a'] }],
        models: [
          { id: 'model-good', label: 'Lower' },
          { id: 'model-missing', label: 'Higher' },
        ],
      })
    );

    expect(matrix.proprietary.map((row) => row.modelLabel)).toEqual(['Higher', 'Lower']);
  });
});

describe('buildMatrix token axis', () => {
  const tokenEvaluator = (name: string, mean: number, min: number, max: number, count = 3) => ({
    evaluatorName: name,
    mean,
    count,
    min,
    max,
  });

  const tokenAggregated: AggregatedModelScores[] = [
    {
      modelId: 'model-good',
      suites: [
        {
          suiteId: 'suite-a',
          experimentId: 'run-1',
          datasets: [
            {
              datasetId: 'd1',
              datasetName: 'D1',
              evaluators: [
                evaluator(0.9),
                tokenEvaluator('Input Tokens', 100_000, 50_000, 150_000),
                tokenEvaluator('Output Tokens', 2_000, 1_000, 3_000),
              ],
            },
          ],
        },
      ],
    },
  ];

  const tokenConfig: MatrixConfig = parseMatrixConfig({
    columns: [{ id: 'triage', label: 'Triage', suites: ['suite-a'], weight: 1 }],
    models: [{ id: 'model-good', label: 'Good Model' }],
    tokenCost: {},
  });

  it('is omitted entirely when the config does not opt in', () => {
    expect(buildMatrix(tokenAggregated, config).tokenCost).toBeUndefined();
  });

  it('aggregates token evaluators in native units with min/max preserved', () => {
    const matrix = buildMatrix(tokenAggregated, tokenConfig);
    const cell = matrix.tokenCost!.models[0].cells[0];

    expect(cell.columnId).toBe('triage');
    expect(cell.inputTokens).toEqual({ mean: 100_000, min: 50_000, max: 150_000, count: 3 });
    expect(cell.outputTokens).toEqual({ mean: 2_000, min: 1_000, max: 3_000, count: 3 });
    expect(cell.totalMean).toBe(102_000);
  });

  it('does not let token evaluators leak into quality cells', () => {
    const matrix = buildMatrix(tokenAggregated, tokenConfig);
    // 0.9 * defaultScale(10) — unaffected by the 100k-magnitude token evaluators.
    expect(matrix.proprietary[0].cells.triage).toEqual({ kind: 'score', value: 9 });
  });

  it('weights the mean by sample count across suites', () => {
    const twoSuite: MatrixConfig = parseMatrixConfig({
      columns: [{ id: 'triage', label: 'Triage', suites: ['suite-a', 'suite-b'], weight: 1 }],
      models: [{ id: 'model-good', label: 'Good Model' }],
      tokenCost: {},
    });
    const matrix = buildMatrix(
      [
        {
          modelId: 'model-good',
          suites: [
            {
              suiteId: 'suite-a',
              experimentId: 'r1',
              datasets: [
                {
                  datasetId: 'd1',
                  datasetName: 'D1',
                  evaluators: [tokenEvaluator('Input Tokens', 100, 100, 100, 1)],
                },
              ],
            },
            {
              suiteId: 'suite-b',
              experimentId: 'r2',
              datasets: [
                {
                  datasetId: 'd2',
                  datasetName: 'D2',
                  evaluators: [tokenEvaluator('Input Tokens', 200, 200, 200, 3)],
                },
              ],
            },
          ],
        },
      ],
      twoSuite
    );
    // (100*1 + 200*3) / 4 = 175, not the unweighted 150.
    expect(matrix.tokenCost!.models[0].cells[0].inputTokens!.mean).toBe(175);
    expect(matrix.tokenCost!.models[0].cells[0].inputTokens!.min).toBe(100);
    expect(matrix.tokenCost!.models[0].cells[0].inputTokens!.max).toBe(200);
  });

  it('omits cells with no token data', () => {
    const matrix = buildMatrix(aggregated, tokenConfig);
    expect(matrix.tokenCost!.models).toEqual([]);
  });
});
