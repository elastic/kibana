/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Attributes, MetricOptions } from '@opentelemetry/api';
import { metrics, ValueType } from '@opentelemetry/api';

import type { EntityType, ExtractionMode } from '../../common/domain/definitions/entity_schema';
import type { LogExtractionConfig } from '../domain/saved_objects/global_state/constants';

const SCOPE = 'kibana.entity_store';

// Meter scope — sets scope.name in the OTLP document.
// Metric names passed to create*() are fully-qualified (not auto-prefixed by the meter name).
const meter = metrics.getMeter(SCOPE);

const m = (name: string) => `${SCOPE}.${name}`;

// TODO: add explicit bucket boundaries (advice.explicitBucketBoundaries) to all histograms
// once real data is available to inform the right distribution ranges.

/**
 * Attributes every extraction metric carries.
 *
 * `extraction_mode` is required rather than optional on purpose: two tasks now extract for the
 * same entity type, and a call site that omits the label silently merges them into one series.
 * Making it part of the instrument's type turns that omission into a compile error.
 */
export interface ExtractionAttributes {
  entity_type: EntityType;
  namespace: string;
  extraction_mode: ExtractionMode;
  remote: boolean;
}

type CapBehavior = LogExtractionConfig['maxLogsPerWindowCapBehavior'];

/** Constructs a fully-typed ExtractionAttributes object. Shared so task and client never diverge. */
export const buildExtractionAttributes = (
  entity_type: EntityType,
  namespace: string,
  extraction_mode: ExtractionMode,
  remote: boolean
): ExtractionAttributes => ({ entity_type, namespace, extraction_mode, remote });

export interface TypedCounter<A> {
  add(value: number, attributes: A): void;
}

export interface TypedHistogram<A> {
  record(value: number, attributes: A): void;
}

/**
 * Counter whose attributes are checked against `A` instead of the OTel catch-all `Attributes`,
 * so a call site that forgets `extraction_mode` fails to compile and attribute typos are caught
 * by excess-property checking.
 *
 * `A` is deliberately unconstrained. Constraining it to `Attributes` would reject every
 * interface, because TypeScript grants the implicit index signature `Attributes` requires to
 * type aliases only. That leaves one widening cast, here, rather than at each call site.
 */
const counter = <A>(name: string, options: MetricOptions): TypedCounter<A> => {
  const instrument = meter.createCounter(name, options);
  return { add: (value, attributes) => instrument.add(value, attributes as Attributes) };
};

/** Histogram whose attributes are checked against `A`. See `counter`. */
const histogram = <A>(name: string, options: MetricOptions): TypedHistogram<A> => {
  const instrument = meter.createHistogram(name, options);
  return { record: (value, attributes) => instrument.record(value, attributes as Attributes) };
};

export const entityStoreMetrics = {
  // --- Extraction task ---

  extractionTaskSuccess: counter<ExtractionAttributes>(m('extraction.task.success'), {
    description: 'Extraction task completed successfully',
    unit: '{task}',
    valueType: ValueType.INT,
  }),

  extractionTaskError: counter<ExtractionAttributes & { error_type: string }>(
    m('extraction.task.error'),
    {
      description: 'Unhandled exception escaping the extraction task run',
      unit: '{task}',
      valueType: ValueType.INT,
    }
  ),

  extractionTaskAborted: counter<ExtractionAttributes>(m('extraction.task.aborted'), {
    description: 'Task cancelled via abort signal before the extraction loop completed',
    unit: '{task}',
    valueType: ValueType.INT,
  }),

  extractionTaskDurationMs: histogram<ExtractionAttributes>(m('extraction.task.duration_ms'), {
    description:
      'Duration of the extraction step of one task run (excludes per-tick bootstrap work such as ensureScheduled). The two processes run on different cadences, so overlap between a long non-priority run and the next priority run is visible here',
    unit: 'ms',
    valueType: ValueType.DOUBLE,
  }),

  extractionLagMs: histogram<ExtractionAttributes>(m('extraction.lag_ms'), {
    description:
      'Distance between now and the point extraction resumes from, recorded at the end of every run including runs that processed no logs. Primary safety metric for the priority process: its "defer" cap behavior accumulates lag silently rather than dropping logs',
    unit: 'ms',
    valueType: ValueType.DOUBLE,
  }),

  // --- Sub-window loop (runMainPath) ---

  extractionLogsCapApplied: counter<ExtractionAttributes & { behavior: CapBehavior }>(
    m('extraction.logs_cap.applied'),
    {
      description:
        'Volume cap (maxLogsPerWindow) reached mid-window. drop = remaining logs permanently skipped. defer = cursor held, resumes next run',
      unit: '{event}',
      valueType: ValueType.INT,
    }
  ),

  extractionLogsCapUtilization: histogram<ExtractionAttributes>(
    m('extraction.logs_cap.utilization'),
    {
      description:
        'Fraction of the volume cap (maxLogsPerWindow) consumed by one run, in [0, 1]. Not recorded when the cap is disabled (maxLogsPerWindow = 0), because a recorded 0 is indistinguishable from an idle process',
      unit: '1',
      valueType: ValueType.DOUBLE,
    }
  ),

  extractionLogsProcessed: histogram<ExtractionAttributes>(m('extraction.logs.processed'), {
    description: 'Total raw log documents processed per task run across all sub-windows',
    unit: '{document}',
    valueType: ValueType.INT,
  }),

  // --- Slice + entity-page loops (runMainExtractionLoop / ingestEntityPagesWithinCurrentLogPage) ---

  extractionLogsPerPageDropped: counter<ExtractionAttributes>(
    m('extraction.logs_per_page.dropped'),
    {
      description:
        'Logs at a single timestamp exceeded maxLogsPerPage; docs beyond the page limit are permanently dropped to avoid an infinite loop',
      unit: '{event}',
      valueType: ValueType.INT,
    }
  ),

  extractionEntitiesCreated: counter<ExtractionAttributes>(m('extraction.entities.created'), {
    description: 'Entity documents that did not exist in the latest index before this upsert',
    unit: '{document}',
    valueType: ValueType.INT,
  }),

  extractionEntitiesUpdated: counter<ExtractionAttributes>(m('extraction.entities.updated'), {
    description: 'Existing entity documents modified by this upsert',
    unit: '{document}',
    valueType: ValueType.INT,
  }),

  extractionEntitiesNoop: counter<ExtractionAttributes>(m('extraction.entities.noop'), {
    description:
      'Entity documents the upsert left byte-identical. A high rate against created means the process is re-touching entities another process already covers',
    unit: '{document}',
    valueType: ValueType.INT,
  }),

  extractionBulkDropped: counter<ExtractionAttributes>(m('extraction.bulk.dropped'), {
    description:
      'Entity documents rejected by the ES bulk API during ingest (mapping error, version conflict, etc.)',
    unit: '{document}',
    valueType: ValueType.INT,
  }),

  extractionQueryDurationMs: histogram<ExtractionAttributes>(m('extraction.query.duration_ms'), {
    description:
      'Duration of each bounded extraction ESQL query (one per entity page within a log slice)',
    unit: 'ms',
    valueType: ValueType.DOUBLE,
  }),

  extractionIngestDurationMs: histogram<ExtractionAttributes>(m('extraction.ingest.duration_ms'), {
    description: 'Duration of each ingestEntities bulk write call',
    unit: 'ms',
    valueType: ValueType.DOUBLE,
  }),

  extractionProbeQueryDurationMs: histogram<ExtractionAttributes>(
    m('extraction.probe_query.duration_ms'),
    {
      description:
        'Duration of each probe ESQL query that finds the cursor boundary of the next log slice',
      unit: 'ms',
      valueType: ValueType.DOUBLE,
    }
  ),

  // --- History snapshot (history_snapshot_client.ts) ---
  // Single-process, so these keep the untyped OTel surface and the namespace-only attribute set.

  historySnapshotSuccess: meter.createCounter(m('history_snapshot.success'), {
    description: 'History snapshot completed successfully',
    unit: '{task}',
    valueType: ValueType.INT,
  }),

  historySnapshotDocCount: meter.createHistogram(m('history_snapshot.doc_count'), {
    description: 'Entities copied from the latest index into the snapshot index per run',
    unit: '{document}',
    valueType: ValueType.INT,
  }),

  historySnapshotReindexDurationMs: meter.createHistogram(
    m('history_snapshot.reindex.duration_ms'),
    {
      description: 'Duration of the async reindex from latest to snapshot index',
      unit: 'ms',
      valueType: ValueType.DOUBLE,
    }
  ),

  historySnapshotResetDurationMs: meter.createHistogram(m('history_snapshot.reset.duration_ms'), {
    description: 'Duration of the updateByQuery that resets entity fields after snapshot',
    unit: 'ms',
    valueType: ValueType.DOUBLE,
  }),
};
