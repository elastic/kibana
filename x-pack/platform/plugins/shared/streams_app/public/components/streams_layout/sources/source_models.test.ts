/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamsUnit } from '@kbn/streams-schema';
import {
  connectedDestinationLabels,
  createRuntimeMetadata,
  createUnitSource,
  defaultSignalsForSourceType,
  getConfiguredSources,
  getSourceDisplaySignals,
  selectableSignalsForSourceType,
  sourceTypeSelectsSignals,
  telemetryForSelectedSignals,
  withUnitSources,
} from './source_models';

const storedUnit: StreamsUnit.GetResponse = {
  unit: {
    sources: [
      {
        id: 'otlp-input',
        name: 'Production OTLP',
        type: 'otlp',
        supported_telemetry: ['logs', 'traces'],
      },
      {
        id: 'file-drop',
        type: 'file',
        supported_telemetry: ['logs'],
      },
    ],
    processors: [{ id: 'add-env', type: 'add_fields', supported_telemetry: ['logs'] }],
    destinations: [{ id: 'es-prod', type: 'debug', supported_telemetry: ['logs'] }],
    pipelines: [
      {
        id: 'main',
        supported_telemetry: ['logs', 'traces'],
        config: [
          { name: 'sources', value: ['otlp-input'] },
          { name: 'processors', value: ['add-env'] },
          { name: 'destinations', value: ['es-prod'] },
        ],
      },
    ],
  },
  ui_metadata: { nodes: { 'add-env': { x: 1, y: 2 } } },
};

describe('source models', () => {
  it('labels each source with the destinations its pipelines forward to', () => {
    expect(connectedDestinationLabels(storedUnit)).toEqual({
      'otlp-input': ['es-prod'],
    });
  });

  it('maps configured sources from the unit and ignores unmanaged types', () => {
    expect(getConfiguredSources(storedUnit)).toEqual([
      {
        id: 'otlp-input',
        name: 'Production OTLP',
        type: 'otlp',
        to: null,
        config: { otlp: { signals: ['logs', 'traces'] } },
      },
    ]);
  });

  it('exposes logs, metrics, and traces for source badges', () => {
    expect(
      getSourceDisplaySignals({
        id: 'otlp-input',
        name: 'Production OTLP',
        type: 'otlp',
        to: null,
        config: { otlp: { signals: ['logs', 'traces'] } },
      })
    ).toEqual(['logs', 'traces']);
    expect(
      getSourceDisplaySignals({
        id: 'prom-in',
        name: 'Prometheus',
        type: 'prometheus_remote_write',
        to: null,
      })
    ).toEqual(['metrics']);
    expect(
      getSourceDisplaySignals({
        id: 'async-bulk',
        name: 'Async bulk',
        type: 'async_bulk',
        to: null,
      })
    ).toEqual(['logs', 'metrics', 'traces']);
    expect(
      getSourceDisplaySignals(
        {
          id: 'async-metrics',
          name: 'Async metrics',
          type: 'async_bulk',
          to: null,
        },
        ['metrics']
      )
    ).toEqual(['metrics']);
    expect(
      getSourceDisplaySignals(
        {
          id: 'async-docs',
          name: 'Async docs',
          type: 'async_bulk',
          to: null,
        },
        ['docs']
      )
    ).toEqual([]);
    expect(
      getSourceDisplaySignals({
        id: 'bulk-in',
        name: 'Bulk',
        type: 'bulk',
        to: null,
      })
    ).toEqual([]);
  });

  it('writes selected OTLP signals onto the unit source', () => {
    expect(
      createUnitSource({
        id: 'otlp-logs',
        name: 'Logs only',
        type: 'otlp',
        supportedTelemetry: ['logs'],
      })
    ).toEqual({
      id: 'otlp-logs',
      name: 'Logs only',
      type: 'otlp',
      supported_telemetry: ['logs'],
    });
    expect(
      getConfiguredSources({
        unit: {
          sources: [
            createUnitSource({
              id: 'otlp-logs',
              name: 'Logs only',
              type: 'otlp',
              supportedTelemetry: ['logs'],
            }),
          ],
          destinations: [],
          pipelines: [],
        },
        ui_metadata: {},
      })
    ).toEqual([
      {
        id: 'otlp-logs',
        name: 'Logs only',
        type: 'otlp',
        to: null,
        config: { otlp: { signals: ['logs'] } },
      },
    ]);
    expect(
      createRuntimeMetadata(
        {
          id: 'otlp-logs',
          name: 'Logs only',
          type: 'otlp',
          to: null,
          config: { otlp: { signals: ['logs'] } },
        },
        { managedInputBaseUrl: 'https://cluster.ingest.elastic.cloud' }
      ).endpoints
    ).toEqual([
      {
        id: 'logs',
        url: 'https://cluster.ingest.elastic.cloud/inputs/otlp/otlp-logs/v1/logs',
      },
    ]);
  });

  it('lets OTLP and async bulk pick logs, metrics, and traces; Prometheus is metrics-only', () => {
    expect(selectableSignalsForSourceType('otlp')).toEqual(['logs', 'metrics', 'traces']);
    expect(selectableSignalsForSourceType('async_bulk')).toEqual(['logs', 'metrics', 'traces']);
    expect(selectableSignalsForSourceType('prometheus_remote_write')).toEqual(['metrics']);
    expect(sourceTypeSelectsSignals('otlp')).toBe(true);
    expect(sourceTypeSelectsSignals('async_bulk')).toBe(true);
    expect(sourceTypeSelectsSignals('prometheus_remote_write')).toBe(false);
    expect(defaultSignalsForSourceType('async_bulk')).toEqual(['logs', 'metrics', 'traces']);
    expect(defaultSignalsForSourceType('prometheus_remote_write')).toEqual([]);
    expect(telemetryForSelectedSignals('async_bulk', ['logs', 'traces'])).toEqual([
      'logs',
      'traces',
    ]);
    expect(telemetryForSelectedSignals('prometheus_remote_write', ['logs'])).toEqual(['metrics']);
    expect(
      createUnitSource({
        id: 'bulk-in',
        name: 'ECS',
        type: 'async_bulk',
        supportedTelemetry: telemetryForSelectedSignals('async_bulk', ['metrics']),
      }).supported_telemetry
    ).toEqual(['metrics']);
  });

  it('adds a source onto the unit without dropping processors, destinations, or unmanaged sources', () => {
    const existingSources = storedUnit.unit.sources ?? [];
    const next = withUnitSources(storedUnit, [
      ...existingSources,
      createUnitSource({ id: 'otlp-2', name: 'OTLP 2', type: 'otlp' }),
    ]);

    expect(next).toEqual({
      unit: {
        sources: [
          existingSources[0],
          existingSources[1],
          {
            id: 'otlp-2',
            name: 'OTLP 2',
            type: 'otlp',
            supported_telemetry: ['logs', 'metrics', 'traces'],
          },
        ],
        processors: storedUnit.unit.processors,
        destinations: storedUnit.unit.destinations,
        pipelines: storedUnit.unit.pipelines,
      },
      ui_metadata: storedUnit.ui_metadata,
    });
  });
});
