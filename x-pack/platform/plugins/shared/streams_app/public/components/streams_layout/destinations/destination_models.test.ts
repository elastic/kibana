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
  validateAutoWritePattern,
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
        signals: ['logs'],
        mode: 'static',
        index: 'logs-prod-default',
        indexPatterns: undefined,
      },
    ]);
  });

  it('adds an Elasticsearch destination without dropping other unit components', () => {
    const next = withUnitDestinations(storedUnit, [
      ...storedUnit.unit.destinations,
      createUnitDestination({
        id: 'logs-nginx-default',
        name: 'logs-nginx-default',
        signals: ['logs'],
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
        signals: ['logs'],
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

  it('omits index and index_patterns on a full-auto destination', () => {
    expect(
      createUnitDestination({
        id: 'es-auto',
        name: 'Auto',
        signals: ['logs', 'metrics', 'traces'],
        apiKey: 'encoded-key',
      })
    ).toEqual({
      id: 'es-auto',
      name: 'Auto',
      type: 'elasticsearch',
      supported_telemetry: ['logs', 'metrics', 'traces'],
      config: [{ name: 'api_key', value: 'encoded-key' }],
    });
  });

  it('stores user write targets on index_patterns for one auto destination', () => {
    expect(
      createUnitDestination({
        id: 'es-billing',
        name: 'Billing',
        signals: ['logs', 'metrics'],
        patterns: ['logs-billing-*', 'metrics-billing-*'],
        apiKey: 'encoded-key',
      })
    ).toEqual({
      id: 'es-billing',
      name: 'Billing',
      type: 'elasticsearch',
      supported_telemetry: ['logs', 'metrics'],
      config: [
        { name: 'index_patterns', value: ['logs-billing-*', 'metrics-billing-*'] },
        { name: 'api_key', value: 'encoded-key' },
      ],
    });
  });

  it('creates one auto destination, with index_patterns only when write targets are filled', () => {
    expect(
      getDestinationCreateSpecs({
        auto: true,
        logsIndex: '',
        metricsIndex: '',
        tracesIndex: '',
      })
    ).toEqual([{ signals: ['logs', 'metrics', 'traces'] }]);
    expect(
      getDestinationCreateSpecs({
        auto: true,
        logsIndex: 'logs-billing-*',
        metricsIndex: 'metrics-billing-*',
        tracesIndex: '',
      })
    ).toEqual([
      {
        signals: ['logs', 'metrics'],
        patterns: ['logs-billing-*', 'metrics-billing-*'],
      },
    ]);
    expect(
      getDestinationCreateSpecs({
        auto: false,
        logsIndex: 'logs-app-default',
        metricsIndex: '',
        tracesIndex: 'traces-app-default',
      })
    ).toEqual([
      { signals: ['logs'], index: 'logs-app-default' },
      { signals: ['traces'], index: 'traces-app-default' },
    ]);
  });

  it('reads stored index_patterns onto auto destinations', () => {
    expect(
      getConfiguredDestinations({
        ...storedUnit,
        unit: {
          ...storedUnit.unit,
          destinations: [
            {
              id: 'es-billing',
              name: 'Billing',
              type: 'elasticsearch',
              supported_telemetry: ['logs', 'metrics', 'traces'],
              config: [{ name: 'index_patterns', value: ['logs-billing-*', 'metrics-billing-*'] }],
            },
          ],
        },
      })
    ).toEqual([
      {
        id: 'es-billing',
        name: 'Billing',
        type: 'elasticsearch',
        signals: ['logs', 'metrics', 'traces'],
        mode: 'auto',
        index: undefined,
        indexPatterns: ['logs-billing-*', 'metrics-billing-*'],
      },
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
        signals: ['logs'],
        mode: 'auto',
        index: undefined,
        indexPatterns: undefined,
      },
    ]);
    expect(getDestinationWritePatterns(destinations[0])).toEqual(['logs-*-*']);
  });

  it('expands every auto signal into a write pattern', () => {
    expect(
      getDestinationWritePatterns({
        signals: ['logs', 'metrics', 'traces'],
        mode: 'auto',
      })
    ).toEqual(['logs-*-*', 'metrics-*-*', 'traces-*-*']);
  });

  it('uses stored index_patterns for an auto destination write scope', () => {
    expect(
      getDestinationWritePatterns({
        signals: ['logs', 'metrics', 'traces'],
        mode: 'auto',
        indexPatterns: ['logs-billing-*', 'metrics-billing-*'],
      })
    ).toEqual(['logs-billing-*', 'metrics-billing-*']);
  });

  it('expands only the configured static index for write-scope listing', () => {
    expect(
      getDestinationWritePatterns({
        signals: ['logs'],
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
    expect(validateStaticSignalIndex('logs', 'logs-app-')).toBe('signalPattern');
    expect(validateStaticSignalIndex('logs', 'logs-app-prod-default')).toBe('signalPattern');
    expect(validateStaticSignalIndex('logs', '')).toBeUndefined();
    expect(validateStaticSignalIndex('logs', `logs-${'a'.repeat(240)}-default`)).toBeUndefined();
    expect(validateStaticSignalIndex('logs', `logs-${'a'.repeat(250)}-default`)).toBe(
      'invalidName'
    );
  });

  it('requires auto write patterns to be lowercase signal-dataset-namespace globs', () => {
    expect(validateAutoWritePattern('logs', 'logs-*-*')).toBeUndefined();
    expect(validateAutoWritePattern('logs', 'logs-billing-*')).toBeUndefined();
    expect(validateAutoWritePattern('logs', 'logs-bill*-prod*')).toBeUndefined();
    expect(validateAutoWritePattern('metrics', 'metrics-billing-*')).toBeUndefined();
    expect(validateAutoWritePattern('logs', 'metrics-billing-*')).toBe('signalPattern');
    expect(validateAutoWritePattern('logs', 'foo-billing-*')).toBe('signalPattern');
    expect(validateAutoWritePattern('logs', 'logs-')).toBe('signalPattern');
    expect(validateAutoWritePattern('logs', 'logs-*')).toBe('signalPattern');
    expect(validateAutoWritePattern('logs', 'logs-billing*')).toBe('signalPattern');
    expect(validateAutoWritePattern('logs', 'logs--*')).toBe('signalPattern');
    expect(validateAutoWritePattern('logs', 'logs-billing-')).toBe('signalPattern');
    expect(validateAutoWritePattern('logs', 'logs-*-*-*')).toBe('signalPattern');
    expect(validateAutoWritePattern('logs', 'logs-*-*-*-*-*')).toBe('signalPattern');
    expect(validateAutoWritePattern('logs', 'logs-billing-prod-*')).toBe('signalPattern');
    expect(validateAutoWritePattern('logs', 'Logs-billing-*')).toBe('uppercase');
    expect(validateAutoWritePattern('logs', 'logs-billing,prod-*')).toBe('invalidCharacter');
  });
});
