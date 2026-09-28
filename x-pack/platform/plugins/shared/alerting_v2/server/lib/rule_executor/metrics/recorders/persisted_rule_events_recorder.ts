/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { injectable } from 'inversify';
import type { MetricCollectorWriter, MetricRecorder, MetricRecorderContext } from '../types';
import { RULE_EXECUTION_COUNTERS } from '../counters';
import type { BulkIndexObservationError } from '../../types';
import { alertEventType, type AlertEvent } from '../../../../resources/datastreams/alert_events';

/**
 * Domain-aware {@link MetricRecorder} that translates a bulk-write
 * observation from `store_alert_events` into rule-event counters, all derived
 * from what actually landed in Elasticsearch (never from what a step built in
 * memory):
 *
 * - `ruleEventsGenerated` / `signalsGenerated` come straight from the persisted
 *   documents on `meta.observations.bulkIndexResult.docs` (the latter filtered
 *   by `type`).
 * - `newEpisodesGenerated` is the one metric that needs a second input: which
 *   episodes are *new* is the director's knowledge, not a property of the doc.
 *   `DirectorStep` threads the freshly-opened episode ids on
 *   `state.newEpisodeIds`; here we count the persisted docs whose `episode.id`
 *   is one of them. A new episode whose rule event failed to index is absent
 *   from `docs`, so it is correctly not counted.
 *
 * Observes only `store_alert_events`, so the docs array is always an
 * `AlertEvent[]` at runtime (the emission-meta type widens to
 * `Record<string, unknown>` at the framework layer for reasons independent
 * of this recorder — see `EmissionObservations`). The narrow cast at
 * consumption is honest: the recorder's `observes` contract pins the
 * producer.
 */
const HTTP_CONFLICT = 409;

@injectable()
export class PersistedRuleEventsRecorder implements MetricRecorder {
  public readonly name = 'persisted_rule_events';
  public readonly observes = { stepName: 'store_alert_events' } as const;

  public record(collector: MetricCollectorWriter, { meta, state }: MetricRecorderContext): void {
    const bulkIndexResult = meta?.observations?.bulkIndexResult;
    if (!bulkIndexResult) {
      return;
    }

    const persistedDocs = bulkIndexResult.docs as readonly AlertEvent[];
    const newEpisodeIds = new Set(state.newEpisodeIds);

    const counts = {
      [RULE_EXECUTION_COUNTERS.ruleEventsDeduplicated]:
        bulkIndexResult.errors.filter(isDeduplicationConflict).length,
      [RULE_EXECUTION_COUNTERS.ruleEventsGenerated]: persistedDocs.length,
      [RULE_EXECUTION_COUNTERS.signalsGenerated]: persistedDocs.filter(
        (doc) => doc.type === alertEventType.signal
      ).length,
      [RULE_EXECUTION_COUNTERS.newEpisodesGenerated]: persistedDocs.filter(
        (doc) => doc.episode != null && newEpisodeIds.has(doc.episode.id)
      ).length,
    };

    Object.entries(counts)
      .filter(([, count]) => count > 0)
      .forEach(([counter, count]) => collector.increment(counter, count));
  }
}

/**
 * Whether a bulk rejection is the expected outcome of rule-event
 * deduplication rather than a failure.
 *
 * `StoreAlertEventsStep` writes every deduplicable event with a
 * deterministic `_id` on a `create` op; when that `_id` already exists
 * Elasticsearch answers 409 (`version_conflict_engine_exception`). Those
 * rejections are duplicates the `FilterDuplicateEventsStep` pre-check could
 * not see (typically written earlier in the same run) and are counted into
 * `ruleEventsDeduplicated`, never into a failure metric. Matching on the
 * status code rather than the exception name keeps this file free of a
 * dependency on storage-service error strings.
 */
const isDeduplicationConflict = (error: BulkIndexObservationError): boolean =>
  error.details?.statusCode === HTTP_CONFLICT;
