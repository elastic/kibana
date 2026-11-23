/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Instruments are created once at module load, so the meter is replaced before `./metrics` is
// imported. The registries live inside the factory closure to stay clear of the temporal dead
// zone that module-scope consts would hit when the factory runs.
jest.mock('@opentelemetry/api', () => {
  const actual = jest.requireActual('@opentelemetry/api');
  const counters = new Map<string, { add: jest.Mock }>();
  const histograms = new Map<string, { record: jest.Mock }>();
  const histogramOptions = new Map<string, import('@opentelemetry/api').MetricOptions>();

  return {
    ...actual,
    __counters: counters,
    __histograms: histograms,
    __histogramOptions: histogramOptions,
    metrics: {
      getMeter: jest.fn(() => ({
        createCounter: (name: string) => {
          const instrument = { add: jest.fn() };
          counters.set(name, instrument);
          return instrument;
        },
        createHistogram: (name: string, options: import('@opentelemetry/api').MetricOptions) => {
          const instrument = { record: jest.fn() };
          histograms.set(name, instrument);
          histogramOptions.set(name, options);
          return instrument;
        },
      })),
    },
  };
});

import type { MetricOptions } from '@opentelemetry/api';
import * as otel from '@opentelemetry/api';
import { entityStoreMetrics } from './metrics';

const {
  __counters: counters,
  __histograms: histograms,
  __histogramOptions: histogramOptions,
} = otel as unknown as {
  __counters: Map<string, { add: jest.Mock }>;
  __histograms: Map<string, { record: jest.Mock }>;
  __histogramOptions: Map<string, MetricOptions>;
};

const registeredNames = () => [...counters.keys(), ...histograms.keys()];

describe('entityStoreMetrics', () => {
  it('registers under the kibana.entity_store meter scope', () => {
    expect(otel.metrics.getMeter).toHaveBeenCalledWith('kibana.entity_store');
  });

  it('fully qualifies every instrument name', () => {
    const names = registeredNames();

    expect(names.length).toBeGreaterThan(0);
    expect(names.filter((name) => !name.startsWith('kibana.entity_store.'))).toEqual([]);
  });

  it('registers the dual-process health instruments', () => {
    expect(registeredNames()).toEqual(
      expect.arrayContaining([
        'kibana.entity_store.extraction.lag_ms',
        'kibana.entity_store.extraction.logs_cap.utilization',
        'kibana.entity_store.extraction.task.duration_ms',
        'kibana.entity_store.extraction.entities.created',
        'kibana.entity_store.extraction.entities.updated',
        'kibana.entity_store.extraction.entities.noop',
      ])
    );
  });

  it('registers the slice-shape instruments', () => {
    expect(registeredNames()).toEqual(
      expect.arrayContaining([
        'kibana.entity_store.extraction.slice.count',
        'kibana.entity_store.extraction.slice.entities',
        'kibana.entity_store.extraction.slice.raw_target',
      ])
    );
  });

  it('no longer registers the ambiguous entities.upserted counter', () => {
    // Replaced by the created/updated/noop split: one counter could not say whether a process
    // was discovering entities or re-touching ones the other process already covered.
    expect(registeredNames()).not.toContain('kibana.entity_store.extraction.entities.upserted');
  });

  it('forwards value and attributes to the underlying counter unchanged', () => {
    const attributes = {
      entity_type: 'user' as const,
      namespace: 'default',
      extraction_mode: 'nonPriority' as const,
      remote: true,
    };

    entityStoreMetrics.extractionTaskSuccess.add(1, attributes);

    expect(counters.get('kibana.entity_store.extraction.task.success')?.add).toHaveBeenCalledWith(
      1,
      attributes
    );
  });

  it('forwards value and attributes to the underlying histogram unchanged', () => {
    const attributes = {
      entity_type: 'host' as const,
      namespace: 'space-1',
      extraction_mode: 'priority' as const,
      remote: false,
    };

    entityStoreMetrics.extractionLagMs.record(4200, attributes);

    expect(histograms.get('kibana.entity_store.extraction.lag_ms')?.record).toHaveBeenCalledWith(
      4200,
      attributes
    );
  });

  describe('explicit bucket boundaries', () => {
    // Without these, every histogram falls back to the SDK's generic default
    // boundaries (~0-10000), which silently clips any real value above that
    // (e.g. extraction.lag_ms, which must be able to represent hours of
    // backlog) and is far too coarse for fraction metrics in [0, 1].
    const boundariesFor = (name: string) =>
      histogramOptions.get(name)?.advice?.explicitBucketBoundaries;

    it('gives duration histograms boundaries beyond the SDK default ceiling', () => {
      const durationMetricNames = [
        'kibana.entity_store.extraction.task.duration_ms',
        'kibana.entity_store.extraction.query.duration_ms',
        'kibana.entity_store.extraction.ingest.duration_ms',
        'kibana.entity_store.extraction.probe_query.duration_ms',
      ];

      for (const name of durationMetricNames) {
        const boundaries = boundariesFor(name);
        expect(boundaries?.length).toBeGreaterThan(0);
        expect(Math.max(...boundaries!)).toBeGreaterThan(10000);
      }
    });

    it('gives extraction.lag_ms boundaries spanning hours, not just seconds', () => {
      const boundaries = boundariesFor('kibana.entity_store.extraction.lag_ms');

      expect(boundaries?.length).toBeGreaterThan(0);
      // Must be able to distinguish a stalled process (hours of lag) from a
      // healthy one, not clip both to the same ceiling value.
      expect(Math.max(...boundaries!)).toBeGreaterThanOrEqual(3600000);
    });

    it('gives fraction-valued histograms boundaries bounded to [0, 1]', () => {
      const fractionMetricNames = [
        'kibana.entity_store.extraction.logs_cap.utilization',
        'kibana.entity_store.extraction.sample.probability',
      ];

      for (const name of fractionMetricNames) {
        const boundaries = boundariesFor(name);
        expect(boundaries?.length).toBeGreaterThan(0);
        for (const boundary of boundaries!) {
          expect(boundary).toBeGreaterThanOrEqual(0);
          expect(boundary).toBeLessThanOrEqual(1);
        }
      }
    });

    it('gives extraction.logs.processed count-shaped boundaries, not duration-shaped ones', () => {
      const boundaries = boundariesFor('kibana.entity_store.extraction.logs.processed');

      expect(boundaries?.length).toBeGreaterThan(0);
      expect(Math.max(...boundaries!)).toBeGreaterThanOrEqual(100000);
    });

    it('gives extraction.task.duration_ms its own boundaries, distinct from the sub-operation timers', () => {
      const taskBoundaries = boundariesFor('kibana.entity_store.extraction.task.duration_ms')!;
      const queryBoundaries = boundariesFor('kibana.entity_store.extraction.query.duration_ms')!;

      expect(taskBoundaries).not.toEqual(queryBoundaries);
      const between10And60Seconds = taskBoundaries.filter((b) => b > 10000 && b < 60000);
      expect(between10And60Seconds.length).toBeGreaterThanOrEqual(4);
    });

    it('gives extraction.lag_ms finer resolution between one and five minutes', () => {
      const boundaries = boundariesFor('kibana.entity_store.extraction.lag_ms')!;

      const betweenOneAndFiveMinutes = boundaries.filter((b) => b > 60000 && b < 300000);
      expect(betweenOneAndFiveMinutes.length).toBeGreaterThanOrEqual(3);
    });

    it('gives extraction.logs.processed finer resolution around the default per-window cap', () => {
      const boundaries = boundariesFor('kibana.entity_store.extraction.logs.processed')!;

      const nearTheDefaultCap = boundaries.filter((b) => b > 70000 && b < 100000);
      expect(nearTheDefaultCap.length).toBeGreaterThanOrEqual(3);
    });

    it('gives extraction.slice.entities resolution around the default entity page size', () => {
      const boundaries = boundariesFor('kibana.entity_store.extraction.slice.entities')!;

      // The metric exists to say whether a slice fills an entity page or leaves most of it
      // empty, so the default docsLimit must be a boundary rather than fall inside a bucket.
      expect(boundaries).toContain(10000);
      const belowTheDefaultPage = boundaries.filter((b) => b > 0 && b < 10000);
      expect(belowTheDefaultPage.length).toBeGreaterThanOrEqual(4);
    });

    it('gives extraction.slice.raw_target boundaries above the default per-slice target', () => {
      const boundaries = boundariesFor('kibana.entity_store.extraction.slice.raw_target')!;

      // A sampled slice can be scaled well past the default maxLogsPerPage, so the histogram
      // must keep resolving above it instead of clipping every scaled slice into one bucket.
      expect(boundaries).toContain(50000);
      expect(Math.max(...boundaries)).toBeGreaterThanOrEqual(1000000);
      const aboveTheDefaultTarget = boundaries.filter((b) => b > 50000);
      expect(aboveTheDefaultTarget.length).toBeGreaterThanOrEqual(4);
    });

    it('resolves fraction histograms to two decimal places near the sampling floor', () => {
      const boundaries = boundariesFor('kibana.entity_store.extraction.sample.probability')!;

      // Coarse buckets report a bucket centre rather than the configured value, so a 0.2 override
      // reads back as 0.175 and looks like it never took effect. Every step between the 0.1 floor
      // and 0.2 must therefore be no wider than 0.01.
      const nearTheFloor = boundaries.filter((b) => b >= 0.1 && b <= 0.2);
      for (let i = 1; i < nearTheFloor.length; i++) {
        expect(nearTheFloor[i] - nearTheFloor[i - 1]).toBeLessThanOrEqual(0.0101);
      }
      expect(boundaries).toContain(0.2);
    });

    it('resolves slice entity counts around each multiple of the default page size', () => {
      const boundaries = boundariesFor('kibana.entity_store.extraction.slice.entities')!;

      // Whether a slice fills one page, two or three is the signal, so each page multiple needs a
      // boundary rather than falling inside a bucket spanning several of them.
      for (const pageMultiple of [10000, 20000, 30000]) {
        expect(boundaries).toContain(pageMultiple);
      }
    });

    it('resolves the slice raw target across every decade it can be scaled into', () => {
      const boundaries = boundariesFor('kibana.entity_store.extraction.slice.raw_target')!;

      // The applied scale factor is read from this histogram, so each decade above the default
      // per-slice target needs several boundaries rather than one.
      for (const [low, high] of [
        [50000, 500000],
        [500000, 5000000],
      ]) {
        expect(boundaries.filter((b) => b > low && b < high).length).toBeGreaterThanOrEqual(4);
      }
    });

    it('resolves task duration on both sides of the extraction timeout', () => {
      const boundaries = boundariesFor('kibana.entity_store.extraction.task.duration_ms')!;

      // Which side of the 59s timeout the tail sits on separates a completed run from an abort.
      expect(boundaries.filter((b) => b >= 50000 && b <= 60000).length).toBeGreaterThanOrEqual(3);
    });

    it('gives fraction histograms finer resolution between the sampling floor and 0.5', () => {
      const boundaries = boundariesFor('kibana.entity_store.extraction.sample.probability')!;

      const aboveFloorBelowHalf = boundaries.filter((b) => b > 0.1 && b < 0.5);
      expect(aboveFloorBelowHalf.length).toBeGreaterThanOrEqual(4);
    });
  });
});
