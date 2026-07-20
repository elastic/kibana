/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createRulePipelineState } from '../../test_utils';
import { MetricCollectorImpl } from '../metric_collector';
import { EmittedCountersRecorder } from './emitted_counters_recorder';

describe('EmittedCountersRecorder', () => {
  const startedAt = new Date('2025-01-01T00:00:00.000Z');
  let collector: MetricCollectorImpl;
  let recorder: EmittedCountersRecorder;

  beforeEach(() => {
    collector = new MetricCollectorImpl({ executionId: 'e', startedAt });
    recorder = new EmittedCountersRecorder();
  });

  it('observes every step and is named emitted_counters', () => {
    expect(recorder.observes).toBe('all');
    expect(recorder.name).toBe('emitted_counters');
  });

  it('forwards every counter in meta.counters into the collector', () => {
    recorder.record(collector, {
      state: createRulePipelineState(),
      meta: {
        counters: {
          signalsGenerated: 3,
          ruleEventsGenerated: 2,
        },
      },
      stepName: 'step1',
      emissionIndex: 0,
    });

    expect(collector.snapshot().counters).toEqual({
      signalsGenerated: 3,
      ruleEventsGenerated: 2,
    });
  });

  it('no-ops when meta is absent', () => {
    recorder.record(collector, {
      state: createRulePipelineState(),
      stepName: 'step1',
      emissionIndex: 0,
    });

    expect(collector.snapshot().counters).toEqual({});
  });

  it('no-ops when meta.counters is absent', () => {
    recorder.record(collector, {
      state: createRulePipelineState(),
      meta: {},
      stepName: 'step1',
      emissionIndex: 0,
    });

    expect(collector.snapshot().counters).toEqual({});
  });

  it('sums repeated emissions into the collector', () => {
    for (let i = 0; i < 3; i++) {
      recorder.record(collector, {
        state: createRulePipelineState(),
        meta: { counters: { signalsGenerated: 2 } },
        stepName: 'step1',
        emissionIndex: i,
      });
    }

    expect(collector.snapshot().counters).toEqual({ signalsGenerated: 6 });
  });
});
