/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildMatrix } from '../../matrix/build_matrix';
import { renderMatrix } from '../../matrix/render_matrix';
import { parseMatrixConfig } from '../../matrix/load_matrix_config';
import type { AggregatedModelScores } from '../../matrix/query_matrix_scores';
import { matrixScoreQuery } from './matrix';

describe('matrixScoreQuery', () => {
  const query = (overrides = {}) =>
    matrixScoreQuery(
      parseMatrixConfig({
        columns: [{ id: 'triage', label: 'Triage', suites: ['suite-a'], examplePrefixes: ['a'] }],
        models: [{ id: 'model-a', label: 'Model A' }],
        ...overrides,
      }),
      { suiteIds: ['suite-a'], modelIds: ['model-a'] }
    );

  it('forwards the opted-in scoring policy to the aggregator', () => {
    expect(query({ scoring: { useVerdictLadder: true, requireEisJudge: true } }).scoring).toEqual({
      useVerdictLadder: true,
      requireEisJudge: true,
      excludeSelfJudged: false,
    });
  });

  it('forwards no policy when the config does not opt in', () => {
    expect(query().scoring).toBeUndefined();
  });

  it('de-duplicates example prefixes across columns', () => {
    const options = query({
      columns: [
        { id: 'a', label: 'A', suites: ['s'], examplePrefixes: ['dup'] },
        { id: 'b', label: 'B', suites: ['s'], examplePrefixes: ['dup', 'other'] },
      ],
    });

    expect(options.examplePrefixes).toEqual(['dup', 'other']);
  });

  // Suite histories are not co-located: the migrations suite publishes on a
  // feature branch while every persona column lives on `main`. A single global
  // branch can only satisfy one of them, so the other renders blank.
  it('maps per-column branch overrides onto their suites', () => {
    const options = query({
      columns: [
        { id: 'persona', label: 'Persona', suites: ['persona-suite'] },
        {
          id: 'migrations',
          label: 'Migrations',
          suites: ['migrations-suite'],
          branch: 'feat/matrix-v3',
        },
      ],
    });

    expect(options.branchBySuite).toEqual({ 'migrations-suite': 'feat/matrix-v3' });
  });

  it('omits suites that do not override the branch', () => {
    expect(query().branchBySuite).toEqual({});
  });

  it('rejects conflicting branch overrides for a shared suite', () => {
    expect(() =>
      query({
        columns: [
          { id: 'a', label: 'A', suites: ['shared'], branch: 'branch-one' },
          { id: 'b', label: 'B', suites: ['shared'], branch: 'branch-two' },
        ],
      })
    ).toThrow(/Conflicting branch overrides for suite "shared"/);
  });

  it('accepts agreeing branch overrides for a shared suite', () => {
    const options = query({
      columns: [
        { id: 'a', label: 'A', suites: ['shared'], branch: 'same-branch' },
        { id: 'b', label: 'B', suites: ['shared'], branch: 'same-branch' },
      ],
    });

    expect(options.branchBySuite).toEqual({ shared: 'same-branch' });
  });
});

describe('matrix command empty-result guard', () => {
  const config = parseMatrixConfig({
    columns: [{ id: 'triage', label: 'Triage', suites: ['suite-a'], weight: 1 }],
    models: [{ id: 'model-a', label: 'Model A' }],
  });

  it('renders header-only CSVs when no experiments match', () => {
    const rendered = renderMatrix(buildMatrix([], config), config);

    expect(rendered.proprietaryCsv.trim().split('\n')).toHaveLength(1);
    expect(rendered.openSourceCsv.trim().split('\n')).toHaveLength(1);
  });

  it('renders populated CSVs when experiments do match', () => {
    const aggregated: AggregatedModelScores[] = [
      {
        modelId: 'model-a',
        provider: 'anthropic',
        suites: [
          {
            suiteId: 'suite-a',
            experimentId: 'experiment-a',
            datasets: [
              {
                datasetId: 'dataset-a-id',
                datasetName: 'dataset-a',
                evaluators: [{ evaluatorName: 'correctness', mean: 0.9, count: 10 }],
              },
            ],
          },
        ],
      },
    ];

    const rendered = renderMatrix(buildMatrix(aggregated, config), config);

    expect(rendered.proprietaryCsv.trim().split('\n').length).toBeGreaterThan(1);
  });

  it('produces no model rows when no experiments match', () => {
    const matrix = buildMatrix([], config);

    expect(matrix.proprietary).toHaveLength(0);
    expect(matrix.openSource).toHaveLength(0);
  });
});
