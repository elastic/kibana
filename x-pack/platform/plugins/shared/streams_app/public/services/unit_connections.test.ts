/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createDefaultUnit, type Unit } from './unit_repository';
import {
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
  isolateSourceLine,
  moveUnitConnection,
  removeComponentFromPipelines,
} from './unit_connections';

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
      expect(canDisconnectFromDestination(unit, source('otlp-input'), 'es-logs')).toBe(true);
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
