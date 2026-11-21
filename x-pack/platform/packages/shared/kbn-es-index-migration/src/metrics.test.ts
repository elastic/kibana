/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// The mocks live inside the factory because it is hoisted above this file's bindings and
// runs while `./metrics` is importing - instruments are created once at module load, so
// the meter has to be replaced before that happens.
jest.mock('@opentelemetry/api', () => {
  const add = jest.fn();
  const record = jest.fn();
  const createCounter = jest.fn(() => ({ add }));
  const createGauge = jest.fn(() => ({ record }));

  return {
    ...jest.requireActual('@opentelemetry/api'),
    metrics: { getMeter: jest.fn(() => ({ createCounter, createGauge })) },
  };
});

import { metrics } from '@opentelemetry/api';
import { METER_NAME, recordDrift, recordRun, recordSweep } from './metrics';
import type { Drift, ReconcileResult, ReconcileStatus } from './types';

// Recovered from the mocked module, since importing `./metrics` above already drove the
// one call to getMeter and the four create* calls.
const getMeter = metrics.getMeter as jest.Mock;
const { createCounter, createGauge } = getMeter.mock.results[0].value as {
  createCounter: jest.Mock;
  createGauge: jest.Mock;
};
const add = createCounter.mock.results[0].value.add as jest.Mock;
const record = createGauge.mock.results[0].value.record as jest.Mock;

const result = (overrides: Partial<ReconcileResult> = {}): ReconcileResult => ({
  migrationId: 'asset-criticality',
  resourceName: '.asset-criticality-default',
  namespace: 'default',
  status: 'migrated',
  installed: 1,
  target: 3,
  applied: [2, 3],
  ...overrides,
});

const nameOf = (mock: jest.Mock, call: number): string => mock.mock.calls[call][0];
const optsOf = (mock: jest.Mock, call: number) => mock.mock.calls[call][1];

beforeEach(() => {
  add.mockClear();
  record.mockClear();
});

describe('instrument definitions', () => {
  it('scopes the meter to the library', () => {
    expect(getMeter).toHaveBeenCalledWith(METER_NAME);
  });

  it('creates every instrument exactly once, at module load', () => {
    // Creating them per event would make a fresh instrument each time and silently
    // break aggregation, with nothing reporting an error.
    expect(createCounter).toHaveBeenCalledTimes(2);
    expect(createGauge).toHaveBeenCalledTimes(2);
  });

  it('fully qualifies every name, since the meter does not prefix them', () => {
    const names = [
      ...createCounter.mock.calls.map(([name]) => name),
      ...createGauge.mock.calls.map(([name]) => name),
    ];

    expect(names).toEqual([
      'kibana.es_index_migration.run.count',
      'kibana.es_index_migration.drift.count',
      'kibana.es_index_migration.run.duration',
      'kibana.es_index_migration.versions_behind',
    ]);
    names.forEach((name) => expect(name.startsWith(`${METER_NAME}.`)).toBe(true));
  });

  it('sets description, unit and valueType on each instrument', () => {
    [...createCounter.mock.calls, ...createGauge.mock.calls].forEach(([, options]) => {
      expect(options).toEqual(
        expect.objectContaining({
          description: expect.any(String),
          unit: expect.any(String),
          valueType: expect.any(Number),
        })
      );
    });
  });

  it('measures duration in seconds', () => {
    expect(optsOf(createGauge, 0).unit).toBe('s');
    expect(nameOf(createGauge, 0)).toContain('run.duration');
  });
});

describe('recordRun', () => {
  it('counts the run and reports the remaining gap', () => {
    recordRun(result({ installed: 1, target: 3 }), 'auto');

    expect(add).toHaveBeenCalledWith(1, expect.objectContaining({ outcome: 'migrated' }));
    expect(record).toHaveBeenCalledWith(2, expect.objectContaining({ namespace: 'default' }));
  });

  it('carries the identifying attributes on every run', () => {
    recordRun(result(), 'manual');

    expect(add).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        migration_id: 'asset-criticality',
        execution_mode: 'manual',
        namespace: 'default',
        outcome: 'migrated',
      })
    );
  });

  it.each(['up_to_date', 'created', 'migrated', 'failed'] as ReconcileStatus[])(
    'reports outcome "%s" using the same vocabulary as reconcile',
    (status) => {
      recordRun(result({ status }), 'auto');

      expect(add).toHaveBeenCalledWith(1, expect.objectContaining({ outcome: status }));
    }
  );

  it('carries the failure reason as an attribute, not only a log line', () => {
    recordRun(result({ status: 'failed', error: 'version 3: cannot update parameter' }), 'auto');

    // Without this, one failure is indistinguishable from any other in the metric.
    expect(add).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ reason: 'version 3: cannot update parameter' })
    );
  });

  it('omits reason when nothing failed', () => {
    recordRun(result({ status: 'up_to_date' }), 'auto');

    expect(add.mock.calls[0][1]).not.toHaveProperty('reason');
  });

  it('reports zero behind when the resource is current', () => {
    recordRun(result({ status: 'up_to_date', installed: 3, target: 3 }), 'auto');

    expect(record).toHaveBeenCalledWith(0, expect.anything());
  });

  it('never reports a negative gap', () => {
    recordRun(result({ installed: 5, target: 3 }), 'auto');

    expect(record).toHaveBeenCalledWith(0, expect.anything());
  });
});

describe('recordSweep', () => {
  it('records the duration once for the whole sweep, without a namespace', () => {
    recordSweep('asset-criticality', 'auto', 4.2, [result(), result({ namespace: 'team-a' })]);

    expect(record).toHaveBeenCalledTimes(1);
    expect(record).toHaveBeenCalledWith(4.2, expect.not.objectContaining({ namespace: 'default' }));
  });

  it.each([
    [['up_to_date', 'up_to_date'], 'up_to_date'],
    [['up_to_date', 'migrated'], 'migrated'],
    [['migrated', 'created'], 'created'],
    [['migrated', 'failed'], 'failed'],
    [['failed', 'up_to_date'], 'failed'],
  ] as Array<[ReconcileStatus[], ReconcileStatus]>)(
    'summarises %s as "%s"',
    (statuses, expected) => {
      recordSweep(
        'asset-criticality',
        'auto',
        1,
        statuses.map((status) => result({ status }))
      );

      expect(record).toHaveBeenCalledWith(1, expect.objectContaining({ outcome: expected }));
    }
  );
});

describe('recordDrift', () => {
  const drift: Drift[] = [
    { path: 'user.old_field', kind: 'field_removed', detail: 'not applied' },
    { path: 'user.other', kind: 'field_removed', detail: 'not applied' },
  ];

  it('counts each drifted field', () => {
    recordDrift('asset-criticality', 'default', drift);

    expect(add).toHaveBeenCalledTimes(2);
    expect(add).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        migration_id: 'asset-criticality',
        namespace: 'default',
        kind: 'field_removed',
      })
    );
  });

  it('records nothing when there is no drift', () => {
    recordDrift('asset-criticality', 'default', []);

    expect(add).not.toHaveBeenCalled();
  });
});
