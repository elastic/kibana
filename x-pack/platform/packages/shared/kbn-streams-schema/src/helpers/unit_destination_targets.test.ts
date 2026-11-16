/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
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
    ).toEqual(['logs-app-default', 'metrics-app-default']);
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
      ).toEqual(['logs-shared-default', 'metrics-app-default']);
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
  it('keeps supported OTLP signals only', () => {
    expect(readUnitDestinationSignals(elasticsearch([], ['logs', 'profiles', 'traces']))).toEqual([
      'logs',
      'traces',
    ]);
  });

  it('does not treat non-OTLP signals as logs', () => {
    const docsOnly = elasticsearch([{ name: 'index', value: 'logs-app-default' }], ['docs']);
    expect(readUnitDestinationSignals(docsOnly)).toEqual([]);
    expect(getUnitDestinationWritePatterns(docsOnly)).toEqual([]);
  });
});
