/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderMatrix } from './render_matrix';
import { parseMatrixConfig } from './load_matrix_config';
import type { Matrix } from './build_matrix';

const config = parseMatrixConfig({
  title: 'Test Matrix',
  columns: [
    { id: 'triage', label: 'Alert Triage', suites: ['a'] },
    { id: 'detect', label: 'Detection Engineering', suites: ['b'] },
  ],
  models: [{ id: 'm', label: 'M' }],
});

const matrix: Matrix = {
  columns: [
    { id: 'triage', label: 'Alert Triage' },
    { id: 'detect', label: 'Detection Engineering' },
  ],
  overallLabel: 'Overall',
  proprietary: [
    {
      modelId: 'claude',
      modelLabel: 'Claude Sonnet 4',
      openSource: false,
      cells: {
        triage: { kind: 'score', value: 9.2 },
        detect: { kind: 'not-recommended' },
      },
      overall: { kind: 'score', value: 4.6 },
    },
  ],
  openSource: [
    {
      modelId: 'oss',
      modelLabel: 'GPT OSS 120B',
      openSource: true,
      cells: {
        triage: { kind: 'score', value: 7.6 },
        detect: { kind: 'missing' },
      },
      overall: { kind: 'score', value: 3.8 },
    },
  ],
};

describe('renderMatrix', () => {
  it('renders CSV with a header row and one row per model', () => {
    const { proprietaryCsv, openSourceCsv } = renderMatrix(matrix, config);

    expect(proprietaryCsv.split('\n')[0]).toBe('Model,Alert Triage,Detection Engineering,Overall');
    expect(proprietaryCsv).toContain('Claude Sonnet 4,9.2,Not recommended,4.6');
    // Missing cells render as empty fields.
    expect(openSourceCsv).toContain('GPT OSS 120B,7.6,,3.8');
  });

  it('renders markdown with proprietary and open-source sections', () => {
    const { markdown } = renderMatrix(matrix, config);

    expect(markdown).toContain('# Test Matrix');
    expect(markdown).toContain('## Proprietary models');
    expect(markdown).toContain('## Open-source models');
    expect(markdown).toContain('| Claude Sonnet 4 | 9.2 | Not recommended | 4.6 |');
  });

  it('produces valid JSON with the matrix structure', () => {
    const { json } = renderMatrix(matrix, config);
    const parsed = JSON.parse(json);

    expect(parsed.title).toBe('Test Matrix');
    expect(parsed.proprietary).toHaveLength(1);
    expect(parsed.openSource[0].modelLabel).toBe('GPT OSS 120B');
  });

  it('renders composite columns in displayColumns order (no trailing legacy overall)', () => {
    const compositeMatrix: Matrix = {
      columns: [
        { id: 'a', label: 'Alert Triage', group: 'Agent Builder' },
        { id: 'b', label: 'Investigation', group: 'Agent Builder' },
      ],
      composites: [
        { id: 'ab', label: 'Agent Builder Score' },
        { id: 'overall_score', label: 'Overall Score' },
      ],
      displayColumns: [
        { id: 'a', label: 'Alert Triage', group: 'Agent Builder', kind: 'base' },
        { id: 'b', label: 'Investigation', group: 'Agent Builder', kind: 'base' },
        { id: 'ab', label: 'Agent Builder Score', kind: 'composite' },
        { id: 'overall_score', label: 'Overall Score', kind: 'composite' },
      ],
      overallLabel: 'Overall',
      proprietary: [
        {
          modelId: 'm',
          modelLabel: 'Claude',
          openSource: false,
          cells: {
            a: { kind: 'score', value: 8.6 },
            b: { kind: 'score', value: 7.4 },
            ab: { kind: 'score', value: 8 },
            overall_score: { kind: 'score', value: 8 },
          },
          overall: { kind: 'score', value: 8 },
        },
      ],
      openSource: [],
    };

    const { proprietaryCsv } = renderMatrix(compositeMatrix, config);
    // No trailing "Overall" column; composites appear in declared layout order.
    expect(proprietaryCsv.split('\n')[0]).toBe(
      'Model,Alert Triage,Investigation,Agent Builder Score,Overall Score'
    );
    expect(proprietaryCsv).toContain('Claude,8.6,7.4,8,8');
  });

  it('escapes CSV fields that contain commas or quotes', () => {
    const cfgWithComma = parseMatrixConfig({
      title: 'X',
      columns: [{ id: 'c', label: 'Col, with comma', suites: ['a'] }],
      models: [{ id: 'm', label: 'M' }],
    });
    const m: Matrix = {
      columns: [{ id: 'c', label: 'Col, with comma' }],
      overallLabel: 'Overall',
      proprietary: [
        {
          modelId: 'm',
          modelLabel: 'M',
          openSource: false,
          cells: { c: { kind: 'score', value: 1 } },
          overall: { kind: 'score', value: 1 },
        },
      ],
      openSource: [],
    };

    const { proprietaryCsv } = renderMatrix(m, cfgWithComma);
    expect(proprietaryCsv.split('\n')[0]).toBe('Model,"Col, with comma",Overall');
  });
});
