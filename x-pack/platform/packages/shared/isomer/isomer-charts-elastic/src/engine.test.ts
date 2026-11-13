/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineElasticChartsEngine } from './engine';
import { lightenColor } from './lighten';
import { kibanaBaseTheme } from './theme';

describe('defineElasticChartsEngine', () => {
  it('draws all six types live', () => {
    const engine = defineElasticChartsEngine();
    const drawn = ['donut', 'gauge', 'heatmap', 'metricTrend', 'treemap', 'xyChart'];
    expect(Object.keys(engine.supports).sort()).toEqual(drawn);
    expect(Object.keys(engine.live ?? {}).sort()).toEqual(drawn);
  });

  it('takes presentation hints by node id and refuses a key it does not know', () => {
    expect(() =>
      defineElasticChartsEngine({
        hints: { p1: { legend: { show: false }, colors: { a: '#16C5C0' } } },
      })
    ).not.toThrow();
    expect(() =>
      defineElasticChartsEngine({
        hints: { p1: { legend: { show: false }, data: [] } as never },
      })
    ).toThrow();
    expect(() => defineElasticChartsEngine({ hints: { p1: { colors: { a: 'red' } } } })).toThrow();
  });
});

describe('kibanaBaseTheme', () => {
  it('prefixes Kibana’s numeric font and sets axis titles as the charts plugin does', () => {
    const theme = kibanaBaseTheme('light');
    expect(theme.axes.tickLabel.fontFamily).toMatch(/^'Elastic UI Numeric', /);
    expect(theme.axes.axisTitle.fill).toBe(theme.axes.tickLabel.fill);
    expect(theme.axes.axisTitle.fontWeight).toBe(500);
  });
});

describe('lightenColor', () => {
  it('steps deeper levels toward a lighter shade, as Kibana does', () => {
    expect(lightenColor('#16C5C0', 1, 2)).toBe('#16c5c0');
    expect(lightenColor('#16C5C0', 2, 2)).not.toBe('#16c5c0');
    expect(lightenColor('#16C5C0', 2, 1)).toBe('#16C5C0');
  });
});

describe('baseTheme', () => {
  it('takes a theme or a function of the mode', () => {
    const theme = kibanaBaseTheme('dark');
    expect(() => defineElasticChartsEngine({ baseTheme: theme })).not.toThrow();
    expect(() =>
      defineElasticChartsEngine({ baseTheme: (mode) => kibanaBaseTheme(mode) })
    ).not.toThrow();
  });
});
