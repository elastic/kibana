/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RunMetrics } from './version_specific_policy_assignment_run_metrics';

describe('RunMetrics', () => {
  it('reports the duration, the phase durations and the memory of the run', async () => {
    const metrics = new RunMetrics();

    const result = await metrics.measurePhase('phaseA', async () => 'done');
    await metrics.measurePhase('phaseB', async () => undefined);
    await metrics.measurePhase('phaseB', async () => undefined);

    expect(result).toBe('done');
    const report = metrics.stop();
    expect(report.durationMs).toBeGreaterThanOrEqual(0);
    expect(Object.keys(report.phaseDurationsMs)).toEqual(['phaseA', 'phaseB']);
    expect(report.heapUsedMbPeak).toBeGreaterThanOrEqual(report.heapUsedMbAtStart);
    expect(report.rssMbPeak).toBeGreaterThan(0);
  });

  it('measures a phase that throws and rethrows', async () => {
    const metrics = new RunMetrics();

    await expect(
      metrics.measurePhase('failing', async () => {
        throw new Error('boom');
      })
    ).rejects.toThrow('boom');

    expect(Object.keys(metrics.stop().phaseDurationsMs)).toEqual(['failing']);
  });
});
