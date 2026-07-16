/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidV4 } from 'uuid';
import type { MetricCollector, MetricCollectorFactoryContract } from './types';
import { MetricCollectorImpl } from './metric_collector';

/**
 * Default {@link MetricCollectorFactoryContract} used by the pipeline.
 *
 * Sources `executionId` from `uuid.v4()` and `startedAt` from `Date`. Both
 * seams are overridable via constructor options so tests can stamp
 * deterministic values without patching globals.
 *
 * Deliberately not `@injectable()`: DI never supplies constructor arguments.
 * The container wires it via `.toDynamicValue(() => new MetricCollectorFactory())`
 * in `bind_rule_executor.ts` and tests bypass DI entirely — keeping this class
 * framework-agnostic and free of decorator/metadata footguns.
 */
export class MetricCollectorFactory implements MetricCollectorFactoryContract {
  readonly #generateExecutionId: () => string;
  readonly #now: () => Date;

  constructor(options?: { generateExecutionId?: () => string; now?: () => Date }) {
    this.#generateExecutionId = options?.generateExecutionId ?? uuidV4;
    this.#now = options?.now ?? (() => new Date());
  }

  public create(): MetricCollector {
    return new MetricCollectorImpl({
      executionId: this.#generateExecutionId(),
      startedAt: this.#now(),
    });
  }
}
