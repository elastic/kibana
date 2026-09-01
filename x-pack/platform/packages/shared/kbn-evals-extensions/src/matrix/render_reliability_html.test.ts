/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Matrix } from './build_matrix';
import { renderReliabilityHtml } from './render_reliability_html';

const matrix: Matrix = {
  columns: [],
  composites: [],
  displayColumns: [],
  overallLabel: 'Overall',
  proprietary: [
    {
      modelId: 'measured',
      modelLabel: 'Measured',
      openSource: false,
      cells: {},
      overall: { kind: 'score', value: 8 },
      capability: { kind: 'score', value: 9 },
      judgedQuality: { kind: 'score', value: 7 },
      coverage: { covered: 8, total: 8 },
      tier: 1,
    },
    {
      modelId: 'single',
      modelLabel: 'Single run',
      openSource: false,
      cells: {},
      overall: { kind: 'score', value: 7 },
      capability: { kind: 'score', value: 6 },
      judgedQuality: { kind: 'score', value: 8 },
      coverage: { covered: 8, total: 8 },
      tier: 1,
    },
  ],
  openSource: [],
};

describe('renderReliabilityHtml', () => {
  it('renders a separate reliability artifact without treating unmeasured as zero', () => {
    const html = renderReliabilityHtml(matrix, {
      'measured:example-a': { repTrails: [['search'], ['search']] },
      'measured:example-b': { repTrails: [['search'], ['load_skill']] },
      'single:example-a': { repTrails: [['search']] },
    });
    expect(html).toContain('Capability · Reliability · Judged quality');
    expect(html).toContain('<strong>50%</strong>');
    expect(html).toContain('9.00');
    expect(html).toContain('7.00');
    expect(html).toContain('Unmeasured');
    expect(html).not.toContain('Unmeasured</span><small>0');
  });
});
