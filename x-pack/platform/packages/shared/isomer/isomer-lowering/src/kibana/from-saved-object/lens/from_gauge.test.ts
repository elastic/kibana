/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import lensGauge from '../../__fixtures__/lens_gauge.json';
import { fromKibanaSavedObject } from '..';

describe('fromKibanaSavedObject (Gauge)', () => {
  it('lowers an lnsGauge saved object to AdaptiveLens(chart.kind = "gauge")', () => {
    const { lens, diagnostics } = fromKibanaSavedObject(lensGauge, {
      resolveReferenceTitle: () => 'metrics-*',
    });
    expect(lens).toBeDefined();
    expect(lens?.chart.kind).toBe('gauge');

    if (lens?.chart.kind === 'gauge') {
      expect(lens.chart.value.id).toBe('col-cpu');
      expect(lens.chart.shape).toBe('horizontalBullet');
      expect(lens.chart.range).toEqual({ min: 0, max: 1 });
      expect(lens.chart.target).toBe(0.8);
      expect(lens.chart.bands).toEqual([
        { end: 0.5, tone: 'danger', color: '#36a2a2' },
        { end: 0.7, tone: 'warning', color: '#e2bd3a' },
        { end: 0.9, tone: 'success', color: '#cc3d4c' },
      ]);
    }

    expect(diagnostics.find((d) => d.code === 'lens.formBased.lowered-to-esql')).toBeDefined();
  });
});
