/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ServiceIdentifier } from 'inversify';
import type { RuleExecutionEvent } from './types';

/**
 * Observer of rule-execution events.
 *
 * Implementations subscribe to the event stream emitted by the pipeline
 * (lifecycle events) and by steps/services (domain events). Each observer
 * decides which `kind`s it cares about and ignores the rest.
 *
 * Contract:
 * - `onEvent` MUST be synchronous and SHOULD be fast. Observers that need
 *   I/O (e.g. event-log writes) should perform it as fire-and-forget,
 *   queue internally, or use a sink that handles its own batching.
 * - `onEvent` MUST NOT throw. If it does, the {@link RuleExecutionObserverHub}
 *   logs a warning and continues to the next observer; the rule execution
 *   itself is unaffected.
 * - Observers that maintain per-execution state (e.g. accumulators) should
 *   key off `event.executionUuid` and clean up on a terminal event
 *   (`execution_completed`, `execution_failed`, `execution_cancelled`).
 *   The pipeline guarantees exactly one terminal event per `execution_started`.
 */
export interface RuleExecutionObserver {
  readonly name: string;
  onEvent(event: RuleExecutionEvent): void;
}

/**
 * Multi-injection token for {@link RuleExecutionObserver} bindings.
 *
 * Add a new observer with:
 *   `bind(RuleExecutionObserverToken).to(MyObserver).inSingletonScope();`
 * The {@link RuleExecutionObserverHub} resolves all bindings and fans
 * each event out to every observer.
 */
export const RuleExecutionObserverToken = Symbol.for(
  'alerting_v2.RuleExecutionObserver'
) as ServiceIdentifier<RuleExecutionObserver>;
