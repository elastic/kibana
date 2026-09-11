/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { performance } from 'perf_hooks';

import { computeJsonPatch } from '../../../server/audit/saved_object_diff';

type Attrs = Record<string, unknown>;

/** Nested plain objects, about five leaves per panel; mirrors the OOM Scout suite's shape. */
export const buildNested = (panelCount: number, salt = ''): Attrs => {
  const panels: Attrs = {};
  for (let i = 0; i < panelCount; i++) {
    panels[`p${i}`] = {
      title: `Panel ${i}${salt}`,
      vis: { type: 'histogram', params: { buckets: i, label: `bucket-${i}`, enabled: true } },
    };
  }
  return { title: `nested${salt}`, description: 'd', panels };
};

/** Array of objects, optionally with every element's key order shuffled (equal values). */
export const buildArrayOfObjects = (count: number, reorderKeys: boolean): Attrs => {
  const items = Array.from({ length: count }, (_, i) =>
    reorderKeys
      ? { gridData: { y: i, x: 0, w: 24, h: 15 }, id: `panel-${i}`, type: 'lens', version: '8.0.0' }
      : { id: `panel-${i}`, type: 'lens', version: '8.0.0', gridData: { x: 0, y: i, w: 24, h: 15 } }
  );
  return { title: 'dash', panels: items };
};

/** Lens-like: moderately nested state plus one large string attribute. */
export const buildLensLike = (layerCount: number, bigStringKb: number, salt = ''): Attrs => {
  const layers: Attrs = {};
  for (let i = 0; i < layerCount; i++) {
    layers[`layer-${i}`] = {
      columnOrder: [`c${i}a`, `c${i}b`, `c${i}c`],
      columns: {
        [`c${i}a`]: {
          operationType: 'terms',
          sourceField: 'host.name',
          params: { size: 5, orderBy: { type: 'column' } },
        },
        [`c${i}b`]: { operationType: 'count', label: `Count ${i}${salt}` },
        [`c${i}c`]: {
          operationType: 'average',
          sourceField: 'bytes',
          params: { format: { id: 'bytes' } },
        },
      },
      incompleteColumns: {},
    };
  }
  return {
    title: `lens${salt}`,
    visualizationType: 'lnsXY',
    state: {
      datasourceStates: { formBased: { layers } },
      filters: [],
      query: { query: '', language: 'kuery' },
    },
    panelsJSON: 'x'.repeat(bigStringKb * 1024),
  };
};

export interface Scenario {
  iterations: number;
  a: Attrs;
  b: Attrs;
  fieldSizeLimit?: number;
  fieldsToRedact?: string[];
}

/** Runs the scenario and returns per-call timing, output size, and (with --expose-gc) memory metrics. */
export const runScenario = ({ iterations, a, b, fieldSizeLimit, fieldsToRedact }: Scenario) => {
  computeJsonPatch({ a, b, fieldSizeLimit, fieldsToRedact }); // warm-up
  const start = performance.now();
  let patch = computeJsonPatch({ a, b, fieldSizeLimit, fieldsToRedact });
  for (let i = 1; i < iterations; i++) {
    patch = computeJsonPatch({ a, b, fieldSizeLimit, fieldsToRedact });
  }
  const totalMs = performance.now() - start;
  const eventBytes = Buffer.byteLength(JSON.stringify(patch), 'utf8');

  // allocated = heap growth of one call before GC; retained = heap held after GC while the result lives.
  const gc = (globalThis as { gc?: () => void }).gc;
  let allocatedBytes = 0;
  let retainedBytes = 0;
  if (gc) {
    gc();
    const baseline = process.memoryUsage().heapUsed;
    const held = computeJsonPatch({ a, b, fieldSizeLimit, fieldsToRedact });
    allocatedBytes = process.memoryUsage().heapUsed - baseline;
    gc();
    retainedBytes = process.memoryUsage().heapUsed - baseline;
    if (held.ops.length < 0) throw new Error('unreachable'); // keeps `held` alive across the gc
  }
  return {
    metrics: {
      ms_per_call: {
        title: 'ms per computeJsonPatch call',
        value: totalMs / iterations,
        format: 'duration' as const,
      },
      ops: { title: 'ops emitted', value: patch.ops.length, format: 'number' as const },
      no_ops: { title: 'noOps emitted', value: patch.noOps.length, format: 'number' as const },
      event_bytes: {
        title: 'serialized kibana.diff size',
        value: eventBytes,
        format: 'size' as const,
      },
      allocated_bytes: {
        title: 'heap allocated by one call (pre-GC)',
        value: allocatedBytes,
        format: 'size' as const,
      },
      retained_bytes: {
        title: 'heap retained by the result (post-GC)',
        value: retainedBytes,
        format: 'size' as const,
      },
    },
  };
};

/** Builds a `@kbn/bench` module runnable (exported as `config`) for a scenario. */
export const makeBenchmark = (build: () => Scenario) => async () => {
  const scenario = build();
  return {
    async run() {
      return runScenario(scenario);
    },
  };
};
