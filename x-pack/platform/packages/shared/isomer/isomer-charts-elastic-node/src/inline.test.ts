/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolveChartTheme } from '@kbn/isomer-primitives-charts';
import { defineElasticChartsInlineEngine } from './inline';

const request = {
  mode: 'light' as const,
  theme: resolveChartTheme('light'),
  width: 300,
  height: 160,
};

describe('defineElasticChartsInlineEngine', () => {
  it('draws in the calling thread, which then holds the jsdom window', async () => {
    const engine = await defineElasticChartsInlineEngine();
    const artifact = await engine.draw!(
      { type: 'metricTrend', title: 'Visits', value: 1610 } as never,
      request
    );
    expect((artifact.plot as { html: string }).html).toContain('Visits');
    expect(artifact).toMatchObject({ width: 300, height: 160 });
    expect('document' in globalThis).toBe(true);
  });

  it('rejects a chart it has no drawing for', async () => {
    const engine = await defineElasticChartsInlineEngine();
    await expect(engine.draw!({ type: 'nope' } as never, request)).rejects.toThrow(
      /no drawing for nope/
    );
  });
});
