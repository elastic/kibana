/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { injectable } from 'inversify';
import type { MetricCollectorWriter, MetricRecorder, MetricRecorderContext } from '../types';
import { RULE_EXECUTION_COUNTERS } from '../counters';
import { alertEventType, type AlertEvent } from '../../../../resources/datastreams/alert_events';

/**
 * Domain-aware {@link MetricRecorder} that translates a bulk-write
 * observation from `store_alert_events` into rule-event counters.
 *
 * Reads the persisted documents directly from
 * `meta.observations.bulkIndexResult.docs` — no correlation against
 * pipeline state, no set diff, no reference-identity dependency. The
 * storage service reports exactly what landed in Elasticsearch and this
 * recorder counts it.
 *
 * Observes only `store_alert_events`, so the docs array is always an
 * `AlertEvent[]` at runtime (the emission-meta type widens to
 * `Record<string, unknown>` at the framework layer for reasons independent
 * of this recorder — see `EmissionObservations`). The narrow cast at
 * consumption is honest: the recorder's `observes` contract pins the
 * producer.
 */
@injectable()
export class PersistedRuleEventsRecorder implements MetricRecorder {
  public readonly name = 'persisted_rule_events';
  public readonly observes = { stepName: 'store_alert_events' } as const;

  public record(collector: MetricCollectorWriter, { meta }: MetricRecorderContext): void {
    const bulkIndexResult = meta?.observations?.bulkIndexResult;
    if (!bulkIndexResult || bulkIndexResult.docs.length === 0) {
      return;
    }

    const persistedDocs = bulkIndexResult.docs as readonly AlertEvent[];

    collector.increment(RULE_EXECUTION_COUNTERS.ruleEventsGenerated, persistedDocs.length);

    let signalsCount = 0;
    for (const doc of persistedDocs) {
      if (doc.type === alertEventType.signal) {
        signalsCount += 1;
      }
    }

    if (signalsCount > 0) {
      collector.increment(RULE_EXECUTION_COUNTERS.signalsGenerated, signalsCount);
    }
  }
}
