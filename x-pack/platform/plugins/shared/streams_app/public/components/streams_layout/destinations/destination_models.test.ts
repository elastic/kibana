/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSignalTargetsWritePatterns, type StreamsUnit } from '@kbn/streams-schema';
import { getDestinationNameValidationError } from './destination_helpers';
import { EMPTY_ELASTICSEARCH_DESTINATION_FORM } from './types';
import {
  composeStaticIndex,
  composeStaticIndexesForAll,
  createUnitDestination,
  getConfiguredDestinations,
  getDestinationCreateSpec,
  getDestinationIndices,
  getStaticIndexRemainder,
  toS3DestinationViewModel,
  validateAutoWritePattern,
  validateStaticSignalIndex,
  withUnitDestinations,
} from './destination_models';
import { createS3UnitDestination } from './s3_destination_models';

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
        indexBySignal: { logs: 'logs-prod-default' },
        writePatternsBySignal: {},
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
        indexBySignal: { logs: 'logs-nginx-default' },
        writePatternsBySignal: {},
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
        config: [{ name: 'index', telemetry: ['logs'], value: 'logs-nginx-default' }],
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

  it('stores a telemetry-scoped index per signal, a description, and a plaintext api_key', () => {
    expect(
      createUnitDestination({
        id: 'es-app',
        name: 'App',
        description: ' Application data ',
        signals: ['logs', 'traces'],
        indexBySignal: { logs: 'logs-app-default', traces: 'traces-app-default' },
        writePatternsBySignal: {},
        apiKey: 'encoded-key',
      })
    ).toEqual({
      id: 'es-app',
      name: 'App',
      description: 'Application data',
      type: 'elasticsearch',
      supported_telemetry: ['logs', 'traces'],
      config: [
        { name: 'index', telemetry: ['logs'], value: 'logs-app-default' },
        { name: 'index', telemetry: ['traces'], value: 'traces-app-default' },
        { name: 'api_key', value: 'encoded-key' },
      ],
    });
  });

  it('omits index and write_patterns on a full-auto destination', () => {
    expect(
      createUnitDestination({
        id: 'es-auto',
        name: 'Auto',
        description: '',
        signals: ['logs', 'metrics', 'traces'],
        indexBySignal: {},
        writePatternsBySignal: {},
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

  it('stores custom auto write patterns as telemetry-scoped write_patterns', () => {
    expect(
      createUnitDestination({
        id: 'es-billing',
        name: 'Billing',
        signals: ['logs', 'metrics'],
        indexBySignal: {},
        writePatternsBySignal: { logs: ['logs-billing-*'], metrics: ['metrics-billing-*'] },
        apiKey: 'encoded-key',
      })
    ).toEqual({
      id: 'es-billing',
      name: 'Billing',
      type: 'elasticsearch',
      supported_telemetry: ['logs', 'metrics'],
      config: [
        { name: 'write_patterns', telemetry: ['logs'], value: ['logs-billing-*'] },
        { name: 'write_patterns', telemetry: ['metrics'], value: ['metrics-billing-*'] },
        { name: 'api_key', value: 'encoded-key' },
      ],
    });
  });

  it('builds one destination spec from the form', () => {
    expect(getDestinationCreateSpec(EMPTY_ELASTICSEARCH_DESTINATION_FORM)).toEqual({
      signals: ['logs', 'metrics', 'traces'],
      indexBySignal: {},
      writePatternsBySignal: {},
    });
    expect(
      getDestinationCreateSpec({
        ...EMPTY_ELASTICSEARCH_DESTINATION_FORM,
        useCustomWritePatterns: true,
        customSignals: ['metrics', 'logs'],
        logsIndex: 'logs-billing-*',
        metricsIndex: 'metrics-billing-*',
        tracesIndex: 'traces-ignored-*',
      })
    ).toEqual({
      signals: ['logs', 'metrics'],
      indexBySignal: {},
      writePatternsBySignal: { logs: ['logs-billing-*'], metrics: ['metrics-billing-*'] },
    });
    expect(
      getDestinationCreateSpec({
        ...EMPTY_ELASTICSEARCH_DESTINATION_FORM,
        auto: false,
        logsIndex: 'logs-app-default',
        tracesIndex: 'traces-app-default',
      })
    ).toEqual({
      signals: ['logs', 'traces'],
      indexBySignal: { logs: 'logs-app-default', traces: 'traces-app-default' },
      writePatternsBySignal: {},
    });
  });

  it('reads telemetry-scoped config, preferring a scoped entry over an unscoped one', () => {
    const [destination] = getConfiguredDestinations({
      ...storedUnit,
      unit: {
        ...storedUnit.unit,
        destinations: [
          {
            id: 'es-mixed',
            name: 'Mixed',
            description: 'Mixed routing',
            type: 'elasticsearch',
            supported_telemetry: ['logs', 'metrics', 'traces'],
            config: [
              { name: 'index', value: 'logs-shared-default' },
              { name: 'index', telemetry: ['metrics'], value: 'metrics-app-default' },
              { name: 'write_patterns', telemetry: ['traces'], value: ['traces-billing-*'] },
            ],
          },
        ],
      },
    });

    expect(destination).toEqual({
      id: 'es-mixed',
      name: 'Mixed',
      description: 'Mixed routing',
      type: 'elasticsearch',
      signals: ['logs', 'metrics', 'traces'],
      mode: 'static',
      indexBySignal: {
        logs: 'logs-shared-default',
        metrics: 'metrics-app-default',
        traces: 'logs-shared-default',
      },
      writePatternsBySignal: { traces: ['traces-billing-*'] },
    });
    if (destination.type !== 'elasticsearch') {
      throw new Error('Expected an Elasticsearch destination');
    }
    expect(getDestinationIndices(destination)).toEqual([
      'logs-shared-default',
      'metrics-app-default',
    ]);
    // A static index is where documents go, so it wins over write_patterns of the same signal.
    expect(getSignalTargetsWritePatterns(destination)).toEqual([
      'logs-shared-default',
      'metrics-app-default',
    ]);
  });

  it('resolves each signal of an API-written mix of index and write_patterns', () => {
    const [destination] = getConfiguredDestinations({
      ...storedUnit,
      unit: {
        ...storedUnit.unit,
        destinations: [
          {
            id: 'es-api',
            name: 'API',
            type: 'elasticsearch',
            supported_telemetry: ['logs', 'metrics', 'traces'],
            config: [
              { name: 'index', telemetry: ['logs'], value: 'logs-app.otel-default' },
              { name: 'write_patterns', telemetry: ['logs'], value: ['logs-app.otel-*'] },
              { name: 'write_patterns', telemetry: ['metrics'], value: ['metrics-app-*'] },
            ],
          },
        ],
      },
    });
    if (destination.type !== 'elasticsearch') {
      throw new Error('Expected an Elasticsearch destination');
    }
    expect(destination.mode).toBe('static');
    expect(getSignalTargetsWritePatterns(destination)).toEqual([
      'logs-app.otel-default',
      'metrics-app-*',
      'traces-*-*',
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
        description: undefined,
        type: 'elasticsearch',
        signals: ['logs'],
        mode: 'auto',
        indexBySignal: {},
        writePatternsBySignal: {},
      },
    ]);
    const [destination] = destinations;
    if (destination.type !== 'elasticsearch') {
      throw new Error('Expected an Elasticsearch destination');
    }
    expect(getSignalTargetsWritePatterns(destination)).toEqual(['logs-*-*']);
  });

  it('resolves write patterns per signal from write_patterns, then index, then auto', () => {
    expect(
      getSignalTargetsWritePatterns({
        signals: ['logs', 'metrics', 'traces'],
        indexBySignal: { metrics: 'metrics-app-default' },
        writePatternsBySignal: { logs: ['logs-billing-*'] },
      })
    ).toEqual(['logs-billing-*', 'metrics-app-default', 'traces-*-*']);
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

describe('S3', () => {
  const s3Input = {
    id: 's3-archive',
    name: 'S3 archive',
    region: 'eu-west-1',
    bucket: 'demo-bucket',
    prefix: '',
  };

  it('builds an S3 node with credential references and no prefix entry when empty', () => {
    expect(createS3UnitDestination(s3Input)).toEqual({
      id: 's3-archive',
      name: 'S3 archive',
      type: 's3',
      supported_telemetry: ['logs', 'metrics', 'traces'],
      config: [
        { name: 'bucket', value: 'demo-bucket' },
        { name: 'region', value: 'eu-west-1' },
        { name: 'access_key_id', value: { credential: 's3-archive-access-key-id' } },
        { name: 'secret_access_key', value: { credential: 's3-archive-secret-access-key' } },
      ],
    });
  });

  it.each([
    [
      'credential references',
      { credential: 's3-archive-access-key-id' },
      { credential: 's3-archive-secret-access-key' },
    ],
    ['plain strings', 'AKIAEXAMPLE', 'wJalrXUtnFEMI'],
  ])('maps a stored S3 node with %s without exposing keys', (_, accessKeyId, secretAccessKey) => {
    const unit = withUnitDestinations(storedUnit, [
      {
        id: 's3-archive',
        name: 'S3 archive',
        type: 's3',
        supported_telemetry: ['logs', 'metrics', 'traces'],
        config: [
          { name: 'bucket', value: 'demo-bucket' },
          { name: 'region', value: 'eu-west-1' },
          { name: 'access_key_id', value: accessKeyId },
          { name: 'secret_access_key', value: secretAccessKey },
        ],
      },
    ]);
    const [viewModel] = getConfiguredDestinations(unit);
    expect(viewModel).toEqual({
      id: 's3-archive',
      name: 'S3 archive',
      type: 's3',
      signals: ['logs', 'metrics', 'traces'],
      bucket: 'demo-bucket',
      region: 'eu-west-1',
      prefix: undefined,
    });
    const serialized = JSON.stringify(viewModel);
    expect(serialized).not.toContain('access-key');
    expect(serialized).not.toContain('AKIAEXAMPLE');
    expect(serialized).not.toContain('wJalrXUtnFEMI');
  });

  it('round-trips a prefix through the S3 node', () => {
    const node = createS3UnitDestination({ ...s3Input, prefix: 'archive/' });
    expect(toS3DestinationViewModel(node).prefix).toBe('archive/');
  });
});
