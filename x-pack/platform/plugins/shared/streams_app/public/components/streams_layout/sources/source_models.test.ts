/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamsUnit } from '@kbn/streams-schema';
import {
  connectedDestinationLabels,
  connectedDestinations,
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

  describe('connectedDestinations', () => {
    const withPipelines = (
      pipelines: StreamsUnit.GetResponse['unit']['pipelines'],
      destinationIds = ['es-a', 'es-b']
    ): StreamsUnit.GetResponse => ({
      unit: {
        sources: [{ id: 'otlp-input', type: 'otlp', supported_telemetry: ['logs'] }],
        destinations: destinationIds.map((id) => ({
          id,
          name: ` Name of ${id} `,
          type: 'debug',
          supported_telemetry: ['logs'],
        })),
        pipelines,
      },
      ui_metadata: {},
    });
    const idsOf = (unit: StreamsUnit.GetResponse) =>
      Object.values(connectedDestinations(unit))
        .flat()
        .map(({ id }) => id);

    it('returns the id and the trimmed name of each destination a source feeds', () => {
      expect(connectedDestinations(storedUnit)).toEqual({
        'otlp-input': [{ id: 'es-prod', label: 'es-prod' }],
      });
      expect(
        connectedDestinations(
          withPipelines([
            {
              id: 'main',
              supported_telemetry: ['logs'],
              config: [
                { name: 'sources', value: ['otlp-input'] },
                { name: 'destinations', value: ['es-a'] },
              ],
            },
          ])
        )
      ).toEqual({ 'otlp-input': [{ id: 'es-a', label: 'Name of es-a' }] });
    });

    it('leaves out a destination that no source feeds', () => {
      const unit = withPipelines([
        {
          id: 'no-source',
          supported_telemetry: ['logs'],
          config: [{ name: 'destinations', value: ['es-a'] }],
        },
      ]);

      expect(idsOf(unit)).toEqual([]);
      expect(idsOf(withPipelines([]))).toEqual([]);
    });

    it('follows a route into a child pipeline and a route straight to a destination', () => {
      const unit = withPipelines([
        {
          id: 'main',
          supported_telemetry: ['logs'],
          config: [
            { name: 'sources', value: ['otlp-input'] },
            {
              name: 'routes',
              value: [{ when: 'true', pipelines: ['child'] }, { destinations: ['es-b'] }],
            },
          ],
        },
        {
          id: 'child',
          supported_telemetry: ['logs'],
          config: [{ name: 'destinations', value: ['es-a'] }],
        },
      ]);

      expect(idsOf(unit).sort()).toEqual(['es-a', 'es-b']);
    });

    it('ignores a source id that the unit does not define', () => {
      const unit = withPipelines([
        {
          id: 'main',
          supported_telemetry: ['logs'],
          config: [
            { name: 'sources', value: ['unknown-source'] },
            { name: 'destinations', value: ['es-a'] },
          ],
        },
      ]);

      expect(idsOf(unit)).toEqual([]);
    });

    it('keeps the result per unit object and builds it again for a changed unit', () => {
      const changed = withUnitSources(storedUnit, []);

      expect(connectedDestinations(storedUnit)).toBe(connectedDestinations(storedUnit));
      expect(connectedDestinations(changed)).not.toBe(connectedDestinations(storedUnit));
      expect(connectedDestinations(changed)).toEqual({});
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

  it('exposes the signals each source carries for source badges', () => {
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
    ).toEqual(['docs']);
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
    ).toEqual(['docs']);
    expect(
      getSourceDisplaySignals({
        id: 'bulk-in',
        name: 'Bulk',
        type: 'bulk',
        to: null,
      })
    ).toEqual(['docs']);
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

  it('lets OTLP pick logs, metrics, and traces; Prometheus is metrics-only; Managed _bulk is docs-only', () => {
    expect(selectableSignalsForSourceType('otlp')).toEqual(['logs', 'metrics', 'traces']);
    expect(selectableSignalsForSourceType('async_bulk')).toEqual([]);
    expect(selectableSignalsForSourceType('prometheus_remote_write')).toEqual(['metrics']);
    expect(sourceTypeSelectsSignals('otlp')).toBe(true);
    expect(sourceTypeSelectsSignals('async_bulk')).toBe(false);
    expect(sourceTypeSelectsSignals('prometheus_remote_write')).toBe(false);
    expect(defaultSignalsForSourceType('async_bulk')).toEqual([]);
    expect(defaultSignalsForSourceType('prometheus_remote_write')).toEqual([]);
    expect(telemetryForSelectedSignals('async_bulk', [])).toEqual(['docs']);
    expect(telemetryForSelectedSignals('async_bulk', ['logs'])).toEqual(['docs']);
    expect(telemetryForSelectedSignals('prometheus_remote_write', ['logs'])).toEqual(['metrics']);
    expect(
      createUnitSource({ id: 'orders', name: 'Orders', type: 'async_bulk' }).supported_telemetry
    ).toEqual(['docs']);
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
