/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamsUnit } from '@kbn/streams-schema';
import { getDestinationNameValidationError } from './destination_helpers';
import {
  composeStaticIndex,
  composeStaticIndexesForAll,
  createUnitDestination,
  haveStaticIndexRemaindersDiverged,
  getConfiguredDestinations,
  getDestinationCreateSpecs,
  getDestinationWritePatterns,
  getStaticIndexRemainder,
  validateStaticSignalIndex,
  withUnitDestinations,
} from './destination_models';

const storedUnit: StreamsUnit.GetResponse = {
  unit: {
    sources: [{ id: 'otlp-input', type: 'otlp', supported_telemetry: ['logs'] }],
    destinations: [
      {
        id: 'logs-prod',
        name: 'Logs prod',
        type: 'elasticsearch',
        supported_telemetry: ['logs'],
        config: [{ name: 'index', value: 'logs-prod-default' }],
      },
      { id: 'debug-out', type: 'debug', supported_telemetry: ['logs'] },
    ],
    pipelines: [],
  },
  ui_metadata: {},
};

describe('destination models', () => {
  it('maps local Elasticsearch destinations and ignores other destination types', () => {
    expect(getConfiguredDestinations(storedUnit)).toEqual([
      {
        id: 'logs-prod',
        name: 'Logs prod',
        type: 'elasticsearch',
        signal: 'logs',
        mode: 'static',
        index: 'logs-prod-default',
      },
    ]);
  });

  it('adds an Elasticsearch destination without dropping other unit components', () => {
    const next = withUnitDestinations(storedUnit, [
      ...storedUnit.unit.destinations,
      createUnitDestination({
        id: 'logs-nginx-default',
        name: 'logs-nginx-default',
        signal: 'logs',
        index: 'logs-nginx-default',
      }),
    ]);

    expect(next.unit.sources).toEqual(storedUnit.unit.sources);
    expect(next.unit.destinations).toEqual([
      storedUnit.unit.destinations[0],
      storedUnit.unit.destinations[1],
      {
        id: 'logs-nginx-default',
        name: 'logs-nginx-default',
        type: 'elasticsearch',
        supported_telemetry: ['logs'],
        config: [{ name: 'index', value: 'logs-nginx-default' }],
      },
    ]);
  });

  it('rejects a destination name that already exists for the same signal', () => {
    expect(
      getDestinationNameValidationError({
        destinationName: ' logs prod ',
        unitDefinition: storedUnit,
        signals: ['logs'],
      })
    ).toBe('duplicate');
    expect(
      getDestinationNameValidationError({
        destinationName: 'Logs prod',
        unitDefinition: storedUnit,
        signals: ['metrics'],
      })
    ).toBeUndefined();
    expect(
      getDestinationNameValidationError({
        destinationName: 'logs-nginx-default',
        unitDefinition: storedUnit,
        signals: ['logs'],
      })
    ).toBeUndefined();
  });

  it('stores an unscoped index for a single signal and a plaintext api_key', () => {
    expect(
      createUnitDestination({
        id: 'es-logs',
        name: 'Logs',
        signal: 'logs',
        index: 'logs-app-default',
        apiKey: 'encoded-key',
      })
    ).toEqual({
      id: 'es-logs',
      name: 'Logs',
      type: 'elasticsearch',
      supported_telemetry: ['logs'],
      config: [
        { name: 'index', value: 'logs-app-default' },
        { name: 'api_key', value: 'encoded-key' },
      ],
    });
  });

  it('writes an unscoped index_patterns entry for an auto destination', () => {
    expect(
      createUnitDestination({
        id: 'es-auto-logs',
        name: 'Auto',
        signal: 'logs',
        apiKey: 'encoded-key',
      })
    ).toEqual({
      id: 'es-auto-logs',
      name: 'Auto',
      type: 'elasticsearch',
      supported_telemetry: ['logs'],
      config: [
        { name: 'index_patterns', value: ['logs-*-*'] },
        { name: 'api_key', value: 'encoded-key' },
      ],
    });
  });

  it('expands the create form into one destination spec per signal', () => {
    expect(
      getDestinationCreateSpecs({
        auto: true,
        logsIndex: '',
        metricsIndex: '',
        tracesIndex: '',
      })
    ).toEqual([{ signal: 'logs' }, { signal: 'metrics' }, { signal: 'traces' }]);
    expect(
      getDestinationCreateSpecs({
        auto: false,
        logsIndex: 'logs-app-default',
        metricsIndex: '',
        tracesIndex: 'traces-app-default',
      })
    ).toEqual([
      { signal: 'logs', index: 'logs-app-default' },
      { signal: 'traces', index: 'traces-app-default' },
    ]);
  });

  it('treats a missing index as auto and expands that signal write pattern', () => {
    const destinations = getConfiguredDestinations({
      ...storedUnit,
      unit: {
        ...storedUnit.unit,
        destinations: [
          {
            id: 'es-auto',
            name: 'Auto logs',
            type: 'elasticsearch',
            supported_telemetry: ['logs'],
          },
        ],
      },
    });

    expect(destinations).toEqual([
      {
        id: 'es-auto',
        name: 'Auto logs',
        type: 'elasticsearch',
        signal: 'logs',
        mode: 'auto',
        index: undefined,
      },
    ]);
    expect(getDestinationWritePatterns(destinations[0])).toEqual(['logs-*-*']);
  });

  it('expands only the configured static index for write-scope listing', () => {
    expect(
      getDestinationWritePatterns({
        signal: 'logs',
        mode: 'static',
        index: 'logs-app-default',
      })
    ).toEqual(['logs-app-default']);
  });

  it('composes a shared remainder onto every signal for All', () => {
    expect(getStaticIndexRemainder('logs', 'logs-app-default')).toBe('app-default');
    expect(composeStaticIndex('logs', 'app-default')).toBe('logs-app-default');
    expect(composeStaticIndex('logs', 'logs-app-default')).toBe('logs-app-default');
    expect(composeStaticIndexesForAll('app-default')).toEqual({
      logsIndex: 'logs-app-default',
      metricsIndex: 'metrics-app-default',
      tracesIndex: 'traces-app-default',
    });
    expect(
      haveStaticIndexRemaindersDiverged({
        logsIndex: 'logs-app-default',
        metricsIndex: 'metrics-app-default',
        tracesIndex: 'traces-app-default',
      })
    ).toBe(false);
    expect(
      haveStaticIndexRemaindersDiverged({
        logsIndex: '',
        metricsIndex: '',
        tracesIndex: '',
      })
    ).toBe(false);
    expect(
      haveStaticIndexRemaindersDiverged({
        logsIndex: 'logs-app-default',
        metricsIndex: '',
        tracesIndex: '',
      })
    ).toBe(true);
  });

  it('rejects templated names and indexes that do not match the signal pattern', () => {
    expect(validateStaticSignalIndex('logs', 'logs-{{dataset}}-default')).toBe('template');
    expect(validateStaticSignalIndex('logs', 'metrics-app-default')).toBe('signalPattern');
    expect(validateStaticSignalIndex('logs', 'logs-app-default')).toBeUndefined();
    expect(validateStaticSignalIndex('logs', '')).toBeUndefined();
  });
});
