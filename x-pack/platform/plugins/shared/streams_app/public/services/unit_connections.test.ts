/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createDefaultUnit, type Unit } from './unit_repository';
import {
  canConnectSourceToDestination,
  connectSourceToDestination,
  disconnectSourceFromDestination,
  getUnitConnections,
  moveUnitConnection,
  removeComponentFromPipelines,
} from './unit_connections';

const configuredSources = new Set(['nop-input', 'otlp-input', 'bulk-input']);
const configuredDestinations = new Set(['debug-out', 'es-logs', 'es-metrics']);

const unitWith = (pipelines: Unit['unit']['pipelines']): Unit => ({
  ...createDefaultUnit(),
  unit: {
    ...createDefaultUnit().unit,
    pipelines,
  },
});

const sharedPipeline = (): Unit['unit']['pipelines'][number] => ({
  id: 'main',
  supported_telemetry: ['logs'],
  config: [
    { name: 'sources', value: ['otlp-input', 'bulk-input'] },
    { name: 'destinations', value: ['es-logs', 'es-metrics'] },
  ],
});

describe('unit connections', () => {
  it('puts a new source on its own pipeline', () => {
    const next = connectSourceToDestination(createDefaultUnit(), 'otlp-input', 'es-logs');
    const main = next.unit.pipelines.find((pipeline) => pipeline.id === 'main');
    const otlp = next.unit.pipelines.find((pipeline) => pipeline.id === 'p-otlp-input');

    expect(main?.config).toEqual([
      { name: 'sources', value: ['nop-input'] },
      { name: 'destinations', value: ['debug-out'] },
    ]);
    expect(otlp?.config).toEqual([
      { name: 'sources', value: ['otlp-input'] },
      { name: 'destinations', value: ['es-logs'] },
    ]);
    expect(getUnitConnections(next, configuredSources, configuredDestinations)).toEqual([
      { sourceId: 'nop-input', destinationId: 'debug-out', forwarding: 'direct' },
      { sourceId: 'otlp-input', destinationId: 'es-logs', forwarding: 'direct' },
    ]);
  });

  it('creates a source pipeline when the unit has none', () => {
    const next = connectSourceToDestination(unitWith([]), 'otlp-input', 'es-logs');

    expect(next.unit.pipelines).toEqual([
      {
        id: 'p-otlp-input',
        supported_telemetry: ['logs', 'metrics', 'traces'],
        config: [
          { name: 'sources', value: ['otlp-input'] },
          { name: 'destinations', value: ['es-logs'] },
        ],
      },
    ]);
  });

  it('keeps a second destination on the same source pipeline', () => {
    const connected = connectSourceToDestination(unitWith([]), 'otlp-input', 'es-logs');
    const next = connectSourceToDestination(connected, 'otlp-input', 'es-metrics');

    expect(next.unit.pipelines[0]?.config).toEqual([
      { name: 'sources', value: ['otlp-input'] },
      { name: 'destinations', value: ['es-logs', 'es-metrics'] },
    ]);
    expect(getUnitConnections(next, configuredSources, configuredDestinations)).toEqual([
      { sourceId: 'otlp-input', destinationId: 'es-logs', forwarding: 'direct' },
      { sourceId: 'otlp-input', destinationId: 'es-metrics', forwarding: 'direct' },
    ]);
  });

  it('does not cross-connect a second source', () => {
    const logs = connectSourceToDestination(unitWith([]), 'otlp-input', 'es-logs');
    const next = connectSourceToDestination(logs, 'bulk-input', 'es-metrics');

    expect(getUnitConnections(next, configuredSources, configuredDestinations)).toEqual([
      { sourceId: 'otlp-input', destinationId: 'es-logs', forwarding: 'direct' },
      { sourceId: 'bulk-input', destinationId: 'es-metrics', forwarding: 'direct' },
    ]);
  });

  it('draws a route rule as a wire and keeps its condition when another destination is added', () => {
    const routed = unitWith([
      {
        id: 'main',
        supported_telemetry: ['logs'],
        config: [
          { name: 'sources', value: ['otlp-input'] },
          {
            name: 'routes',
            value: [{ when: 'body["service.name"] == "nginx"', destinations: ['es-logs'] }],
          },
        ],
      },
    ]);

    expect(canConnectSourceToDestination(routed, 'otlp-input', 'es-logs')).toBe(false);
    expect(getUnitConnections(routed, configuredSources, configuredDestinations)).toEqual([
      { sourceId: 'otlp-input', destinationId: 'es-logs', forwarding: 'route' },
    ]);

    const next = connectSourceToDestination(routed, 'otlp-input', 'es-metrics');
    const routes = next.unit.pipelines[0]?.config.find((entry) => entry.name === 'routes');

    expect(routes?.value).toEqual([
      { when: 'body["service.name"] == "nginx"', destinations: ['es-logs'] },
      { destinations: ['es-metrics'] },
    ]);
    expect(getUnitConnections(next, configuredSources, configuredDestinations)).toEqual([
      { sourceId: 'otlp-input', destinationId: 'es-logs', forwarding: 'route' },
      { sourceId: 'otlp-input', destinationId: 'es-metrics', forwarding: 'route' },
    ]);
  });

  it('adds a destination to an existing catch-all route', () => {
    const routed = unitWith([
      {
        id: 'main',
        supported_telemetry: ['logs'],
        config: [
          { name: 'sources', value: ['otlp-input'] },
          {
            name: 'routes',
            value: [{ destinations: ['es-logs'] }],
          },
        ],
      },
    ]);
    const next = connectSourceToDestination(routed, 'otlp-input', 'es-metrics');
    const routes = next.unit.pipelines[0]?.config.find((entry) => entry.name === 'routes');

    expect(routes?.value).toEqual([{ destinations: ['es-logs', 'es-metrics'] }]);
  });

  it('unhooks one destination from a route and keeps the other rule', () => {
    const routed = unitWith([
      {
        id: 'main',
        supported_telemetry: ['logs'],
        config: [
          { name: 'sources', value: ['otlp-input'] },
          {
            name: 'routes',
            value: [
              { when: 'body["service.name"] == "nginx"', destinations: ['es-logs'] },
              { destinations: ['es-metrics'] },
            ],
          },
        ],
      },
    ]);
    const next = disconnectSourceFromDestination(routed, 'otlp-input', 'es-logs');
    const routes = next.unit.pipelines[0]?.config.find((entry) => entry.name === 'routes');

    expect(routes?.value).toEqual([{ destinations: ['es-metrics'] }]);
  });

  it('removes a deleted destination from route rules', () => {
    const routed = unitWith([
      {
        id: 'main',
        supported_telemetry: ['logs'],
        config: [
          { name: 'sources', value: ['otlp-input'] },
          {
            name: 'routes',
            value: [
              { when: 'body["service.name"] == "nginx"', destinations: ['es-logs', 'es-metrics'] },
            ],
          },
        ],
      },
    ]);
    const next = removeComponentFromPipelines(routed, 'es-logs');
    const routes = next.unit.pipelines[0]?.config.find((entry) => entry.name === 'routes');

    expect(routes?.value).toEqual([
      { when: 'body["service.name"] == "nginx"', destinations: ['es-metrics'] },
    ]);
  });

  it('unhooks one line and leaves the source pipeline when another destination remains', () => {
    const connected = connectSourceToDestination(
      connectSourceToDestination(unitWith([]), 'otlp-input', 'es-logs'),
      'otlp-input',
      'es-metrics'
    );
    const next = disconnectSourceFromDestination(connected, 'otlp-input', 'es-logs');

    expect(next.unit.pipelines[0]?.config).toEqual([
      { name: 'sources', value: ['otlp-input'] },
      { name: 'destinations', value: ['es-metrics'] },
    ]);
  });

  it('drops the source pipeline when its last line is unhooked', () => {
    const connected = connectSourceToDestination(createDefaultUnit(), 'otlp-input', 'es-logs');
    const next = disconnectSourceFromDestination(connected, 'otlp-input', 'es-logs');

    expect(next.unit.pipelines.map((pipeline) => pipeline.id)).toEqual(['main']);
  });

  it('splits a shared pipeline when one of its lines is unhooked', () => {
    const next = disconnectSourceFromDestination(
      unitWith([sharedPipeline()]),
      'otlp-input',
      'es-metrics'
    );
    const shared = next.unit.pipelines.find((pipeline) => pipeline.id === 'main');
    const otlp = next.unit.pipelines.find((pipeline) => pipeline.id === 'p-otlp-input');

    expect(shared?.config).toEqual([
      { name: 'sources', value: ['bulk-input'] },
      { name: 'destinations', value: ['es-logs', 'es-metrics'] },
    ]);
    expect(otlp?.config).toEqual([
      { name: 'sources', value: ['otlp-input'] },
      { name: 'destinations', value: ['es-logs'] },
    ]);
    expect(getUnitConnections(next, configuredSources, configuredDestinations)).toEqual([
      { sourceId: 'bulk-input', destinationId: 'es-logs', forwarding: 'direct' },
      { sourceId: 'bulk-input', destinationId: 'es-metrics', forwarding: 'direct' },
      { sourceId: 'otlp-input', destinationId: 'es-logs', forwarding: 'direct' },
    ]);
  });

  it('moves one line without wiring the previous source to the new destination', () => {
    const connected = connectSourceToDestination(
      connectSourceToDestination(unitWith([]), 'otlp-input', 'es-logs'),
      'bulk-input',
      'es-metrics'
    );
    const next = moveUnitConnection(connected, {
      previousSourceId: 'otlp-input',
      previousDestinationId: 'es-logs',
      sourceId: 'bulk-input',
      destinationId: 'es-logs',
    });

    expect(getUnitConnections(next, configuredSources, configuredDestinations)).toEqual([
      { sourceId: 'bulk-input', destinationId: 'es-metrics', forwarding: 'direct' },
      { sourceId: 'bulk-input', destinationId: 'es-logs', forwarding: 'direct' },
    ]);
  });

  it('removes a deleted destination from its source pipeline', () => {
    const connected = connectSourceToDestination(createDefaultUnit(), 'otlp-input', 'es-logs');
    const next = removeComponentFromPipelines(connected, 'es-logs');

    expect(next.unit.pipelines.map((pipeline) => pipeline.id)).toEqual(['main']);
    expect(next.unit.pipelines[0]?.config).toEqual([
      { name: 'sources', value: ['nop-input'] },
      { name: 'destinations', value: ['debug-out'] },
    ]);
  });
});
