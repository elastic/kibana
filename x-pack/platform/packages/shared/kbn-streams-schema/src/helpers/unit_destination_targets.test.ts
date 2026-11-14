/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getPrometheusDataStream,
  getSignalTargetsWritePatterns,
  getUnitDestinationSignalTargets,
  getUnitDestinationWritePatterns,
  readUnitDestinationSignals,
  type UnitDestination,
} from './unit_destination_targets';

const elasticsearch = (
  config: UnitDestination['config'],
  telemetry: string[] = ['logs']
): UnitDestination =>
  ({
    id: 'es',
    name: 'ES',
    type: 'elasticsearch',
    supported_telemetry: telemetry,
    config,
  } as UnitDestination);

describe('getUnitDestinationWritePatterns', () => {
  it('returns nothing for non-elasticsearch destinations', () => {
    expect(
      getUnitDestinationWritePatterns({
        id: 'debug-out',
        name: 'Debug',
        type: 'debug',
        supported_telemetry: ['logs'],
      } as UnitDestination)
    ).toEqual([]);
  });

  it('uses a static index when present', () => {
    expect(
      getUnitDestinationWritePatterns(
        elasticsearch([{ name: 'index', value: 'logs-app-default' }], ['logs'])
      )
    ).toEqual(['logs-app-default']);
  });

  it('uses write_patterns for auto destinations', () => {
    expect(
      getUnitDestinationWritePatterns(
        elasticsearch([{ name: 'write_patterns', value: ['logs-*-*', 'metrics-*-*'] }])
      )
    ).toEqual(['logs-*-*', 'metrics-*-*']);
    expect(
      getUnitDestinationWritePatterns(
        elasticsearch([{ name: 'write_patterns', value: 'logs-billing-*' }])
      )
    ).toEqual(['logs-billing-*']);
  });

  it('reads a telemetry-scoped index per signal', () => {
    expect(
      getUnitDestinationWritePatterns(
        elasticsearch(
          [
            { name: 'index', telemetry: ['logs'], value: 'logs-app-default' },
            { name: 'index', telemetry: ['traces'], value: 'traces-app-default' },
          ],
          ['logs', 'traces']
        )
      )
    ).toEqual(['logs-app-default', 'traces-app-default']);
  });

  it('reads telemetry-scoped write_patterns per signal', () => {
    expect(
      getUnitDestinationWritePatterns(
        elasticsearch(
          [
            { name: 'write_patterns', telemetry: ['logs'], value: ['logs-nginx-*'] },
            { name: 'write_patterns', telemetry: ['metrics'], value: ['metrics-nginx-*'] },
          ],
          ['logs', 'metrics']
        )
      )
    ).toEqual(['logs-nginx-*', 'metrics-nginx-*']);
  });

  it('prefers a scoped entry over an unscoped one and routes unindexed signals dynamically', () => {
    expect(
      getUnitDestinationWritePatterns(
        elasticsearch(
          [
            { name: 'index', value: 'logs-app-default' },
            { name: 'index', telemetry: ['metrics'], value: 'metrics-app-default' },
          ],
          ['logs', 'metrics']
        )
      )
    ).toEqual(['logs-app-default', 'metrics-app-default', 'metrics-app.prometheus-default']);
    expect(
      getUnitDestinationWritePatterns(
        elasticsearch(
          [{ name: 'index', telemetry: ['logs'], value: 'logs-app-default' }],
          ['logs', 'metrics']
        )
      )
    ).toEqual(['logs-app-default', 'metrics-*-*']);
  });

  describe('mixed index and write_patterns configs', () => {
    it('resolves the static index of a signal that also has write_patterns', () => {
      expect(
        getUnitDestinationWritePatterns(
          elasticsearch(
            [
              { name: 'index', telemetry: ['logs'], value: 'logs-app.otel-default' },
              { name: 'write_patterns', telemetry: ['logs'], value: ['logs-app.otel-*'] },
            ],
            ['logs']
          )
        )
      ).toEqual(['logs-app.otel-default']);
    });

    it('resolves each signal from its own kind of config', () => {
      expect(
        getUnitDestinationWritePatterns(
          elasticsearch(
            [
              { name: 'index', telemetry: ['logs'], value: 'logs-app-default' },
              { name: 'write_patterns', telemetry: ['metrics'], value: ['metrics-app-*'] },
            ],
            ['logs', 'metrics', 'traces']
          )
        )
      ).toEqual(['logs-app-default', 'metrics-app-*', 'traces-*-*']);
    });

    it('applies an unscoped index to every signal without a scoped one', () => {
      expect(
        getUnitDestinationWritePatterns(
          elasticsearch(
            [
              { name: 'index', value: 'logs-shared-default' },
              { name: 'index', telemetry: ['metrics'], value: 'metrics-app-default' },
              { name: 'write_patterns', telemetry: ['traces'], value: ['traces-billing-*'] },
            ],
            ['logs', 'metrics', 'traces']
          )
        )
      ).toEqual(['logs-shared-default', 'metrics-app-default', 'metrics-app.prometheus-default']);
    });

    it('applies unscoped write_patterns to signals without an index', () => {
      expect(
        getUnitDestinationWritePatterns(
          elasticsearch(
            [
              { name: 'index', telemetry: ['logs'], value: 'logs-app-default' },
              { name: 'write_patterns', value: ['metrics-app-*', 'traces-app-*'] },
            ],
            ['logs', 'metrics', 'traces']
          )
        )
      ).toEqual(['logs-app-default', 'metrics-app-*', 'traces-app-*']);
    });

    it('treats an entry with empty telemetry as unscoped', () => {
      expect(
        getUnitDestinationWritePatterns(
          elasticsearch([{ name: 'index', telemetry: [], value: 'logs-app-default' }], ['logs'])
        )
      ).toEqual(['logs-app-default']);
    });

    it('ignores values of the wrong type', () => {
      expect(
        getUnitDestinationWritePatterns(
          elasticsearch(
            [
              { name: 'index', telemetry: ['logs'], value: 42 },
              { name: 'write_patterns', telemetry: ['logs'], value: [7, ' ', 'logs-app-*'] },
            ],
            ['logs']
          )
        )
      ).toEqual(['logs-app-*']);
    });
  });

  it('falls back to signal auto patterns when neither index nor write_patterns is set', () => {
    expect(getUnitDestinationWritePatterns(elasticsearch([], ['logs', 'traces']))).toEqual([
      'logs-*-*',
      'traces-*-*',
    ]);
  });

  it('falls back to every docs prefix for docs without index or write_patterns', () => {
    expect(getUnitDestinationWritePatterns(elasticsearch([], ['logs', 'docs']))).toEqual([
      'logs-*-*',
      'logs-*',
      'metrics-*',
      'traces-*',
    ]);
  });
});

describe('getUnitDestinationSignalTargets', () => {
  it('reads trimmed per-signal index and write_patterns', () => {
    expect(
      getUnitDestinationSignalTargets(
        elasticsearch(
          [
            { name: 'index', telemetry: ['logs'], value: ' logs-app-default ' },
            { name: 'write_patterns', telemetry: ['metrics'], value: 'metrics-a-*, metrics-b-*' },
          ],
          ['logs', 'metrics']
        )
      )
    ).toEqual({
      signals: ['logs', 'metrics'],
      indexBySignal: { logs: 'logs-app-default' },
      writePatternsBySignal: { metrics: ['metrics-a-*', 'metrics-b-*'] },
    });
  });
});

describe('readUnitDestinationSignals', () => {
  it('keeps logs, metrics, traces and docs', () => {
    expect(readUnitDestinationSignals(elasticsearch([], ['logs', 'docs', 'profiles']))).toEqual([
      'logs',
      'docs',
    ]);
  });

  it('applies an unscoped index to docs', () => {
    const docsOnly = elasticsearch([{ name: 'index', value: 'logs-app-default' }], ['docs']);
    expect(getUnitDestinationSignalTargets(docsOnly).indexBySignal).toEqual({
      docs: 'logs-app-default',
    });
    expect(getUnitDestinationWritePatterns(docsOnly)).toEqual(['logs-app-default']);
  });
});

describe('getPrometheusDataStream', () => {
  it.each([
    // streams-transpiler split
    ['metrics-billing.otel-default', 'metrics-billing.prometheus-default'],
    ['metrics-billing.prometheus-default', 'metrics-billing.prometheus-default'],
    ['metrics-billing-default', 'metrics-billing.prometheus-default'],
    ['metrics-billing.otel-prod-eu', 'metrics-billing.prometheus-prod-eu'],
    // Elasticsearch sanitization
    ['metrics-a.b-c-prod', 'metrics-a.b_c.prometheus-prod'],
    ['metrics-Bad.otel-x#y', 'metrics-bad.prometheus-x_y'],
    [`metrics-${'a'.repeat(101)}.otel-default`, `metrics-${'a'.repeat(100)}.prometheus-default`],
    // default endpoint
    ['metrics-billing', 'metrics-generic.prometheus-default'],
    ['metrics-..-default', 'metrics-generic.prometheus-default'],
    ['metrics-billing.otel-', 'metrics-generic.prometheus-default'],
    ['my-metrics', 'metrics-generic.prometheus-default'],
  ])('%s -> %s', (index, expected) => {
    expect(getPrometheusDataStream(index)).toBe(expected);
  });
});

describe('getSignalTargetsWritePatterns', () => {
  const targets = (indexBySignal: Partial<Record<'logs' | 'metrics', string>>) =>
    getSignalTargetsWritePatterns({
      signals: ['logs', 'metrics'].filter((signal): signal is 'logs' | 'metrics' =>
        Object.hasOwn(indexBySignal, signal)
      ),
      indexBySignal,
      writePatternsBySignal: {},
    });

  it('adds the Prometheus remote write data stream to a fixed metrics index', () => {
    expect(targets({ metrics: 'metrics-billing.otel-default' })).toEqual([
      'metrics-billing.otel-default',
      'metrics-billing.prometheus-default',
    ]);
  });

  it('adds it once', () => {
    expect(targets({ metrics: 'metrics-billing.prometheus-default' })).toEqual([
      'metrics-billing.prometheus-default',
    ]);
  });

  it('leaves other signals alone', () => {
    expect(targets({ logs: 'logs-billing.otel-default' })).toEqual(['logs-billing.otel-default']);
  });
});
