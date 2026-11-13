/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolveChartTheme } from '@kbn/isomer-primitives-charts';
import { defineElasticChartsNodeEngine } from './node';

const request = {
  mode: 'light' as const,
  theme: resolveChartTheme('light'),
  width: 300,
  height: 160,
};

describe('defineElasticChartsNodeEngine', () => {
  it('draws in a worker and leaves this thread without DOM globals', async () => {
    const engine = await defineElasticChartsNodeEngine();
    try {
      const artifact = await engine.draw!(
        { type: 'metricTrend', title: 'Visits', value: 1610 } as never,
        request
      );
      expect((artifact.plot as { html: string }).html).toContain('Visits');
      expect('window' in globalThis).toBe(false);
      expect('document' in globalThis).toBe(false);
    } finally {
      await engine.close();
    }
  });

  it('rejects a drawing the thread cannot make, keeps drawing, and rejects after close', async () => {
    const engine = await defineElasticChartsNodeEngine();
    try {
      await expect(engine.draw!({ type: 'nope' } as never, request)).rejects.toThrow(
        /no drawing for nope/
      );
      await expect(
        engine.draw!({ type: 'metricTrend', title: 'Visits', value: 1 } as never, request)
      ).resolves.toMatchObject({ width: 300, height: 160 });
    } finally {
      await engine.close();
    }
    await expect(
      engine.draw!({ type: 'metricTrend', title: 'Visits', value: 1 } as never, request)
    ).rejects.toThrow(/closed/);
  });
});
