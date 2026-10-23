/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { dashboard, metric, section, xy } from '../test_helpers';
import { dashboardStructureEvaluator } from './dashboard_structure';
import type { DashboardStructureGold } from '../types';

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

  it('checks that each gold row sits directly below the previous one', async () => {
    const rows: DashboardStructureGold['rows'] = [
      { kind: 'metric' },
      { kind: 'xy', fullWidth: true },
    ];
    const asked = await evaluateStructure({ rows }, [
      metric('a', { x: 0, y: 0, w: 24, h: 5 }),
      metric('b', { x: 24, y: 0, w: 24, h: 5 }),
      xy('c', { x: 0, y: 5, w: 48, h: 10 }),
    ]);
    expect(asked.score).toBe(1);

    const misplaced = await evaluateStructure({ rows }, [
      metric('a', { x: 0, y: 0, w: 24, h: 5 }),
      metric('b', { x: 0, y: 5, w: 24, h: 5 }),
      xy('c', { x: 0, y: 12, w: 24, h: 10 }),
    ]);
    expect(misplaced.score).toBe(0);
    expect(misplaced.explanation).toContain('metric panels are not in one row');
    expect(misplaced.explanation).toContain('xy panels are not full width');
    expect(misplaced.explanation).toContain('xy row is not directly below rows[0]');
  });

  it('needs one height per row, and fails the row below a missing one', async () => {
    const rows: DashboardStructureGold['rows'] = [
      { kind: 'metric' },
      { kind: 'xy', fullWidth: true },
    ];
    const uneven = await evaluateStructure({ rows }, [
      metric('a', { x: 0, y: 0, w: 24, h: 5 }),
      metric('b', { x: 24, y: 0, w: 24, h: 8 }),
      xy('c', { x: 0, y: 8, w: 48, h: 10 }),
    ]);
    expect(uneven.score).toBe(0.5);
    expect(uneven.explanation).toContain('metric panels are not in one row');

    const noMetrics = await evaluateStructure({ rows }, [xy('c', { x: 0, y: 0, w: 48, h: 10 })]);
    expect(noMetrics.score).toBe(0);
    expect(noMetrics.explanation).toContain('xy row is not directly below rows[0]');
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
