/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createDefaultUnit, type Unit } from './unit_repository';
import {
  addTestRoutingToLine,
  canConnectSourceToDestination,
  canConnectToDestination,
  canDisconnectFromDestination,
  canMoveUnitConnection,
  connectSourceToDestination,
  connectToDestination,
  disconnectFromDestination,
  disconnectSourceFromDestination,
  getPipelinesWithoutDestinations,
  getUnitConnections,
  canConnectRouteToTarget,
  connectRouteToTarget,
  disconnectRouteFromTarget,
  isolateSourceLine,
  moveRouteConnection,
  moveUnitConnection,
  removeComponentFromPipelines,
  type RouteTarget,
} from './unit_connections';

const destination = (id: string): RouteTarget => ({ kind: 'destination', id });
const pipelineTarget = (id: string): RouteTarget => ({ kind: 'pipeline', id });

const configuredSources = new Set(['nop-input', 'otlp-input', 'bulk-input']);
const configuredDestinations = new Set(['debug-out', 'es-logs', 'es-metrics', 'es-traces']);

const unitWith = (pipelines: Unit['unit']['pipelines']): Unit => ({
  ...createDefaultUnit(),
  unit: {
    ...createDefaultUnit().unit,
    pipelines,
  },
});

const source = (id: string) => ({ kind: 'source' as const, id });
const processing = (pipelineId: string) => ({
  kind: 'processing' as const,
  ref: { kind: 'pipeline' as const, pipelineId },
});

/** `otlp-input` -> processing (`tag`) -> `es-logs`, plus an untouched `nop-input` pipeline. */
const processedUnit = (destinations: string[] = ['es-logs']): Unit => {
  const unit = unitWith([
    {
      id: 'nop',
      supported_telemetry: ['logs'],
      config: [
        { name: 'sources', value: ['nop-input'] },
        { name: 'destinations', value: ['debug-out'] },
      ],
    },
    {
      id: 'main',
      supported_telemetry: ['logs'],
      config: [
        { name: 'sources', value: ['otlp-input'] },
        { name: 'processors', value: ['tag'] },
        { name: 'destinations', value: destinations },
      ],
    },
  ]);
  unit.unit.processors = [{ id: 'tag', type: 'add_fields', supported_telemetry: ['logs'] }];
  return unit;
};

const pipelineConfig = (unit: Unit, pipelineId: string) =>
  unit.unit.pipelines.find(({ id }) => id === pipelineId)?.config;

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
    const unit: Unit = {
      ...unitWith([]),
      unit: {
        ...unitWith([]).unit,
        sources: [
          {
            id: 'otlp-input',
            type: 'otlp',
            supported_telemetry: ['logs', 'metrics', 'traces'],
          },
        ],
        destinations: [
          { id: 'es-logs', type: 'elasticsearch', supported_telemetry: ['logs'] },
          { id: 'es-metrics', type: 'elasticsearch', supported_telemetry: ['metrics'] },
          { id: 'es-traces', type: 'elasticsearch', supported_telemetry: ['traces'] },
        ],
      },
    };
    const connected = connectSourceToDestination(unit, 'otlp-input', 'es-logs');

    expect(connected.unit.pipelines[0]?.supported_telemetry).toEqual(['logs']);
    expect(canConnectSourceToDestination(connected, 'otlp-input', 'es-metrics')).toBe(true);
    expect(canConnectSourceToDestination(connected, 'otlp-input', 'es-traces')).toBe(true);

    const withMetrics = connectSourceToDestination(connected, 'otlp-input', 'es-metrics');
    const next = connectSourceToDestination(withMetrics, 'otlp-input', 'es-traces');

    expect(next.unit.pipelines[0]?.config).toEqual([
      { name: 'sources', value: ['otlp-input'] },
      { name: 'destinations', value: ['es-logs', 'es-metrics', 'es-traces'] },
    ]);
    expect(next.unit.pipelines[0]?.supported_telemetry).toEqual(['logs', 'metrics', 'traces']);
    expect(getUnitConnections(next, configuredSources, configuredDestinations)).toEqual([
      { sourceId: 'otlp-input', destinationId: 'es-logs', forwarding: 'direct' },
      { sourceId: 'otlp-input', destinationId: 'es-metrics', forwarding: 'direct' },
      { sourceId: 'otlp-input', destinationId: 'es-traces', forwarding: 'direct' },
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

  it('puts a new source line beside a routing pipeline and leaves its rules as they are', () => {
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

  it('does not add a source line to an existing catch-all route', () => {
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

    expect(next.unit.pipelines[0]).toEqual(routed.unit.pipelines[0]);
    expect(next.unit.pipelines[1]?.config).toEqual([
      { name: 'sources', value: ['otlp-input'] },
      { name: 'destinations', value: ['es-metrics'] },
    ]);
  });

  it('refuses a processing line that would join a catch-all route with its own processors', () => {
    const routed = unitWith([
      {
        id: 'main',
        supported_telemetry: ['logs'],
        config: [
          { name: 'sources', value: ['otlp-input'] },
          { name: 'processors', value: ['enrich'] },
          { name: 'routes', value: [{ processors: ['tag'], destinations: ['es-logs'] }] },
        ],
      },
    ]);
    routed.unit.processors = [
      { id: 'enrich', type: 'add_fields', supported_telemetry: ['logs'] },
      { id: 'tag', type: 'add_fields', supported_telemetry: ['logs'] },
    ];
    const unprocessed = unitWith([
      {
        id: 'main',
        supported_telemetry: ['logs'],
        config: [
          { name: 'sources', value: ['otlp-input'] },
          { name: 'routes', value: [{ processors: ['tag'], destinations: ['es-logs'] }] },
        ],
      },
    ]);
    unprocessed.unit.processors = [
      { id: 'tag', type: 'add_fields', supported_telemetry: ['logs'] },
    ];

    expect(canConnectToDestination(routed, processing('main'), 'debug-out')).toBe(false);
    expect(connectToDestination(routed, processing('main'), 'debug-out')).toBe(routed);
    // A source line gets a pipeline of its own instead, so the route's processors do not apply.
    const next = connectSourceToDestination(unprocessed, 'otlp-input', 'debug-out');

    expect(next.unit.pipelines[0]).toEqual(unprocessed.unit.pipelines[0]);
    expect(next.unit.pipelines[1]?.config).toEqual([
      { name: 'sources', value: ['otlp-input'] },
      { name: 'destinations', value: ['debug-out'] },
    ]);
  });

  it('leaves routed lines to their rule when unhooking a source line', () => {
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
    expect(disconnectSourceFromDestination(routed, 'otlp-input', 'es-logs')).toBe(routed);
    expect(canDisconnectFromDestination(routed, source('otlp-input'), 'es-logs')).toBe(false);
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
      previousOrigin: source('otlp-input'),
      previousDestinationId: 'es-logs',
      origin: source('bulk-input'),
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
      previousOrigin: source('otlp-input'),
      previousDestinationId: 'es-logs',
      origin: source('otlp-input'),
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

  it('follows route delegation through processing pipelines', () => {
    const delegated = unitWith([
      {
        id: 'p-otlp-input',
        supported_telemetry: ['logs'],
        config: [
          { name: 'sources', value: ['otlp-input'] },
          { name: 'routes', value: [{ pipelines: ['processing-1'] }] },
        ],
      },
      {
        id: 'processing-1',
        supported_telemetry: ['logs'],
        config: [
          { name: 'processors', value: ['add-fields-1'] },
          { name: 'destinations', value: ['es-logs'] },
        ],
      },
    ]);

    expect(getUnitConnections(delegated, configuredSources, configuredDestinations)).toEqual([
      { sourceId: 'otlp-input', destinationId: 'es-logs', forwarding: 'route' },
    ]);
  });

  describe('with processing on the source pipeline', () => {
    it('stores a line from the source on a pipeline without processors', () => {
      const next = connectToDestination(processedUnit(), source('otlp-input'), 'es-metrics');

      expect(pipelineConfig(next, 'main')).toEqual(pipelineConfig(processedUnit(), 'main'));
      expect(pipelineConfig(next, 'p-otlp-input')).toEqual([
        { name: 'sources', value: ['otlp-input'] },
        { name: 'destinations', value: ['es-metrics'] },
      ]);
      expect(getUnitConnections(next, configuredSources, configuredDestinations)).toEqual([
        { sourceId: 'nop-input', destinationId: 'debug-out', forwarding: 'direct' },
        { sourceId: 'otlp-input', destinationId: 'es-logs', forwarding: 'direct' },
        { sourceId: 'otlp-input', destinationId: 'es-metrics', forwarding: 'direct' },
      ]);
    });

    it('stores a line from the processing node after its processors', () => {
      const next = connectToDestination(processedUnit(), processing('main'), 'es-metrics');

      expect(pipelineConfig(next, 'main')).toEqual([
        { name: 'sources', value: ['otlp-input'] },
        { name: 'processors', value: ['tag'] },
        { name: 'destinations', value: ['es-logs', 'es-metrics'] },
      ]);
      expect(next.unit.pipelines.map(({ id }) => id)).toEqual(['nop', 'main']);
    });

    it('refuses a second line to a destination the source already delivers to', () => {
      const unit = connectToDestination(processedUnit(), source('otlp-input'), 'es-metrics');

      expect(canConnectToDestination(unit, source('otlp-input'), 'es-logs')).toBe(false);
      expect(canConnectToDestination(unit, processing('main'), 'es-metrics')).toBe(false);
      expect(canConnectToDestination(unit, processing('main'), 'es-logs')).toBe(false);
      expect(canConnectToDestination(unit, processing('main'), 'debug-out')).toBe(true);
    });

    it('does not start lines from route processing', () => {
      const unit = unitWith([
        {
          id: 'main',
          supported_telemetry: ['logs'],
          config: [
            { name: 'sources', value: ['otlp-input'] },
            { name: 'routes', value: [{ processors: ['tag'], destinations: ['es-logs'] }] },
          ],
        },
      ]);

      expect(
        canConnectToDestination(
          unit,
          { kind: 'processing', ref: { kind: 'route', pipelineId: 'main', routeIndex: 0 } },
          'es-metrics'
        )
      ).toBe(false);
    });

    it('unhooks a line from the source without touching the processing pipeline', () => {
      const unit = connectToDestination(processedUnit(), source('otlp-input'), 'es-metrics');
      const next = disconnectFromDestination(unit, source('otlp-input'), 'es-metrics');

      expect(next).toEqual(processedUnit());
    });

    it('keeps the processing node and its processors when its last line is unhooked', () => {
      const next = disconnectFromDestination(processedUnit(), processing('main'), 'es-logs');

      expect(pipelineConfig(next, 'main')).toEqual([
        { name: 'sources', value: ['otlp-input'] },
        { name: 'processors', value: ['tag'] },
      ]);
      expect(next.unit.processors?.map(({ id }) => id)).toEqual(['tag']);
      expect(getPipelinesWithoutDestinations(next).map(({ id }) => id)).toEqual(['main']);
    });

    it('reconnects an unhooked processing node to another destination', () => {
      const unhooked = disconnectFromDestination(processedUnit(), processing('main'), 'es-logs');
      const next = connectToDestination(unhooked, processing('main'), 'es-metrics');

      expect(pipelineConfig(next, 'main')).toEqual([
        { name: 'sources', value: ['otlp-input'] },
        { name: 'processors', value: ['tag'] },
        { name: 'destinations', value: ['es-metrics'] },
      ]);
      expect(getPipelinesWithoutDestinations(next)).toEqual([]);
    });

    it('moves the last processed line onto another destination', () => {
      const next = moveUnitConnection(processedUnit(), {
        previousOrigin: processing('main'),
        previousDestinationId: 'es-logs',
        origin: processing('main'),
        destinationId: 'es-metrics',
      });

      expect(pipelineConfig(next, 'main')).toEqual([
        { name: 'sources', value: ['otlp-input'] },
        { name: 'processors', value: ['tag'] },
        { name: 'destinations', value: ['es-metrics'] },
      ]);
      expect(next.unit.processors?.map(({ id }) => id)).toEqual(['tag']);
    });

    it('moves a processed line onto the source so it carries unprocessed records', () => {
      const next = moveUnitConnection(processedUnit(['es-logs', 'es-metrics']), {
        previousOrigin: processing('main'),
        previousDestinationId: 'es-metrics',
        origin: source('otlp-input'),
        destinationId: 'es-metrics',
      });

      expect(pipelineConfig(next, 'main')).toEqual(pipelineConfig(processedUnit(), 'main'));
      expect(pipelineConfig(next, 'p-otlp-input')).toEqual([
        { name: 'sources', value: ['otlp-input'] },
        { name: 'destinations', value: ['es-metrics'] },
      ]);
    });

    it('judges a move with the dragged line released', () => {
      const move = {
        previousOrigin: processing('main'),
        previousDestinationId: 'es-logs',
        origin: source('otlp-input'),
        destinationId: 'es-logs',
      };

      expect(canConnectToDestination(processedUnit(), source('otlp-input'), 'es-logs')).toBe(false);
      expect(canMoveUnitConnection(processedUnit(), move)).toBe(true);
    });

    it('does not widen a processing pipeline for a destination it cannot carry', () => {
      const unit = processedUnit();
      unit.unit.destinations = [
        ...unit.unit.destinations,
        { id: 'es-metrics', type: 'elasticsearch', supported_telemetry: ['metrics'] },
      ];

      expect(canConnectToDestination(unit, processing('main'), 'es-metrics')).toBe(false);
    });

    it('only offers to detach lines stored on the origin pipeline', () => {
      expect(canDisconnectFromDestination(processedUnit(), processing('main'), 'es-logs')).toBe(
        true
      );
      expect(canDisconnectFromDestination(processedUnit(), source('nop-input'), 'debug-out')).toBe(
        true
      );
      expect(canDisconnectFromDestination(processedUnit(), source('otlp-input'), 'es-logs')).toBe(
        false
      );
    });
  });

  describe('signals of a pipeline whose lines change', () => {
    const mixedUnit = (): Unit => {
      const unit = unitWith([
        {
          id: 'p-mixed',
          supported_telemetry: ['metrics', 'traces'],
          config: [
            { name: 'sources', value: ['mixed'] },
            { name: 'destinations', value: ['only-metrics', 'only-traces'] },
          ],
        },
      ]);
      unit.unit.sources = [
        { id: 'mixed', type: 'otlp', supported_telemetry: ['metrics', 'traces'] },
      ];
      unit.unit.destinations = [
        { id: 'only-metrics', type: 'elasticsearch', supported_telemetry: ['metrics'] },
        { id: 'only-traces', type: 'elasticsearch', supported_telemetry: ['traces'] },
      ];
      return unit;
    };
    const signalsOf = (unit: Unit) =>
      Object.fromEntries(
        unit.unit.pipelines.map(({ id, supported_telemetry }) => [id, supported_telemetry])
      );

    it('splits the signals when a line moves onto its own pipeline', () => {
      const isolated = isolateSourceLine(mixedUnit(), 'mixed', 'only-traces');

      expect(signalsOf(isolated?.unit ?? mixedUnit())).toEqual({
        'p-mixed': ['metrics'],
        'p-mixed-2': ['traces'],
      });
    });

    it('drops a signal no remaining destination accepts', () => {
      const unhooked = disconnectFromDestination(mixedUnit(), source('mixed'), 'only-traces');
      const deleted = removeComponentFromPipelines(mixedUnit(), 'only-metrics');

      expect(signalsOf(unhooked)).toEqual({ 'p-mixed': ['metrics'] });
      expect(signalsOf(deleted)).toEqual({ 'p-mixed': ['traces'] });
    });

    it('widens again when the line comes back', () => {
      const unhooked = disconnectFromDestination(mixedUnit(), source('mixed'), 'only-traces');
      const reconnected = connectSourceToDestination(unhooked, 'mixed', 'only-traces');

      expect(signalsOf(reconnected)).toEqual({ 'p-mixed': ['metrics', 'traces'] });
    });
  });

  describe('with telemetry-scoped wiring', () => {
    const scoped = (processors: string[] = []): Unit => {
      const unit = unitWith([
        {
          id: 'split',
          supported_telemetry: ['logs', 'traces'],
          config: [
            { name: 'sources', value: ['otlp-input'] },
            ...(processors.length > 0 ? [{ name: 'processors' as const, value: processors }] : []),
            { name: 'destinations', value: ['es-logs'], telemetry: ['logs'] },
            { name: 'destinations', value: ['es-metrics'], telemetry: ['traces'] },
          ],
        },
      ]);
      unit.unit.processors = [{ id: 'tag', type: 'add_fields', supported_telemetry: ['logs'] }];
      return unit;
    };

    it('stores a new source line on a pipeline of its own', () => {
      const next = connectSourceToDestination(scoped(), 'otlp-input', 'debug-out');

      expect(pipelineConfig(next, 'split')).toEqual(pipelineConfig(scoped(), 'split'));
      expect(pipelineConfig(next, 'p-otlp-input')).toEqual([
        { name: 'sources', value: ['otlp-input'] },
        { name: 'destinations', value: ['debug-out'] },
      ]);
    });

    it('leaves its source lines in place', () => {
      expect(canDisconnectFromDestination(scoped(), source('otlp-input'), 'es-logs')).toBe(false);
      expect(disconnectFromDestination(scoped(), source('otlp-input'), 'es-logs')).toEqual(
        scoped()
      );
      expect(isolateSourceLine(scoped(), 'otlp-input', 'es-logs')).toBeUndefined();
    });

    it('does not wire its processing node', () => {
      const unit = scoped(['tag']);

      expect(canConnectToDestination(unit, processing('split'), 'debug-out')).toBe(false);
      expect(canDisconnectFromDestination(unit, processing('split'), 'es-logs')).toBe(false);
      expect(disconnectFromDestination(unit, processing('split'), 'es-logs')).toEqual(unit);
    });
  });

  describe('with route delegation', () => {
    const delegated = (child: Unit['unit']['pipelines'][number]['config']): Unit => {
      const unit = unitWith([
        {
          id: 'parent',
          supported_telemetry: ['logs'],
          config: [
            { name: 'sources', value: ['otlp-input'] },
            {
              name: 'routes',
              value: [
                { when: 'true', action: 'copy', pipelines: ['child'] },
                { destinations: ['es-logs'] },
              ],
            },
          ],
        },
        { id: 'child', supported_telemetry: ['logs'], config: child },
      ]);
      unit.unit.processors = [{ id: 'tag', type: 'add_fields', supported_telemetry: ['logs'] }];
      return unit;
    };

    it('refuses a child processing line to a destination its upstream source already reaches', () => {
      const unit = delegated([
        { name: 'processors', value: ['tag'] },
        { name: 'destinations', value: ['es-metrics'] },
      ]);

      expect(canConnectToDestination(unit, processing('child'), 'es-logs')).toBe(false);
      expect(canConnectToDestination(unit, processing('child'), 'debug-out')).toBe(true);
    });

    it('does not offer to detach a line drawn through a delegated pipeline', () => {
      const unit = delegated([{ name: 'destinations', value: ['es-metrics'] }]);

      expect(canDisconnectFromDestination(unit, source('otlp-input'), 'es-metrics')).toBe(false);
      // Routed lines are unhooked from the routing node's rule, not from the source.
      expect(canDisconnectFromDestination(unit, source('otlp-input'), 'es-logs')).toBe(false);
    });
  });

  describe('isolateSourceLine', () => {
    it('moves one fan-out line onto a pipeline of its own', () => {
      const unit = unitWith([
        {
          id: 'main',
          supported_telemetry: ['logs'],
          config: [
            { name: 'sources', value: ['otlp-input'] },
            { name: 'destinations', value: ['es-logs', 'es-metrics'] },
          ],
        },
      ]);
      const isolated = isolateSourceLine(unit, 'otlp-input', 'es-metrics');

      expect(isolated?.pipelineId).toBe('p-otlp-input');
      expect(isolated?.unit.unit.pipelines).toEqual([
        {
          id: 'main',
          supported_telemetry: ['logs'],
          config: [
            { name: 'sources', value: ['otlp-input'] },
            { name: 'destinations', value: ['es-logs'] },
          ],
        },
        {
          id: 'p-otlp-input',
          supported_telemetry: ['logs'],
          config: [
            { name: 'sources', value: ['otlp-input'] },
            { name: 'destinations', value: ['es-metrics'] },
          ],
        },
      ]);
    });

    it('leaves the other sources of a shared pipeline wired as they were', () => {
      const isolated = isolateSourceLine(unitWith([sharedPipeline()]), 'otlp-input', 'es-logs');
      const next = isolated?.unit ?? unitWith([]);

      expect(isolated?.pipelineId).toBe('p-otlp-input-2');
      expect(pipelineConfig(next, 'p-otlp-input-2')).toEqual([
        { name: 'sources', value: ['otlp-input'] },
        { name: 'destinations', value: ['es-logs'] },
      ]);
      expect(getUnitConnections(next, configuredSources, configuredDestinations)).toEqual(
        expect.arrayContaining(
          getUnitConnections(
            unitWith([sharedPipeline()]),
            configuredSources,
            configuredDestinations
          )
        )
      );
      expect(getUnitConnections(next, configuredSources, configuredDestinations)).toHaveLength(4);
    });

    it('does not move a line that a route rule carries', () => {
      const routed = unitWith([
        {
          id: 'main',
          supported_telemetry: ['logs'],
          config: [
            { name: 'sources', value: ['otlp-input'] },
            { name: 'routes', value: [{ destinations: ['es-logs', 'es-metrics'] }] },
          ],
        },
      ]);

      expect(isolateSourceLine(routed, 'otlp-input', 'es-logs')).toBeUndefined();
    });
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

describe('routing rule connections', () => {
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

    expect(canConnectRouteToTarget(routed, rule, destination('es-logs'))).toBe(false);
    expect(canConnectRouteToTarget(routed, rule, destination('es-metrics'))).toBe(true);

    const next = connectRouteToTarget(routed, rule, destination('es-metrics'));
    const routes = next.unit.pipelines[0]?.config.find((entry) => entry.name === 'routes');

    expect(next.unit.pipelines).toHaveLength(1);
    expect(routes?.value).toEqual([
      { when: 'body["service.name"] == "nginx"', destinations: ['es-logs', 'es-metrics'] },
      { destinations: ['debug-out'] },
    ]);
  });

  it("only routes a rule to destinations that accept the rule's telemetry", () => {
    const routed = unitWith([
      {
        id: 'main',
        supported_telemetry: ['logs', 'traces'],
        config: [
          { name: 'sources', value: ['otlp-input'] },
          {
            name: 'routes',
            value: [
              { telemetry: ['logs'], destinations: ['es-logs'] },
              { destinations: ['debug-out'] },
            ],
          },
        ],
      },
    ]);
    routed.unit.destinations = [
      { id: 'es-logs', type: 'elasticsearch', supported_telemetry: ['logs'] },
      { id: 'es-traces', type: 'elasticsearch', supported_telemetry: ['traces'] },
      { id: 'debug-out', type: 'debug', supported_telemetry: ['logs', 'traces'] },
    ];
    const logsRule = { pipelineId: 'main', ruleIndex: 0 };
    const catchAll = { pipelineId: 'main', ruleIndex: 1 };

    expect(canConnectRouteToTarget(routed, logsRule, destination('es-traces'))).toBe(false);
    expect(canConnectRouteToTarget(routed, catchAll, destination('es-traces'))).toBe(true);
    expect(
      moveRouteConnection(routed, {
        previousRule: logsRule,
        previousTarget: destination('es-logs'),
        rule: logsRule,
        target: destination('es-traces'),
      })
    ).toBe(routed);
  });

  it("reconnects a rule to a destination for its telemetry after the rule's line is dropped", () => {
    const routed = unitWith([
      {
        id: 'main',
        supported_telemetry: ['logs', 'traces'],
        config: [
          { name: 'sources', value: ['otlp-input'] },
          {
            name: 'routes',
            value: [
              { telemetry: ['traces'], destinations: ['es-traces'] },
              { destinations: ['es-logs'] },
            ],
          },
        ],
      },
    ]);
    routed.unit.destinations = [
      { id: 'es-logs', type: 'elasticsearch', supported_telemetry: ['logs'] },
      { id: 'es-traces', type: 'elasticsearch', supported_telemetry: ['traces'] },
    ];
    const tracesRule = { pipelineId: 'main', ruleIndex: 0 };

    const dropped = disconnectRouteFromTarget(routed, tracesRule, destination('es-traces'));
    expect(dropped.unit.pipelines[0]?.supported_telemetry).toEqual(['logs']);
    expect(canConnectRouteToTarget(dropped, tracesRule, destination('es-traces'))).toBe(true);

    const reconnected = connectRouteToTarget(dropped, tracesRule, destination('es-traces'));
    expect(reconnected.unit.pipelines[0]?.supported_telemetry).toEqual(['logs', 'traces']);
    expect(pipelineConfig(reconnected, 'main')).toEqual(pipelineConfig(routed, 'main'));
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
      canConnectRouteToTarget(
        routed,
        { pipelineId: 'main', ruleIndex: 0 },
        destination('es-metrics')
      )
    ).toBe(false);
    expect(
      canConnectRouteToTarget(
        routed,
        { pipelineId: 'main', ruleIndex: 1 },
        destination('es-metrics')
      )
    ).toBe(false);

    const next = connectRouteToTarget(
      routed,
      { pipelineId: 'child', ruleIndex: 0 },
      destination('es-metrics')
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
      disconnectRouteFromTarget(
        routed,
        { pipelineId: 'child', ruleIndex: 0 },
        destination('es-logs')
      )
    ).toBe(routed);
  });

  it('keeps a rule and its condition when its last destination is unhooked', () => {
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
    const next = disconnectRouteFromTarget(
      routed,
      { pipelineId: 'main', ruleIndex: 0 },
      destination('es-logs')
    );
    const routes = next.unit.pipelines[0]?.config.find((entry) => entry.name === 'routes');

    expect(routes?.value).toEqual([
      { when: 'body["service.name"] == "nginx"', destinations: [] },
      { destinations: ['es-metrics'] },
    ]);
    expect(disconnectSourceFromDestination(routed, 'otlp-input', 'es-metrics')).toBe(routed);

    const reconnected = connectRouteToTarget(
      next,
      { pipelineId: 'main', ruleIndex: 0 },
      destination('debug-out')
    );

    expect(
      reconnected.unit.pipelines[0]?.config.find((entry) => entry.name === 'routes')?.value
    ).toEqual([
      { when: 'body["service.name"] == "nginx"', destinations: ['debug-out'] },
      { destinations: ['es-metrics'] },
    ]);
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
      previousTarget: destination('es-logs'),
      rule: { pipelineId: 'main', ruleIndex: 1 },
      target: destination('es-logs'),
    });
    const routes = next.unit.pipelines[0]?.config.find((entry) => entry.name === 'routes');

    expect(routes?.value).toEqual([
      { when: 'true', destinations: [] },
      { destinations: ['es-metrics', 'es-logs'] },
    ]);
  });

  it('switches a single-target rule between a destination and a child pipeline', () => {
    const routed = unitWith([
      {
        id: 'main',
        supported_telemetry: ['logs'],
        config: [
          { name: 'sources', value: ['otlp-input'] },
          {
            name: 'routes',
            value: [{ when: 'true', action: 'copy', destinations: ['es-logs'] }],
          },
        ],
      },
      {
        id: 'child',
        supported_telemetry: ['logs'],
        config: [{ name: 'destinations', value: ['es-metrics'] }],
      },
    ]);
    const rule = { pipelineId: 'main', ruleIndex: 0 };
    const toChild = moveRouteConnection(routed, {
      previousRule: rule,
      previousTarget: destination('es-logs'),
      rule,
      target: pipelineTarget('child'),
    });

    expect(toChild.unit.pipelines[0]?.config[1]).toEqual({
      name: 'routes',
      value: [{ when: 'true', action: 'copy', pipelines: ['child'] }],
    });

    const back = moveRouteConnection(toChild, {
      previousRule: rule,
      previousTarget: pipelineTarget('child'),
      rule,
      target: destination('debug-out'),
    });

    expect(back.unit.pipelines[0]?.config[1]).toEqual({
      name: 'routes',
      value: [{ when: 'true', action: 'copy', destinations: ['debug-out'] }],
    });
    expect(back.unit.pipelines.map(({ id }) => id)).toEqual(['main', 'child']);
  });

  it('refuses routes that would loop back or mix destinations and pipelines', () => {
    const routed = unitWith([
      {
        id: 'main',
        supported_telemetry: ['logs'],
        config: [
          { name: 'sources', value: ['otlp-input'] },
          { name: 'routes', value: [{ destinations: ['es-logs', 'es-metrics'] }] },
        ],
      },
      {
        id: 'child',
        supported_telemetry: ['logs'],
        config: [{ name: 'routes', value: [{ pipelines: ['grandchild'] }] }],
      },
      {
        id: 'grandchild',
        supported_telemetry: ['logs'],
        config: [{ name: 'routes', value: [{ destinations: ['es-logs'] }] }],
      },
    ]);
    const mainRule = { pipelineId: 'main', ruleIndex: 0 };
    const grandchildRule = { pipelineId: 'grandchild', ruleIndex: 0 };

    expect(
      moveRouteConnection(routed, {
        previousRule: mainRule,
        previousTarget: destination('es-logs'),
        rule: mainRule,
        target: pipelineTarget('child'),
      })
    ).toBe(routed);
    expect(
      moveRouteConnection(routed, {
        previousRule: grandchildRule,
        previousTarget: destination('es-logs'),
        rule: grandchildRule,
        target: pipelineTarget('child'),
      })
    ).toBe(routed);
    expect(canConnectRouteToTarget(routed, mainRule, pipelineTarget('main'))).toBe(false);
  });
});

describe('addTestRoutingToLine', () => {
  it('moves a shared source line onto a routing pipeline with one placeholder rule', () => {
    const unit = unitWith([sharedPipeline()]);
    const next = addTestRoutingToLine(unit, source('otlp-input'), 'es-logs');

    expect(pipelineConfig(next, 'p-otlp-input-2')).toEqual([
      { name: 'sources', value: ['otlp-input'] },
      { name: 'routes', value: [{ when: 'true', destinations: ['es-logs'] }] },
    ]);
    expect(getUnitConnections(next, configuredSources, configuredDestinations)).toEqual(
      expect.arrayContaining([
        { sourceId: 'otlp-input', destinationId: 'es-logs', forwarding: 'route' },
        { sourceId: 'otlp-input', destinationId: 'es-metrics', forwarding: 'direct' },
        { sourceId: 'bulk-input', destinationId: 'es-logs', forwarding: 'direct' },
        { sourceId: 'bulk-input', destinationId: 'es-metrics', forwarding: 'direct' },
      ])
    );
  });

  it("routes a processing line that is its pipeline's only destination", () => {
    const unit = processedUnit(['es-logs']);
    const next = addTestRoutingToLine(unit, processing('main'), 'es-logs');

    expect(next.unit.pipelines.find(({ id }) => id === 'main')?.config).toEqual([
      { name: 'sources', value: ['otlp-input'] },
      { name: 'processors', value: ['tag'] },
      { name: 'routes', value: [{ when: 'true', destinations: ['es-logs'] }] },
    ]);
  });

  it('leaves lines it cannot route as they are', () => {
    const fanOut = processedUnit(['es-logs', 'es-metrics']);

    expect(addTestRoutingToLine(fanOut, processing('main'), 'es-logs')).toBe(fanOut);
    expect(addTestRoutingToLine(fanOut, source('otlp-input'), 'es-traces')).toBe(fanOut);
  });
});
