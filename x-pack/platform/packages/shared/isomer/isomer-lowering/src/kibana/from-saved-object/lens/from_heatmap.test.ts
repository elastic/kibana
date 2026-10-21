/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import lensHeatmap from '../../__fixtures__/lens_heatmap.json';
import { fromKibanaSavedObject } from '..';

describe('fromKibanaSavedObject (Heatmap)', () => {
  it('lowers an lnsHeatmap saved object to AdaptiveLens(chart.kind = "heatmap")', () => {
    const { lens, diagnostics } = fromKibanaSavedObject(lensHeatmap, {
      resolveReferenceTitle: () => 'web-*',
    });
    expect(lens).toBeDefined();
    expect(lens?.chart.kind).toBe('heatmap');

    if (lens?.chart.kind === 'heatmap') {
      expect(lens.chart.xBucket.id).toBe('col-hour');
      expect(lens.chart.yBucket.id).toBe('col-region');
      expect(lens.chart.value.id).toBe('col-count');
    }

    expect(
      diagnostics.find((d) => d.code === 'lens.heatmap.lowered-to-adaptive-heatmap')
    ).toBeDefined();
  });

  it('preserves Lens heatmap palette stops as normalized color stops', () => {
    const patched = JSON.parse(JSON.stringify(lensHeatmap));
    patched.attributes.state.visualization.palette = {
      params: {
        stops: [
          { stop: 0, color: '#d3dae6' },
          { stop: 50, color: '#f6b26b' },
          { stop: 100, color: '#cc5642' },
        ],
      },
    };

    const { lens, diagnostics } = fromKibanaSavedObject(patched, {
      resolveReferenceTitle: () => 'web-*',
    });

    expect(lens?.chart.kind).toBe('heatmap');
    if (lens?.chart.kind === 'heatmap') {
      expect(lens.chart.colorStops).toEqual([
        { at: 0, tone: 'neutral', color: '#d3dae6' },
        { at: 0.5, tone: 'warning', color: '#f6b26b' },
        { at: 1, tone: 'danger', color: '#cc5642' },
      ]);
    }
    expect(diagnostics.find((d) => d.code === 'lens.heatmap.palette-preserved')).toBeDefined();
  });
});
