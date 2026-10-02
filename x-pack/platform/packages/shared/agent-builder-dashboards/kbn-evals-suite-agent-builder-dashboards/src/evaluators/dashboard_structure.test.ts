/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { dashboard, metric, section, xy } from '../test_helpers';
import { dashboardStructureEvaluator } from './dashboard_structure';
import type { DashboardStructureGold } from '../evaluate_dataset';

const grid = { x: 0, y: 0, w: 12, h: 5 };

const evaluateStructure = (
  structure: DashboardStructureGold,
  panels: Parameters<typeof dashboard>[0]
) =>
  dashboardStructureEvaluator.evaluate({
    input: { question: 'q' },
    expected: { structure },
    metadata: undefined,
    output: { errors: [], messages: [], dashboard: dashboard(panels) },
  });

describe('dashboard structure evaluator', () => {
  it('scores the fraction of gold assertions that hold', async () => {
    const result = await evaluateStructure(
      { panelCount: { min: 3 }, panelKinds: { metric: 2, xy: 1 }, sectionCount: 1 },
      [metric('a', grid), metric('b', grid), xy('c', grid)]
    );
    expect(result.score).toBeCloseTo(3 / 4);
    expect(result.explanation).toContain('sectionCount');
  });

  it('matches gold sections by title terms and minimum size, each claiming one section', async () => {
    const result = await evaluateStructure(
      {
        sections: [
          { titleIncludesAny: ['traffic', 'volume'] },
          { titleIncludesAny: ['response', 'status'], minPanels: 2 },
        ],
      },
      [
        section('s1', 'Traffic Volume', 0, [xy('a', grid)]),
        section('s2', 'Response Codes', 1, [xy('b', grid)]),
      ]
    );
    expect(result.score).toBe(0.5);
    expect(result.explanation).toContain('sections[1]');
  });

  it('skips without gold and scores 0 without a dashboard', async () => {
    const skipped = await dashboardStructureEvaluator.evaluate({
      input: { question: 'q' },
      expected: {},
      metadata: undefined,
      output: { errors: [], messages: [] },
    });
    expect(skipped.score).toBeNull();
    const missing = await dashboardStructureEvaluator.evaluate({
      input: { question: 'q' },
      expected: { structure: { panelCount: { min: 1 } } },
      metadata: undefined,
      output: { errors: [], messages: [] },
    });
    expect(missing.score).toBe(0);
  });
});
