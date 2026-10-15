/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineElasticChartsNodeEngine } from './node';

const theme = async () =>
  (await import('@kbn/isomer-primitives-charts')).resolveChartTheme('light');

describe('defineElasticChartsNodeEngine', () => {
  it('draws an xy chart in Node as markup with its plot as a Skia image', async () => {
    const engine = await defineElasticChartsNodeEngine();
    const artifact = await engine.draw!(
      {
        type: 'xyChart',
        x: { type: 'category' },
        series: [
          {
            label: 'Requests',
            kind: 'bar',
            points: [
              { x: 'a', y: 1 },
              { x: 'b', y: 2 },
            ],
          },
        ],
      } as never,
      { mode: 'light', theme: await theme(), width: 400, height: 200 }
    );
    expect(artifact.plot.kind).toBe('markup');
    const { html, stylesheet } = artifact.plot as {
      html: string;
      stylesheet: string;
    };
    expect(html).toMatch(/<img [^>]*src="data:image\/png;base64,/);
    expect(html).not.toContain('<canvas');
    expect(stylesheet).not.toContain('min-content');
  });

  it('draws a metric with grid rows a static rasterizer can parse', async () => {
    const engine = await defineElasticChartsNodeEngine();
    const artifact = await engine.draw!(
      { type: 'metricTrend', title: 'Visits', value: 1610 } as never,
      { mode: 'light', theme: await theme(), width: 300, height: 160 }
    );
    const { html } = artifact.plot as { html: string };
    expect(html).toContain('Visits');
    expect(html).not.toContain('min-content');
    expect(html).toMatch(/grid-template-rows:\s*auto 1fr auto auto/);
  });
});
