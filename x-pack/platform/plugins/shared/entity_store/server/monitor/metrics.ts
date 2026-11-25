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

/**
 * Explicit bucket boundaries for histograms.
 *
 * Without these, the SDK falls back to one generic default boundary set applied to every
 * histogram regardless of its real unit and range. A metric whose real values commonly exceed
 * that default's ceiling loses all resolution above it, and a metric confined to a narrow range
 * like [0, 1] gets spaced far too coarsely to be meaningful. Each histogram below is given
 * boundaries sized to what it actually measures instead.
 */
const DURATION_MS_BOUNDARIES = [
  5, 10, 25, 50, 75, 100, 150, 200, 300, 400, 500, 750, 1000, 1250, 1500, 1750, 2000, 2500, 3000,
  3500, 4000, 5000, 6000, 7500, 10000, 15000, 20000, 30000, 45000, 60000,
];
// A whole task run is structurally longer than one sub-operation query, so it gets its own
// boundaries instead of collapsing into the last bucket or two of DURATION_MS_BOUNDARIES. Dense
// between 10s and 60s: that is where a run goes from healthy to crossing its time limit, and
// which side of 59s the tail sits on is the difference between a completed run and an abort.
const TASK_DURATION_MS_BOUNDARIES = [
  250, 500, 1000, 2000, 3000, 4000, 5000, 7500, 10000, 12500, 15000, 17500, 20000, 22500, 25000,
  27500, 30000, 32500, 35000, 40000, 45000, 50000, 55000, 57500, 59000, 60000, 65000, 75000, 90000,
  120000, 180000, 300000,
];
// Wider range for operations that scan/rewrite the whole entities index rather than one bounded
// extraction query, which can realistically run for minutes on a large store.
const LONG_DURATION_MS_BOUNDARIES = [
  100, 250, 500, 1000, 2500, 5000, 10000, 15000, 30000, 45000, 60000, 120000, 180000, 300000,
  450000, 600000, 900000, 1800000, 2700000, 3600000, 7200000,
];
// Finer resolution between one and five minutes, the range that distinguishes mild from
// meaningful lag.
const LAG_MS_BOUNDARIES = [
  1000, 5000, 10000, 15000, 20000, 30000, 45000, 60000, 75000, 90000, 105000, 120000, 150000,
  180000, 210000, 240000, 270000, 300000, 360000, 450000, 600000, 900000, 1200000, 1800000, 2700000,
  3600000, 7200000, 14400000, 21600000, 43200000, 86400000,
];
// Sampling rates and cap utilisation both live in [0, 1] and are read to two decimal places when
// tuning. Coarse buckets here report a bucket centre rather than the configured value - a 0.2
// override reading back as 0.175 - so the lower half, where adaptive rates and the 0.1 floor sit,
// is spaced at 0.01 and the upper half at 0.05.
const FRACTION_BOUNDARIES = [
  0, 0.05, 0.1, 0.11, 0.12, 0.13, 0.14, 0.15, 0.16, 0.17, 0.18, 0.19, 0.2, 0.22, 0.24, 0.26, 0.28,
  0.3, 0.32, 0.34, 0.36, 0.38, 0.4, 0.45, 0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95,
  0.99, 1,
];
// Finer resolution around the default per-window volume cap (100,000), where most runs land, and
// above it, where a run that overshoots the cap by part of a slice ends up.
const LOGS_COUNT_BOUNDARIES = [
  0, 100, 500, 1000, 2500, 5000, 10000, 20000, 30000, 40000, 50000, 60000, 70000, 80000, 90000,
  95000, 100000, 110000, 125000, 150000, 175000, 200000, 250000, 300000, 400000, 500000, 750000,
  1000000,
];
const ENTITY_COUNT_BOUNDARIES = [
  0, 100, 500, 1000, 5000, 10000, 50000, 100000, 250000, 500000, 1000000, 2500000, 5000000,
  10000000,
];
// Resolution around the default entity page size (docsLimit, 10,000): the question this answers is
// whether a slice's entities fit one page or spill into several, so the buckets cluster at the
// page size and at each multiple of it rather than spreading evenly.
const SLICE_ENTITY_COUNT_BOUNDARIES = [
  0, 50, 100, 250, 500, 1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000, 10000, 11000, 12500,
  15000, 17500, 20000, 25000, 30000, 40000, 50000, 75000, 100000,
];
// Spans the default per-slice raw target (maxLogsPerPage, 50,000) through the much larger targets
// a sampled slice can be scaled to. Each decade is subdivided so the scale factor a run actually
// applied is readable from the histogram rather than inferred from the configured rate.
const PAGE_TARGET_LOGS_BOUNDARIES = [
  1000, 5000, 10000, 25000, 50000, 75000, 100000, 125000, 150000, 200000, 250000, 300000, 400000,
  500000, 625000, 750000, 1000000, 1250000, 1500000, 2000000, 2500000, 5000000, 10000000,
];

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
    advice: { explicitBucketBoundaries: TASK_DURATION_MS_BOUNDARIES },
  }),

  extractionLagMs: histogram<ExtractionAttributes>(m('extraction.lag_ms'), {
    description:
      'Distance between now and the point extraction resumes from, recorded at the end of every run including runs that processed no logs. Primary safety metric for the priority process: its "defer" cap behavior accumulates lag silently rather than dropping logs',
    unit: 'ms',
    valueType: ValueType.DOUBLE,
    advice: { explicitBucketBoundaries: LAG_MS_BOUNDARIES },
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
      advice: { explicitBucketBoundaries: FRACTION_BOUNDARIES },
    }
  ),

  extractionLogsProcessed: histogram<ExtractionAttributes>(m('extraction.logs.processed'), {
    description:
      'Total log documents processed per task run across all sub-windows. Raw, unless dual-process sampling (FF on) is active, in which case sampled/processed volume',
    unit: '{document}',
    valueType: ValueType.INT,
    advice: { explicitBucketBoundaries: LOGS_COUNT_BOUNDARIES },
  }),

  extractionSampleEligibleRuns: counter<ExtractionAttributes & { sampled: boolean }>(
    m('extraction.sample.eligible_runs'),
    {
      description:
        'Scheduled runs of a sampling-capable non-priority process, labeled by whether any slice sampled. sampled:true / total = sampling adoption share',
      unit: '{run}',
      valueType: ValueType.INT,
    }
  ),

  // --- Slice + entity-page loops (runMainExtractionLoop / ingestEntityPagesWithinCurrentLogPage) ---

  extractionSampleProbability: histogram<ExtractionAttributes>(m('extraction.sample.probability'), {
    description:
      'Sampling rate applied to one raw-log slice, in [0.1, 1). Recorded only when the slice samples, so the distribution reflects applied rates only',
    unit: '1',
    valueType: ValueType.DOUBLE,
    advice: { explicitBucketBoundaries: FRACTION_BOUNDARIES },
  }),

  extractionSliceCount: counter<ExtractionAttributes>(m('extraction.slice.count'), {
    description:
      'Raw-log slices that ran an extraction, counted once per slice. Divided by extraction.task.success this gives slices per run, which the probe-query count can no longer stand in for once a slice may issue more than one probe. Stalled slices are excluded; they are counted by extraction.logs_per_page.dropped',
    unit: '{slice}',
    valueType: ValueType.INT,
  }),

  extractionSliceEntities: histogram<ExtractionAttributes>(m('extraction.slice.entities'), {
    description:
      'Entities produced by one raw-log slice, across all of its entity pages. Read against the configured docsLimit to tell whether a slice fills an entity page or leaves most of it empty',
    unit: '{entity}',
    valueType: ValueType.INT,
    advice: { explicitBucketBoundaries: SLICE_ENTITY_COUNT_BOUNDARIES },
  }),

  extractionSliceRawTarget: histogram<ExtractionAttributes>(m('extraction.slice.raw_target'), {
    description:
      'Raw log documents the boundary probe aimed to place in one slice (the effective maxLogsPerPage). Recorded once per slice that ran an extraction, sharing a denominator with extraction.slice.count so the two divide into a per-slice scale factor. Resumed slices are not represented: they re-enter persisted bounds without probing, so they have no target',
    unit: '{document}',
    valueType: ValueType.INT,
    advice: { explicitBucketBoundaries: PAGE_TARGET_LOGS_BOUNDARIES },
  }),

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
    advice: { explicitBucketBoundaries: DURATION_MS_BOUNDARIES },
  }),

  extractionIngestDurationMs: histogram<ExtractionAttributes>(m('extraction.ingest.duration_ms'), {
    description: 'Duration of each ingestEntities bulk write call',
    unit: 'ms',
    valueType: ValueType.DOUBLE,
    advice: { explicitBucketBoundaries: DURATION_MS_BOUNDARIES },
  }),

  extractionProbeQueryDurationMs: histogram<ExtractionAttributes>(
    m('extraction.probe_query.duration_ms'),
    {
      description:
        'Duration of each probe ESQL query that finds the cursor boundary of the next log slice',
      unit: 'ms',
      valueType: ValueType.DOUBLE,
      advice: { explicitBucketBoundaries: DURATION_MS_BOUNDARIES },
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
    advice: { explicitBucketBoundaries: ENTITY_COUNT_BOUNDARIES },
  }),

  historySnapshotReindexDurationMs: meter.createHistogram(
    m('history_snapshot.reindex.duration_ms'),
    {
      description: 'Duration of the async reindex from latest to snapshot index',
      unit: 'ms',
      valueType: ValueType.DOUBLE,
      advice: { explicitBucketBoundaries: LONG_DURATION_MS_BOUNDARIES },
    }
  ),

  historySnapshotResetDurationMs: meter.createHistogram(m('history_snapshot.reset.duration_ms'), {
    description: 'Duration of the updateByQuery that resets entity fields after snapshot',
    unit: 'ms',
    valueType: ValueType.DOUBLE,
    advice: { explicitBucketBoundaries: LONG_DURATION_MS_BOUNDARIES },
  }),
};
