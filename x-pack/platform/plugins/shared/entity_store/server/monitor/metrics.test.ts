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

  return {
    ...actual,
    __counters: counters,
    __histograms: histograms,
    metrics: {
      getMeter: jest.fn(() => ({
        createCounter: (name: string) => {
          const instrument = { add: jest.fn() };
          counters.set(name, instrument);
          return instrument;
        },
        createHistogram: (name: string) => {
          const instrument = { record: jest.fn() };
          histograms.set(name, instrument);
          return instrument;
        },
      })),
    },
  };
});

import * as otel from '@opentelemetry/api';
import { entityStoreMetrics } from './metrics';

const { __counters: counters, __histograms: histograms } = otel as unknown as {
  __counters: Map<string, { add: jest.Mock }>;
  __histograms: Map<string, { record: jest.Mock }>;
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
});
