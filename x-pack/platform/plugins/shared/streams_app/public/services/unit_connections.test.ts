/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createDefaultUnit, type Unit } from './unit_repository';
import {
  canConnectRouteToDestination,
  canConnectSourceToDestination,
  connectRouteToDestination,
  connectSourceToDestination,
  disconnectRouteFromDestination,
  disconnectSourceFromDestination,
  getUnitConnections,
  moveRouteConnection,
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

  it('lets several sources share one destination', () => {
    const connected = connectSourceToDestination(unitWith([]), 'otlp-input', 'es-logs');
    const next = connectSourceToDestination(connected, 'bulk-input', 'es-logs');

    expect(getUnitConnections(next, configuredSources, configuredDestinations)).toEqual([
      { sourceId: 'otlp-input', destinationId: 'es-logs', forwarding: 'direct' },
      { sourceId: 'bulk-input', destinationId: 'es-logs', forwarding: 'direct' },
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

  it('gives a source that feeds a routing pipeline a separate direct pipeline', () => {
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

    expect(canConnectSourceToDestination(routed, 'otlp-input', 'es-metrics')).toBe(true);

    const next = connectSourceToDestination(routed, 'otlp-input', 'es-metrics');

    expect(next.unit.pipelines[0]).toEqual(routed.unit.pipelines[0]);
    expect(next.unit.pipelines[1]?.config).toEqual([
      { name: 'sources', value: ['otlp-input'] },
      { name: 'destinations', value: ['es-metrics'] },
    ]);
    expect(getUnitConnections(next, configuredSources, configuredDestinations)).toEqual([
      { sourceId: 'otlp-input', destinationId: 'es-logs', forwarding: 'route' },
      { sourceId: 'otlp-input', destinationId: 'es-metrics', forwarding: 'direct' },
    ]);
  });

  it('keeps a routed destination and a direct wire to the same destination apart', () => {
    const routed = unitWith([
      {
        id: 'main',
        supported_telemetry: ['logs'],
        config: [
          { name: 'sources', value: ['otlp-input'] },
          { name: 'routes', value: [{ when: 'true', destinations: ['es-logs'] }] },
        ],
      },
    ]);
    const next = connectSourceToDestination(routed, 'otlp-input', 'es-logs');

    expect(getUnitConnections(next, configuredSources, configuredDestinations)).toEqual([
      { sourceId: 'otlp-input', destinationId: 'es-logs', forwarding: 'route' },
      { sourceId: 'otlp-input', destinationId: 'es-logs', forwarding: 'direct' },
    ]);
  });

  it('adds a destination to the routing rule it was drawn from', () => {
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
              { destinations: ['debug-out'] },
            ],
          },
        ],
      },
    ]);
    const rule = { pipelineId: 'main', ruleIndex: 0 };

    expect(canConnectRouteToDestination(routed, rule, 'es-logs')).toBe(false);
    expect(canConnectRouteToDestination(routed, rule, 'es-metrics')).toBe(true);

    const next = connectRouteToDestination(routed, rule, 'es-metrics');
    const routes = next.unit.pipelines[0]?.config.find((entry) => entry.name === 'routes');

    expect(next.unit.pipelines).toHaveLength(1);
    expect(routes?.value).toEqual([
      { when: 'body["service.name"] == "nginx"', destinations: ['es-logs', 'es-metrics'] },
      { destinations: ['debug-out'] },
    ]);
  });

  it('refuses destinations on a rule that forwards to pipelines', () => {
    const routed = unitWith([
      {
        id: 'main',
        supported_telemetry: ['logs'],
        config: [
          { name: 'sources', value: ['otlp-input'] },
          { name: 'routes', value: [{ pipelines: ['child'] }] },
        ],
      },
      {
        id: 'child',
        supported_telemetry: ['logs'],
        config: [{ name: 'destinations', value: ['es-logs'] }],
      },
    ]);

    expect(
      canConnectRouteToDestination(routed, { pipelineId: 'main', ruleIndex: 0 }, 'es-metrics')
    ).toBe(false);
    expect(
      canConnectRouteToDestination(routed, { pipelineId: 'main', ruleIndex: 1 }, 'es-metrics')
    ).toBe(false);

    const next = connectRouteToDestination(
      routed,
      { pipelineId: 'child', ruleIndex: 0 },
      'es-metrics'
    );

    expect(next.unit.pipelines[1]?.config).toEqual([
      { name: 'destinations', value: ['es-logs', 'es-metrics'] },
    ]);
  });

  it('keeps the last destination of a routed child pipeline', () => {
    const routed = unitWith([
      {
        id: 'main',
        supported_telemetry: ['logs'],
        config: [
          { name: 'sources', value: ['otlp-input'] },
          { name: 'routes', value: [{ pipelines: ['child'] }] },
        ],
      },
      {
        id: 'child',
        supported_telemetry: ['logs'],
        config: [{ name: 'destinations', value: ['es-logs'] }],
      },
    ]);

    expect(
      disconnectRouteFromDestination(routed, { pipelineId: 'child', ruleIndex: 0 }, 'es-logs')
    ).toBe(routed);
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
    const next = disconnectRouteFromDestination(
      routed,
      { pipelineId: 'main', ruleIndex: 0 },
      'es-logs'
    );
    const routes = next.unit.pipelines[0]?.config.find((entry) => entry.name === 'routes');

    expect(routes?.value).toEqual([{ destinations: ['es-metrics'] }]);
    expect(disconnectSourceFromDestination(routed, 'otlp-input', 'es-metrics')).toBe(routed);
  });

  it('moves a routed line onto another rule', () => {
    const routed = unitWith([
      {
        id: 'main',
        supported_telemetry: ['logs'],
        config: [
          { name: 'sources', value: ['otlp-input'] },
          {
            name: 'routes',
            value: [{ when: 'true', destinations: ['es-logs'] }, { destinations: ['es-metrics'] }],
          },
        ],
      },
    ]);
    const next = moveRouteConnection(routed, {
      previousRule: { pipelineId: 'main', ruleIndex: 0 },
      previousDestinationId: 'es-logs',
      rule: { pipelineId: 'main', ruleIndex: 1 },
      destinationId: 'es-logs',
    });
    const routes = next.unit.pipelines[0]?.config.find((entry) => entry.name === 'routes');

    expect(routes?.value).toEqual([{ destinations: ['es-metrics', 'es-logs'] }]);
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

  it('moves a line onto a free destination', () => {
    const connected = connectSourceToDestination(unitWith([]), 'otlp-input', 'es-logs');
    const next = moveUnitConnection(connected, {
      previousSourceId: 'otlp-input',
      previousDestinationId: 'es-logs',
      sourceId: 'otlp-input',
      destinationId: 'es-metrics',
    });

    expect(getUnitConnections(next, configuredSources, configuredDestinations)).toEqual([
      { sourceId: 'otlp-input', destinationId: 'es-metrics', forwarding: 'direct' },
    ]);
  });

  it('refuses a docs source wired to a logs, metrics, and traces destination', () => {
    const unit = unitWith([]);
    unit.unit.sources = [{ id: 'bulk-input', type: 'bulk', supported_telemetry: ['docs'] }];
    unit.unit.destinations = [
      {
        id: 'es-logs',
        type: 'elasticsearch',
        supported_telemetry: ['logs', 'metrics', 'traces'],
      },
    ];

    expect(canConnectSourceToDestination(unit, 'bulk-input', 'es-logs')).toBe(false);
    expect(connectSourceToDestination(unit, 'bulk-input', 'es-logs')).toBe(unit);
  });

  it('builds a new pipeline from the signals both sides support', () => {
    const unit = unitWith([]);
    unit.unit.sources = [
      { id: 'otlp-input', type: 'otlp', supported_telemetry: ['logs', 'metrics'] },
    ];
    unit.unit.destinations = [
      { id: 'es-logs', type: 'elasticsearch', supported_telemetry: ['logs', 'traces'] },
    ];

    const next = connectSourceToDestination(unit, 'otlp-input', 'es-logs');

    expect(next.unit.pipelines[0]?.supported_telemetry).toEqual(['logs']);
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
