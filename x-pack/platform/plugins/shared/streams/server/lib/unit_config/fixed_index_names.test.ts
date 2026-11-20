/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamsUnit } from '@kbn/streams-schema';
import { describeInvalidFixedIndex, findInvalidFixedIndices } from './fixed_index_names';

type Destination = StreamsUnit.Configuration['destinations'][number];
type ConfigEntry = NonNullable<Destination['config']>[number];

const destination = (
  config: ConfigEntry[],
  {
    id = 'es-out',
    type = 'elasticsearch',
    telemetry = ['logs', 'metrics', 'traces'],
  }: { id?: string; type?: string; telemetry?: Destination['supported_telemetry'] } = {}
): Destination => ({ id, type, supported_telemetry: telemetry, config });

const index = (value: string, telemetry?: ConfigEntry['telemetry']): ConfigEntry => ({
  name: 'index',
  value,
  ...(telemetry ? { telemetry } : {}),
});

const unitWith = (destinations: Destination[]): StreamsUnit.Configuration => ({
  sources: [],
  pipelines: [],
  destinations,
});

describe('findInvalidFixedIndices', () => {
  it('accepts otel data stream names on local and remote destinations', () => {
    const otelNames = [
      index('logs-billing.otel-default', ['logs']),
      index('metrics-billing.otel-default', ['metrics']),
      index('traces-billing.otel-prod', ['traces']),
    ];
    const unit = unitWith([
      destination(otelNames),
      destination(otelNames, { id: 'remote', type: 'remote_elasticsearch' }),
    ]);

    expect(findInvalidFixedIndices({ unit, previousUnit: undefined })).toEqual([]);
  });

  it('rejects the classic data stream shape', () => {
    const unit = unitWith([
      destination([index('logs-billing-default', ['logs'])], { telemetry: ['logs'] }),
    ]);

    expect(findInvalidFixedIndices({ unit, previousUnit: undefined })).toEqual([
      { destinationId: 'es-out', signal: 'logs', index: 'logs-billing-default', error: 'shape' },
    ]);
  });

  it('checks an unscoped index once per signal it covers', () => {
    const unit = unitWith([
      destination([index('logs-billing.otel-default')], {
        type: 'remote_elasticsearch',
        telemetry: ['logs', 'metrics'],
      }),
    ]);

    expect(findInvalidFixedIndices({ unit, previousUnit: undefined })).toEqual([
      {
        destinationId: 'es-out',
        signal: 'metrics',
        index: 'logs-billing.otel-default',
        error: 'shape',
      },
    ]);
  });

  it('reports a bad part of an otel name', () => {
    const unit = unitWith([
      destination([index('traces-my-app.otel-default', ['traces'])], { telemetry: ['traces'] }),
    ]);

    expect(findInvalidFixedIndices({ unit, previousUnit: undefined })).toEqual([
      expect.objectContaining({ signal: 'traces', error: 'hyphen' }),
    ]);
  });

  it('leaves docs, auto signals and other destination types alone', () => {
    const unit = unitWith([
      destination([index('accounting-2026', ['docs'])], { telemetry: ['logs', 'docs'] }),
      destination([index('logs-billing-default')], { id: 'debug', type: 'debug' }),
    ]);

    expect(findInvalidFixedIndices({ unit, previousUnit: undefined })).toEqual([]);
  });

  it('skips an index the stored unit already has for that destination and signal', () => {
    const stored = unitWith([
      destination([index('logs-billing-default')], { telemetry: ['logs'] }),
    ]);
    const unit = unitWith([
      destination([index('logs-billing-default')], { telemetry: ['logs', 'metrics'] }),
    ]);

    expect(findInvalidFixedIndices({ unit, previousUnit: stored })).toEqual([
      expect.objectContaining({ signal: 'metrics', index: 'logs-billing-default' }),
    ]);
  });

  it('checks a changed index on a stored destination', () => {
    const stored = unitWith([
      destination([index('logs-billing.otel-default')], { telemetry: ['logs'] }),
    ]);
    const unit = unitWith([destination([index('logs-billing-prod')], { telemetry: ['logs'] })]);

    expect(findInvalidFixedIndices({ unit, previousUnit: stored })).toEqual([
      expect.objectContaining({ signal: 'logs', index: 'logs-billing-prod' }),
    ]);
  });

  it('ignores malformed destinations, which the config distributor rejects', () => {
    const malformed = {
      sources: [],
      pipelines: [],
      destinations: [
        null,
        { id: 'no-telemetry', type: 'elasticsearch', config: [] },
        { id: 'bad-config', type: 'elasticsearch', supported_telemetry: ['logs'], config: {} },
      ],
    } as unknown as StreamsUnit.Configuration;

    expect(findInvalidFixedIndices({ unit: malformed, previousUnit: malformed })).toEqual([]);
    expect(
      findInvalidFixedIndices({
        unit: { destinations: 'nope' } as unknown as StreamsUnit.Configuration,
        previousUnit: undefined,
      })
    ).toEqual([]);
  });

  it.each([null, 'logs'])(
    'checks an index entry with telemetry %j as unscoped instead of skipping it',
    (telemetry) => {
      const unit = {
        sources: [],
        pipelines: [],
        destinations: [
          {
            id: 'es-out',
            type: 'elasticsearch',
            supported_telemetry: ['logs', 'traces'],
            config: [null, { name: 'index', value: 'logs-billing-default', telemetry }],
          },
        ],
      } as unknown as StreamsUnit.Configuration;

      expect(findInvalidFixedIndices({ unit, previousUnit: undefined })).toEqual([
        expect.objectContaining({ signal: 'logs', error: 'shape' }),
        expect.objectContaining({ signal: 'traces', error: 'shape' }),
      ]);
    }
  );

  it('checks the stored value, so surrounding whitespace is rejected', () => {
    const unit = unitWith([
      destination([index('logs-billing.otel-default ', ['logs'])], { telemetry: ['logs'] }),
    ]);

    expect(findInvalidFixedIndices({ unit, previousUnit: undefined })).toEqual([
      expect.objectContaining({ index: 'logs-billing.otel-default ', error: 'invalidCharacter' }),
    ]);
  });
});

describe('describeInvalidFixedIndex', () => {
  it('names the destination, signal and expected shape', () => {
    expect(
      describeInvalidFixedIndex({
        destinationId: 'es-out',
        signal: 'metrics',
        index: 'metrics-billing-default',
        error: 'shape',
      })
    ).toBe(
      'Destination [es-out] writes metrics to [metrics-billing-default], which is not shaped metrics-<dataset>.otel-<namespace> (for example metrics-billing.otel-default). Only those data streams have the OpenTelemetry index templates.'
    );
  });

  it('says which part is wrong', () => {
    expect(
      describeInvalidFixedIndex({
        destinationId: 'es-out',
        signal: 'logs',
        index: 'logs-billing.otel-prod-eu',
        error: 'hyphen',
      })
    ).toBe(
      'Destination [es-out] writes logs to [logs-billing.otel-prod-eu], which is not a valid logs-<dataset>.otel-<namespace> name: the dataset and namespace cannot contain "-".'
    );
  });
});
