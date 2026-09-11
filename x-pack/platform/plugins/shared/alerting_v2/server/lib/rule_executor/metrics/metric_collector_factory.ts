/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MetricCollector, MetricCollectorFactoryContract } from './types';
import { MetricCollectorImpl } from './metric_collector';

/**
 * Default {@link MetricCollectorFactoryContract} used by the pipeline.
 *
 * `executionId` is passed in at {@link create} time — the pipeline forwards
 * Task Manager's `RunContext.executionUuid` so the collector does not mint its
 * own identity. `startedAt` is sourced from `Date`; the `now` seam is
 * overridable via constructor options so tests can stamp deterministic timing
 * without patching globals.
 *
 * Deliberately not `@injectable()`: DI never supplies constructor arguments.
 * The container wires it via `.toDynamicValue(() => new MetricCollectorFactory())`
 * in `bind_rule_executor.ts` and tests bypass DI entirely — keeping this class
 * framework-agnostic and free of decorator/metadata footguns.
 */
export class MetricCollectorFactory implements MetricCollectorFactoryContract {
  readonly #now: () => Date;

  constructor(options?: { now?: () => Date }) {
    this.#now = options?.now ?? (() => new Date());
  }

  public create({ executionId }: { executionId: string }): MetricCollector {
    return new MetricCollectorImpl({
      executionId,
      startedAt: this.#now(),
    });
  }
}
