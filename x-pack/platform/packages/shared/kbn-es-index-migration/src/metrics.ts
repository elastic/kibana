/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { metrics, ValueType } from '@opentelemetry/api';
import type { Attributes, Counter, Gauge } from '@opentelemetry/api';
import type { Drift, ExecutionMode, ReconcileResult, ReconcileStatus } from './types';

export const METER_NAME = 'kibana.es_index_migration';

/**
 * Instruments are created once, at module load.
 *
 * Calling `getMeter` or `create*` per event would produce a fresh instrument each time
 * and silently break aggregation - the readings would never add up, with nothing
 * reporting an error.
 *
 * Names are fully qualified. The meter scope is not prefixed onto them, so a bare
 * `run.count` here would ship as `metrics.run.count` with the namespace lost.
 */
const meter = metrics.getMeter(METER_NAME);

const runCount: Counter = meter.createCounter(`${METER_NAME}.run.count`, {
  description:
    'Reconcile attempts, one per namespace. `outcome` separates a migration from an ' +
    'index that was already current, which is what distinguishes "nothing to do" from ' +
    '"the sweep never ran".',
  unit: '1',
  valueType: ValueType.INT,
});

/**
 * Gauge rather than histogram: a sweep runs hourly per plugin and a real migration
 * happens a handful of times in a deployment's life, so there are never enough samples
 * for a distribution to mean anything - and a histogram ships as a bucketed structure
 * that is awkward to aggregate across deployments.
 *
 * Recorded per sweep rather than per namespace. The question it answers is which
 * deployment is slowest, which does not need a namespace, and adding one would cost a
 * series per space.
 */
const runDuration: Gauge = meter.createGauge(`${METER_NAME}.run.duration`, {
  description:
    'How long the last sweep took. Filter to `outcome != up_to_date` before averaging - ' +
    'most sweeps are no-ops and would otherwise dominate the mean.',
  unit: 's',
  valueType: ValueType.DOUBLE,
});

/**
 * The alertable signal. Sustained above zero means a deployment is stuck, and until now
 * there was no way to see that at all.
 */
const versionsBehind: Gauge = meter.createGauge(`${METER_NAME}.versions_behind`, {
  description: 'How many versions behind a resource is. Zero means current.',
  unit: '1',
  valueType: ValueType.INT,
});

/**
 * A declared removal that Elasticsearch did not apply, because it never removes a mapped
 * field. The declaration and the index diverge from that point on, which is exactly the
 * kind of silent drift this library exists to surface.
 */
const driftCount: Counter = meter.createCounter(`${METER_NAME}.drift.count`, {
  description: 'Declared changes that were not applied, leaving the index out of step.',
  unit: '1',
  valueType: ValueType.INT,
});

/**
 * Intersected with OTel's `Attributes` for its index signature, while keeping each field
 * required - so a call site cannot quietly omit one and leave a series mislabelled.
 */
type RunAttributes = Attributes & {
  migration_id: string;
  execution_mode: ExecutionMode;
  namespace: string;
  outcome: ReconcileStatus;
  reason?: string;
};

/**
 * Records one reconcile.
 *
 * Attributes are derived from the result rather than assembled as the work proceeds, so
 * a failure path cannot report a value captured before it went wrong - the mistake that
 * makes Entity Store's `remote` attribute wrong on exactly the runs that matter.
 */
export const recordRun = (result: ReconcileResult, execution: ExecutionMode): void => {
  const attributes: RunAttributes = {
    migration_id: result.migrationId,
    execution_mode: execution,
    namespace: result.namespace,
    outcome: result.status,
    // Carried as an attribute rather than left to a log line, so a failure is
    // distinguishable from any other failure without reading one.
    ...(result.error ? { reason: result.error } : {}),
  };

  runCount.add(1, attributes);

  versionsBehind.record(Math.max(0, result.target - result.installed), {
    migration_id: result.migrationId,
    execution_mode: execution,
    namespace: result.namespace,
  });
};

/** Records how long a whole sweep took, and what it amounted to. */
export const recordSweep = (
  migrationId: string,
  execution: ExecutionMode,
  durationSeconds: number,
  results: ReconcileResult[]
): void => {
  runDuration.record(durationSeconds, {
    migration_id: migrationId,
    execution_mode: execution,
    outcome: summariseOutcome(results),
  });
};

/**
 * One outcome for a whole sweep.
 *
 * A failure anywhere makes the sweep a failure, and a sweep that changed nothing is
 * `up_to_date` - the per-namespace breakdown lives on `run.count`, which is why this can
 * afford to be lossy.
 */
const summariseOutcome = (results: ReconcileResult[]): ReconcileStatus => {
  if (results.some(({ status }) => status === 'failed')) return 'failed';
  if (results.some(({ status }) => status === 'created')) return 'created';
  if (results.some(({ status }) => status === 'migrated')) return 'migrated';
  return 'up_to_date';
};

export const recordDrift = (migrationId: string, namespace: string, drift: Drift[]): void => {
  drift.forEach(({ kind }) => {
    driftCount.add(1, { migration_id: migrationId, namespace, kind });
  });
};
