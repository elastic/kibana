/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { injectable } from 'inversify';
import type { MetricCollectorWriter, MetricRecorder, MetricRecorderContext } from '../types';

/**
 * Built-in generic {@link MetricRecorder} that forwards every counter
 * contribution a step emitted on `meta.counters` into the collector.
 *
 * Observes `'all'` steps. This is the single seam that makes step-emitted
 * counters need zero bespoke recorders — a step gets a new counter by
 * adding a name to the catalog and emitting it on `meta.counters`.
 */
@injectable()
export class EmittedCountersRecorder implements MetricRecorder {
  public readonly name = 'emitted_counters';
  public readonly observes = 'all' as const;

  public record(collector: MetricCollectorWriter, { meta }: MetricRecorderContext): void {
    const counters = meta?.counters;
    if (!counters) return;

    for (const [name, value] of Object.entries(counters)) {
      collector.increment(name, value);
    }
  }
}
