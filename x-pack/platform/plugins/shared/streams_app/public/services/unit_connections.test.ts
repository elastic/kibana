/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createDefaultUnit, type Unit } from './unit_repository';
import {
  canConnectLine,
  canEditPipelineRoutes,
  canRouteLine,
  getPipelineRoutes,
  getPipelineRoutingSignals,
  getRoutableLineSignals,
  routeLine,
  writePipelineRoutes,
  canConnectSourceToDestination,
  canMoveLine,
  connectLine,
  connectSourceToDestination,
  disconnectLine,
  disconnectSourceFromDestination,
  getUnconnectedPipelines,
  getUnfedDestinations,
  getUnitConnections,
  getUnreachableScopes,
  isolateSourceLine,
  moveLine,
  removeComponentFromPipelines,
  upstreamSignals,
  withPublishedTelemetry,
  withoutUnconnectedWiring,
  type RouteRuleRef,
  type UnitLineOrigin,
  type UnitLineTarget,
} from './unit_connections';

const destination = (id: string): UnitLineTarget => ({ kind: 'destination', id });
const pipelineTarget = (id: string): UnitLineTarget => ({ kind: 'pipeline', id });

const configuredSources = new Set(['nop-input', 'otlp-input', 'bulk-input']);
const configuredDestinations = new Set(['debug-out', 'es-logs', 'es-metrics', 'es-traces']);

const unitWith = (pipelines: Unit['unit']['pipelines']): Unit => ({
  ...createDefaultUnit(),
  unit: {
    ...createDefaultUnit().unit,
    pipelines,
  },
});

const source = (id: string): UnitLineOrigin => ({ kind: 'source', id });
const processing = (pipelineId: string): UnitLineOrigin => ({
  kind: 'processing',
  ref: { kind: 'pipeline', pipelineId },
});
const routeProcessing = (pipelineId: string, routeIndex: number): UnitLineOrigin => ({
  kind: 'processing',
  ref: { kind: 'route', pipelineId, routeIndex },
});
const rule = (pipelineId: string, ruleIndex: number): UnitLineOrigin => ({
  kind: 'rule',
  rule: { pipelineId, ruleIndex },
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

const routesOf = (unit: Unit, pipelineId: string) =>
  pipelineConfig(unit, pipelineId)?.find((entry) => entry.name === 'routes')?.value;

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
    const next = connectLine(unitWith([]), source('otlp-input'), destination('es-logs'));

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

  it('fans a source out to several destinations on the same source pipeline', () => {
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
    expect(canConnectLine(connected, source('otlp-input'), destination('es-metrics'))).toBe(true);
    expect(canConnectLine(connected, source('otlp-input'), destination('es-traces'))).toBe(true);

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

  it('puts a new direct source line beside a routing pipeline and leaves its rules as they are', () => {
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

  it('does not start direct lines from processing that feeds a routing node', () => {
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

    expect(canConnectLine(routed, processing('main'), destination('debug-out'))).toBe(false);
    expect(connectLine(routed, processing('main'), destination('debug-out'))).toBe(routed);
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

    expect(routesOf(next, 'main')).toEqual([
      { when: 'body["service.name"] == "nginx"', destinations: ['es-metrics'] },
    ]);
  });

  it('unhooks one line and leaves the source pipeline when another destination remains', () => {
    const connected = connectSourceToDestination(
      connectSourceToDestination(unitWith([]), 'otlp-input', 'es-logs'),
      'otlp-input',
      'es-metrics'
    );
    const next = disconnectLine(connected, source('otlp-input'), destination('es-logs'));

    expect(next.unit.pipelines[0]?.config).toEqual([
      { name: 'sources', value: ['otlp-input'] },
      { name: 'destinations', value: ['es-metrics'] },
    ]);
  });

  it('drops the source pipeline when its last line is unhooked', () => {
    const connected = connectSourceToDestination(createDefaultUnit(), 'otlp-input', 'es-logs');
    const next = disconnectLine(connected, source('otlp-input'), destination('es-logs'));

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
    const next = moveLine(connected, {
      previousOrigin: source('otlp-input'),
      previousTarget: destination('es-logs'),
      origin: source('bulk-input'),
      target: destination('es-logs'),
    });

    expect(getUnitConnections(next, configuredSources, configuredDestinations)).toEqual([
      { sourceId: 'bulk-input', destinationId: 'es-metrics', forwarding: 'direct' },
      { sourceId: 'bulk-input', destinationId: 'es-logs', forwarding: 'direct' },
    ]);
  });

  it('moves a line onto a free destination', () => {
    const connected = connectSourceToDestination(unitWith([]), 'otlp-input', 'es-logs');
    const next = moveLine(connected, {
      previousOrigin: source('otlp-input'),
      previousTarget: destination('es-logs'),
      origin: source('otlp-input'),
      target: destination('es-metrics'),
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

    expect(canConnectLine(unit, source('bulk-input'), destination('es-logs'))).toBe(false);
    expect(connectLine(unit, source('bulk-input'), destination('es-logs'))).toBe(unit);
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
      const next = connectLine(processedUnit(), source('otlp-input'), destination('es-metrics'));

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
      const next = connectLine(processedUnit(), processing('main'), destination('es-metrics'));

      expect(pipelineConfig(next, 'main')).toEqual([
        { name: 'sources', value: ['otlp-input'] },
        { name: 'processors', value: ['tag'] },
        { name: 'destinations', value: ['es-logs', 'es-metrics'] },
      ]);
      expect(next.unit.pipelines.map(({ id }) => id)).toEqual(['nop', 'main']);
    });

    it('refuses a second line to a destination the source already delivers to', () => {
      const unit = connectLine(processedUnit(), source('otlp-input'), destination('es-metrics'));

      expect(canConnectLine(unit, source('otlp-input'), destination('es-logs'))).toBe(false);
      expect(canConnectLine(unit, processing('main'), destination('es-metrics'))).toBe(false);
      expect(canConnectLine(unit, processing('main'), destination('es-logs'))).toBe(false);
      expect(canConnectLine(unit, processing('main'), destination('debug-out'))).toBe(true);
    });

    it('does not start direct lines from route processing or towards a pipeline', () => {
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

      // Route processing stands for its rule, which already has a target.
      expect(canConnectLine(unit, routeProcessing('main', 0), destination('es-metrics'))).toBe(
        true
      );
      expect(connectLine(unit, routeProcessing('main', 0), destination('es-metrics'))).toEqual(
        connectLine(unit, rule('main', 0), destination('es-metrics'))
      );
      expect(canConnectLine(processedUnit(), processing('main'), pipelineTarget('nop'))).toBe(
        false
      );
    });

    it('unhooks a line from the source without touching the processing pipeline', () => {
      const unit = connectLine(processedUnit(), source('otlp-input'), destination('es-metrics'));
      const next = disconnectLine(unit, source('otlp-input'), destination('es-metrics'));

      expect(next).toEqual(processedUnit());
    });

    it('keeps the processing node and its processors when its last line is unhooked', () => {
      const next = disconnectLine(processedUnit(), processing('main'), destination('es-logs'));

      expect(pipelineConfig(next, 'main')).toEqual([
        { name: 'sources', value: ['otlp-input'] },
        { name: 'processors', value: ['tag'] },
      ]);
      expect(next.unit.processors?.map(({ id }) => id)).toEqual(['tag']);
      expect(
        getUnconnectedPipelines(next).map(({ pipeline, reason }) => [pipeline.id, reason])
      ).toEqual([['main', 'noDestination']]);
    });

    it('reconnects an unhooked processing node to another destination', () => {
      const unhooked = disconnectLine(processedUnit(), processing('main'), destination('es-logs'));
      const next = connectLine(unhooked, processing('main'), destination('es-metrics'));

      expect(pipelineConfig(next, 'main')).toEqual([
        { name: 'sources', value: ['otlp-input'] },
        { name: 'processors', value: ['tag'] },
        { name: 'destinations', value: ['es-metrics'] },
      ]);
      expect(getUnconnectedPipelines(next)).toEqual([]);
    });

    it('moves the last processed line onto another destination', () => {
      const next = moveLine(processedUnit(), {
        previousOrigin: processing('main'),
        previousTarget: destination('es-logs'),
        origin: processing('main'),
        target: destination('es-metrics'),
      });

      expect(pipelineConfig(next, 'main')).toEqual([
        { name: 'sources', value: ['otlp-input'] },
        { name: 'processors', value: ['tag'] },
        { name: 'destinations', value: ['es-metrics'] },
      ]);
      expect(next.unit.processors?.map(({ id }) => id)).toEqual(['tag']);
    });

    it('moves a processed line onto the source so it carries unprocessed records', () => {
      const next = moveLine(processedUnit(['es-logs', 'es-metrics']), {
        previousOrigin: processing('main'),
        previousTarget: destination('es-metrics'),
        origin: source('otlp-input'),
        target: destination('es-metrics'),
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
        previousTarget: destination('es-logs'),
        origin: source('otlp-input'),
        target: destination('es-logs'),
      };

      expect(canConnectLine(processedUnit(), source('otlp-input'), destination('es-logs'))).toBe(
        false
      );
      expect(canMoveLine(processedUnit(), move)).toBe(true);
      expect(canMoveLine(processedUnit(), { ...move, origin: move.previousOrigin })).toBe(true);
    });

    it('wires a destination the processing node cannot feed yet, without widening, and reports it', () => {
      const unit = processedUnit();
      unit.unit.sources = [
        ...unit.unit.sources,
        { id: 'otlp-input', type: 'otlp', supported_telemetry: ['logs'] },
      ];
      unit.unit.destinations = [
        ...unit.unit.destinations,
        { id: 'es-metrics', type: 'elasticsearch', supported_telemetry: ['metrics'] },
      ];

      expect(canConnectLine(unit, processing('main'), destination('es-metrics'))).toBe(true);
      const next = connectLine(unit, processing('main'), destination('es-metrics'));
      expect(next.unit.pipelines[1]?.supported_telemetry).toEqual(['logs']);
      expect(getUnfedDestinations(next)).toEqual([
        { pipeline: next.unit.pipelines[1], destinationId: 'es-metrics' },
      ]);
      expect(withoutUnconnectedWiring(next)).toEqual(unit);
    });

    it('unhooks the source from its processing node and keeps the node', () => {
      const next = disconnectLine(processedUnit(), source('otlp-input'), pipelineTarget('main'));

      expect(pipelineConfig(next, 'main')).toEqual([
        { name: 'processors', value: ['tag'] },
        { name: 'destinations', value: ['es-logs'] },
      ]);
      expect(next.unit.processors?.map(({ id }) => id)).toEqual(['tag']);
      expect(
        getUnconnectedPipelines(next).map(({ pipeline, reason }) => [pipeline.id, reason])
      ).toEqual([['main', 'noSource']]);

      const reconnected = connectLine(next, source('bulk-input'), pipelineTarget('main'));
      expect(pipelineConfig(reconnected, 'main')).toEqual([
        { name: 'sources', value: ['bulk-input'] },
        { name: 'processors', value: ['tag'] },
        { name: 'destinations', value: ['es-logs'] },
      ]);
      expect(getUnconnectedPipelines(reconnected)).toEqual([]);
    });

    it('fans a second source in to the processing node', () => {
      const unit = processedUnit();
      expect(canConnectLine(unit, source('otlp-input'), pipelineTarget('main'))).toBe(false);
      expect(canConnectLine(unit, source('bulk-input'), pipelineTarget('main'))).toBe(true);

      const next = connectLine(unit, source('bulk-input'), pipelineTarget('main'));
      expect(pipelineConfig(next, 'main')).toEqual([
        { name: 'sources', value: ['otlp-input', 'bulk-input'] },
        { name: 'processors', value: ['tag'] },
        { name: 'destinations', value: ['es-logs'] },
      ]);
      expect(getUnitConnections(next, configuredSources, configuredDestinations)).toEqual(
        expect.arrayContaining([
          { sourceId: 'otlp-input', destinationId: 'es-logs', forwarding: 'direct' },
          { sourceId: 'bulk-input', destinationId: 'es-logs', forwarding: 'direct' },
        ])
      );
    });

    it('refuses to fan a source in when it already reaches what the pipeline feeds', () => {
      const unit = connectLine(processedUnit(), source('bulk-input'), destination('es-logs'));

      expect(canConnectLine(unit, source('bulk-input'), pipelineTarget('main'))).toBe(false);
    });

    it('moves the inbound line of a processing node onto another source', () => {
      const next = moveLine(processedUnit(), {
        previousOrigin: source('otlp-input'),
        previousTarget: pipelineTarget('main'),
        origin: source('bulk-input'),
        target: pipelineTarget('main'),
      });

      expect(pipelineConfig(next, 'main')).toEqual([
        { name: 'sources', value: ['bulk-input'] },
        { name: 'processors', value: ['tag'] },
        { name: 'destinations', value: ['es-logs'] },
      ]);
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
      const unhooked = disconnectLine(mixedUnit(), source('mixed'), destination('only-traces'));
      const deleted = removeComponentFromPipelines(mixedUnit(), 'only-metrics');

      expect(signalsOf(unhooked)).toEqual({ 'p-mixed': ['metrics'] });
      expect(signalsOf(deleted)).toEqual({ 'p-mixed': ['traces'] });
    });

    it('widens again when the line comes back', () => {
      const unhooked = disconnectLine(mixedUnit(), source('mixed'), destination('only-traces'));
      const reconnected = connectSourceToDestination(unhooked, 'mixed', 'only-traces');

      expect(signalsOf(reconnected)).toEqual({ 'p-mixed': ['metrics', 'traces'] });
    });

    /** `logs-in` + `traces-in` -> processing (`tag`) -> `es-logs` + `es-traces`. */
    const processedMixedUnit = (): Unit => {
      const unit = unitWith([
        {
          id: 'p-mixed',
          supported_telemetry: ['logs', 'traces'],
          config: [
            { name: 'sources', value: ['logs-in', 'traces-in'] },
            { name: 'processors', value: ['tag'] },
            { name: 'destinations', value: ['es-logs', 'es-traces'] },
          ],
        },
      ]);
      unit.unit.sources = [
        { id: 'logs-in', type: 'otlp', supported_telemetry: ['logs'] },
        { id: 'traces-in', type: 'otlp', supported_telemetry: ['traces'] },
      ];
      unit.unit.destinations = [
        { id: 'es-logs', type: 'elasticsearch', supported_telemetry: ['logs'] },
        { id: 'es-traces', type: 'elasticsearch', supported_telemetry: ['traces'] },
      ];
      unit.unit.processors = [{ id: 'tag', type: 'add_fields', supported_telemetry: ['logs'] }];
      return unit;
    };

    it('lets an unhooked source line of a processing node come back and widens again', () => {
      const unhooked = disconnectLine(
        processedMixedUnit(),
        source('traces-in'),
        pipelineTarget('p-mixed')
      );
      expect(signalsOf(unhooked)).toEqual({ 'p-mixed': ['logs'] });

      expect(canConnectLine(unhooked, source('traces-in'), pipelineTarget('p-mixed'))).toBe(true);
      const reconnected = connectLine(unhooked, source('traces-in'), pipelineTarget('p-mixed'));
      expect(signalsOf(reconnected)).toEqual({ 'p-mixed': ['logs', 'traces'] });
      expect(pipelineConfig(reconnected, 'p-mixed')).toEqual([
        { name: 'sources', value: ['logs-in', 'traces-in'] },
        { name: 'processors', value: ['tag'] },
        { name: 'destinations', value: ['es-logs', 'es-traces'] },
      ]);
    });

    it('lets an unhooked destination line of a processing node come back and widens again', () => {
      const unhooked = disconnectLine(
        processedMixedUnit(),
        processing('p-mixed'),
        destination('es-traces')
      );
      expect(signalsOf(unhooked)).toEqual({ 'p-mixed': ['logs'] });

      expect(canConnectLine(unhooked, processing('p-mixed'), destination('es-traces'))).toBe(true);
      const reconnected = connectLine(unhooked, processing('p-mixed'), destination('es-traces'));
      expect(signalsOf(reconnected)).toEqual({ 'p-mixed': ['logs', 'traces'] });
    });

    it('lets both traces lines of a processing node come back, in either order, after both were unhooked', () => {
      const sourceUnhooked = disconnectLine(
        processedMixedUnit(),
        source('traces-in'),
        pipelineTarget('p-mixed')
      );
      const bothUnhooked = disconnectLine(
        sourceUnhooked,
        processing('p-mixed'),
        destination('es-traces')
      );
      expect(signalsOf(bothUnhooked)).toEqual({ 'p-mixed': ['logs'] });
      expect(canConnectLine(bothUnhooked, source('traces-in'), pipelineTarget('p-mixed'))).toBe(
        true
      );
      expect(canConnectLine(bothUnhooked, processing('p-mixed'), destination('es-traces'))).toBe(
        true
      );

      const sourceFirst = connectLine(bothUnhooked, source('traces-in'), pipelineTarget('p-mixed'));
      expect(signalsOf(sourceFirst)).toEqual({ 'p-mixed': ['logs'] });
      expect(getUnfedDestinations(sourceFirst)).toEqual([]);
      expect(connectLine(sourceFirst, processing('p-mixed'), destination('es-traces'))).toEqual(
        processedMixedUnit()
      );

      const destinationFirst = connectLine(
        bothUnhooked,
        processing('p-mixed'),
        destination('es-traces')
      );
      expect(signalsOf(destinationFirst)).toEqual({ 'p-mixed': ['logs'] });
      expect(getUnfedDestinations(destinationFirst)).toEqual([
        { pipeline: destinationFirst.unit.pipelines[0], destinationId: 'es-traces' },
      ]);
      const bothBack = connectLine(
        destinationFirst,
        source('traces-in'),
        pipelineTarget('p-mixed')
      );
      expect(getUnfedDestinations(bothBack)).toEqual([]);
      expect(bothBack.unit.pipelines).toEqual([
        {
          ...processedMixedUnit().unit.pipelines[0],
          config: [
            { name: 'sources', value: ['logs-in', 'traces-in'] },
            { name: 'processors', value: ['tag'] },
            { name: 'destinations', value: ['es-logs', 'es-traces'] },
          ],
        },
      ]);
    });

    it('wires a source whose signals no destination of the processing node accepts, without widening', () => {
      const unit = processedMixedUnit();
      unit.unit.sources = [
        ...unit.unit.sources,
        { id: 'metrics-in', type: 'otlp', supported_telemetry: ['metrics'] },
      ];

      expect(canConnectLine(unit, source('metrics-in'), pipelineTarget('p-mixed'))).toBe(true);
      const next = connectLine(unit, source('metrics-in'), pipelineTarget('p-mixed'));
      expect(signalsOf(next)).toEqual({ 'p-mixed': ['logs', 'traces'] });
      expect(getUnfedDestinations(next)).toEqual([]);
      expect(withoutUnconnectedWiring(next)).toBe(next);
    });

    it('still refuses a source that shares no signal with a routing node', () => {
      const routed = unitWith([
        {
          id: 'router',
          supported_telemetry: ['logs'],
          config: [
            { name: 'sources', value: ['logs-in'] },
            { name: 'routes', value: [{ destinations: ['es-logs'] }] },
          ],
        },
      ]);
      routed.unit.sources = [
        { id: 'logs-in', type: 'otlp', supported_telemetry: ['logs'] },
        { id: 'traces-in', type: 'otlp', supported_telemetry: ['traces'] },
      ];

      expect(canConnectLine(routed, source('traces-in'), pipelineTarget('router'))).toBe(false);
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
      expect(disconnectLine(scoped(), source('otlp-input'), destination('es-logs'))).toEqual(
        scoped()
      );
      expect(isolateSourceLine(scoped(), 'otlp-input', 'es-logs')).toBeUndefined();
    });

    it('does not wire its processing node', () => {
      const unit = scoped(['tag']);

      expect(canConnectLine(unit, processing('split'), destination('debug-out'))).toBe(false);
      expect(canConnectLine(unit, source('bulk-input'), pipelineTarget('split'))).toBe(false);
      expect(disconnectLine(unit, processing('split'), destination('es-logs'))).toEqual(unit);
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

      expect(canConnectLine(unit, processing('child'), destination('es-logs'))).toBe(false);
      expect(canConnectLine(unit, processing('child'), destination('debug-out'))).toBe(true);
    });

    it('refuses a source dropped on a delegated child', () => {
      const unit = delegated([
        { name: 'processors', value: ['tag'] },
        { name: 'destinations', value: ['es-metrics'] },
      ]);

      expect(canConnectLine(unit, source('bulk-input'), pipelineTarget('child'))).toBe(false);
    });

    it('keeps the child and the rule, both unconnected, when its delegation is unhooked', () => {
      const unit = delegated([
        { name: 'processors', value: ['tag'] },
        { name: 'destinations', value: ['es-metrics'] },
      ]);
      const next = disconnectLine(unit, rule('parent', 0), pipelineTarget('child'));

      expect(routesOf(next, 'parent')).toEqual([
        { when: 'true', action: 'copy', pipelines: [] },
        { destinations: ['es-logs'] },
      ]);
      expect(pipelineConfig(next, 'child')).toEqual(pipelineConfig(unit, 'child'));
      expect(
        getUnconnectedPipelines(next).map(({ pipeline, reason }) => [pipeline.id, reason])
      ).toEqual([
        ['parent', 'noRuleTarget'],
        ['child', 'noSource'],
      ]);

      const reconnected = connectLine(next, rule('parent', 0), pipelineTarget('child'));
      expect(reconnected).toEqual(unit);
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

  it('keeps a processing pipeline the user already left unhooked when another component is deleted', () => {
    const unhooked = unitWith([
      {
        id: 'p-otlp',
        supported_telemetry: ['logs'],
        config: [
          { name: 'sources', value: ['otlp-input'] },
          { name: 'processors', value: ['tag'] },
        ],
      },
    ]);
    const next = removeComponentFromPipelines(unhooked, 'es-logs');

    expect(next.unit.pipelines).toEqual(unhooked.unit.pipelines);
  });
});

describe('routing node connections', () => {
  const routingUnit = (): Unit =>
    unitWith([
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

  it('fans a second source in to the routing node', () => {
    const unit = routingUnit();

    expect(canConnectLine(unit, source('otlp-input'), pipelineTarget('main'))).toBe(false);
    expect(canConnectLine(unit, source('bulk-input'), pipelineTarget('main'))).toBe(true);

    const next = connectLine(unit, source('bulk-input'), pipelineTarget('main'));
    expect(pipelineConfig(next, 'main')?.[0]).toEqual({
      name: 'sources',
      value: ['otlp-input', 'bulk-input'],
    });
    expect(routesOf(next, 'main')).toEqual(routesOf(unit, 'main'));
  });

  it('widens a routing pipeline to the signals a fanned-in source sends', () => {
    const unit = routingUnit();
    unit.unit.sources = [
      { id: 'otlp-input', type: 'otlp', supported_telemetry: ['logs'] },
      { id: 'bulk-input', type: 'bulk', supported_telemetry: ['logs', 'metrics'] },
      { id: 'docs-input', type: 'bulk', supported_telemetry: ['docs'] },
    ];

    expect(canConnectLine(unit, source('docs-input'), pipelineTarget('main'))).toBe(false);
    const next = connectLine(unit, source('bulk-input'), pipelineTarget('main'));
    expect(next.unit.pipelines[0]?.supported_telemetry).toEqual(['logs', 'metrics']);
  });

  it('unhooks a source from the routing node and keeps the node and its rules', () => {
    const unit = routingUnit();
    const next = disconnectLine(unit, source('otlp-input'), pipelineTarget('main'));

    expect(pipelineConfig(next, 'main')).toEqual([
      { name: 'routes', value: routesOf(unit, 'main') },
    ]);
    expect(
      getUnconnectedPipelines(next).map(({ pipeline, reason }) => [pipeline.id, reason])
    ).toEqual([['main', 'noSource']]);
    expect(connectLine(next, source('otlp-input'), pipelineTarget('main'))).toEqual(unit);
  });

  it('moves a source from a direct line onto a routing node and back', () => {
    const unit = connectLine(routingUnit(), source('bulk-input'), destination('es-metrics'));
    const moved = moveLine(unit, {
      previousOrigin: source('bulk-input'),
      previousTarget: destination('es-metrics'),
      origin: source('bulk-input'),
      target: pipelineTarget('main'),
    });

    expect(moved.unit.pipelines.map(({ id }) => id)).toEqual(['main']);
    expect(pipelineConfig(moved, 'main')?.[0]).toEqual({
      name: 'sources',
      value: ['otlp-input', 'bulk-input'],
    });

    const back = moveLine(moved, {
      previousOrigin: source('bulk-input'),
      previousTarget: pipelineTarget('main'),
      origin: source('bulk-input'),
      target: destination('es-metrics'),
    });
    expect(back).toEqual(unit);
  });

  it('refuses a routing node the source already feeds through delegation', () => {
    const unit = unitWith([
      {
        id: 'parent',
        supported_telemetry: ['logs'],
        config: [
          { name: 'sources', value: ['otlp-input'] },
          { name: 'routes', value: [{ pipelines: ['child'] }] },
        ],
      },
      {
        id: 'child',
        supported_telemetry: ['logs'],
        config: [{ name: 'routes', value: [{ destinations: ['es-logs'] }] }],
      },
    ]);

    expect(canConnectLine(unit, source('otlp-input'), pipelineTarget('child'))).toBe(false);
    expect(canConnectLine(unit, source('bulk-input'), pipelineTarget('child'))).toBe(false);
    expect(canConnectLine(unit, source('bulk-input'), pipelineTarget('parent'))).toBe(true);
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

    expect(canConnectLine(routed, rule('main', 0), destination('es-logs'))).toBe(false);
    expect(canConnectLine(routed, rule('main', 0), destination('es-metrics'))).toBe(true);

    const next = connectLine(routed, rule('main', 0), destination('es-metrics'));

    expect(next.unit.pipelines).toHaveLength(1);
    expect(routesOf(next, 'main')).toEqual([
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

    expect(canConnectLine(routed, rule('main', 0), destination('es-traces'))).toBe(false);
    expect(canConnectLine(routed, rule('main', 1), destination('es-traces'))).toBe(true);
    expect(
      moveLine(routed, {
        previousOrigin: rule('main', 0),
        previousTarget: destination('es-logs'),
        origin: rule('main', 0),
        target: destination('es-traces'),
      })
    ).toBe(routed);
  });

  it.each([
    ['its own telemetry', { telemetry: ['traces' as const] }],
    ["the pipeline's supported telemetry", {}],
  ])(
    "reconnects a rule to a destination for %s after the rule's line is dropped",
    (_, ruleTelemetry) => {
      const routed = unitWith([
        {
          id: 'main',
          supported_telemetry: ['logs', 'traces'],
          config: [
            { name: 'sources', value: ['otlp-input'] },
            {
              name: 'routes',
              value: [
                { ...ruleTelemetry, when: 'true', destinations: ['es-traces'] },
                { telemetry: ['logs'], destinations: ['es-logs'] },
              ],
            },
          ],
        },
      ]);
      routed.unit.destinations = [
        { id: 'es-logs', type: 'elasticsearch', supported_telemetry: ['logs'] },
        { id: 'es-traces', type: 'elasticsearch', supported_telemetry: ['traces'] },
      ];

      const dropped = disconnectLine(routed, rule('main', 0), destination('es-traces'));
      expect(dropped.unit.pipelines[0]?.supported_telemetry).toEqual(['logs', 'traces']);
      expect(canConnectLine(dropped, rule('main', 0), destination('es-traces'))).toBe(true);

      const reconnected = connectLine(dropped, rule('main', 0), destination('es-traces'));
      expect(reconnected).toEqual(routed);
    }
  );

  it('rewrites a rule inside its own routes entry when the pipeline has several', () => {
    const split = unitWith([
      {
        id: 'main',
        supported_telemetry: ['logs'],
        config: [
          { name: 'sources', value: ['otlp-input'] },
          { name: 'routes', value: [{ when: 'a', destinations: ['es-logs'] }] },
          {
            name: 'routes',
            value: [{ when: 'b', destinations: ['es-logs'] }, { destinations: ['debug-out'] }],
          },
        ],
      },
    ]);

    const unhooked = disconnectLine(split, rule('main', 1), destination('es-logs'));
    expect(pipelineConfig(unhooked, 'main')).toEqual([
      { name: 'sources', value: ['otlp-input'] },
      { name: 'routes', value: [{ when: 'a', destinations: ['es-logs'] }] },
      {
        name: 'routes',
        value: [{ when: 'b', destinations: [] }, { destinations: ['debug-out'] }],
      },
    ]);

    const reconnected = connectLine(unhooked, rule('main', 1), destination('es-metrics'));
    expect(pipelineConfig(reconnected, 'main')).toEqual([
      { name: 'sources', value: ['otlp-input'] },
      { name: 'routes', value: [{ when: 'a', destinations: ['es-logs'] }] },
      {
        name: 'routes',
        value: [{ when: 'b', destinations: ['es-metrics'] }, { destinations: ['debug-out'] }],
      },
    ]);
  });

  describe('signals a rule carries', () => {
    const unitWithSignals = (
      pipelines: Unit['unit']['pipelines'],
      sourceSignals: Array<'logs' | 'metrics' | 'traces'> = ['logs', 'metrics']
    ): Unit => {
      const unit = unitWith(pipelines);
      unit.unit.sources = [{ id: 'otlp-input', type: 'otlp', supported_telemetry: sourceSignals }];
      unit.unit.destinations = [
        { id: 'es-logs', type: 'elasticsearch', supported_telemetry: ['logs'] },
        { id: 'es-metrics', type: 'elasticsearch', supported_telemetry: ['metrics'] },
      ];
      return unit;
    };

    it('come from the sources, so a narrowed pipeline widens again when a rule reconnects', () => {
      const narrowed = unitWithSignals([
        {
          id: 'main',
          supported_telemetry: ['logs'],
          config: [
            { name: 'sources', value: ['otlp-input'] },
            {
              name: 'routes',
              value: [{ when: 'x', destinations: [] }, { destinations: ['es-logs'] }],
            },
          ],
        },
      ]);

      expect(upstreamSignals(narrowed, 'main')).toEqual(['logs', 'metrics']);
      expect(canConnectLine(narrowed, rule('main', 0), destination('es-metrics'))).toBe(true);

      const next = connectLine(narrowed, rule('main', 0), destination('es-metrics'));
      expect(next.unit.pipelines[0]?.supported_telemetry).toEqual(['logs', 'metrics']);
    });

    it('cannot draw a line for a signal no source sends', () => {
      const unit = unitWithSignals(
        [
          {
            id: 'main',
            supported_telemetry: ['logs', 'metrics'],
            config: [
              { name: 'sources', value: ['otlp-input'] },
              { name: 'routes', value: [{ when: 'x', telemetry: ['metrics'], destinations: [] }] },
            ],
          },
        ],
        ['logs']
      );

      expect(canConnectLine(unit, rule('main', 0), destination('es-metrics'))).toBe(false);
      expect(canConnectLine(unit, rule('main', 0), destination('es-logs'))).toBe(false);
    });

    it('follow delegation into a child, narrowed by each routes entry and route', () => {
      const unit = unitWithSignals([
        {
          id: 'parent',
          supported_telemetry: ['logs', 'metrics'],
          config: [
            { name: 'sources', value: ['otlp-input'] },
            { name: 'routes', value: [{ pipelines: ['child'] }], telemetry: ['logs'] },
            { name: 'routes', value: [{ destinations: ['es-metrics'] }], telemetry: ['metrics'] },
          ],
        },
        {
          id: 'child',
          supported_telemetry: ['logs', 'metrics'],
          config: [{ name: 'routes', value: [{ destinations: [] }] }],
        },
      ]);

      expect(upstreamSignals(unit, 'child')).toEqual(['logs']);
      expect(canConnectLine(unit, rule('child', 0), destination('es-metrics'))).toBe(false);
      expect(canConnectLine(unit, rule('child', 0), destination('es-logs'))).toBe(true);
    });

    it('fall back to the declared signals of a pipeline nothing feeds', () => {
      const unit = unitWithSignals([
        {
          id: 'lonely',
          supported_telemetry: ['metrics'],
          config: [{ name: 'routes', value: [{ destinations: [] }] }],
        },
      ]);

      expect(upstreamSignals(unit, 'lonely')).toEqual(['metrics']);
      expect(canConnectLine(unit, rule('lonely', 0), destination('es-metrics'))).toBe(true);
    });
  });

  describe('withPublishedTelemetry', () => {
    it('narrows a routing pipeline to the signals its routes still export', () => {
      const routed = unitWith([
        {
          id: 'main',
          supported_telemetry: ['logs', 'traces'],
          config: [
            { name: 'sources', value: ['otlp-input'] },
            { name: 'routes', value: [{ destinations: ['es-logs', 'es-traces'] }] },
          ],
        },
      ]);
      routed.unit.destinations = [
        { id: 'es-logs', type: 'elasticsearch', supported_telemetry: ['logs'] },
        { id: 'es-traces', type: 'elasticsearch', supported_telemetry: ['traces'] },
      ];

      expect(withPublishedTelemetry(routed)).toEqual(routed);

      const dropped = disconnectLine(routed, rule('main', 0), destination('es-traces'));
      expect(dropped.unit.pipelines[0]?.supported_telemetry).toEqual(['logs', 'traces']);
      expect(withPublishedTelemetry(dropped).unit.pipelines[0]?.supported_telemetry).toEqual([
        'logs',
      ]);
    });

    it('clamps a pipeline, its routes and its entries to what its sources send and children accept', () => {
      const unit = unitWith([
        {
          id: 'parent',
          supported_telemetry: ['logs', 'metrics', 'traces'],
          config: [
            { name: 'sources', value: ['otlp-input'] },
            {
              name: 'routes',
              value: [
                { when: 'x', telemetry: ['logs', 'traces'], pipelines: ['child'] },
                { destinations: ['es-metrics'] },
              ],
            },
          ],
        },
        {
          id: 'child',
          supported_telemetry: ['logs', 'metrics', 'traces'],
          config: [
            { name: 'processors', value: ['tag'], telemetry: ['logs', 'metrics'] },
            { name: 'destinations', value: ['es-logs'] },
          ],
        },
      ]);
      unit.unit.sources = [
        { id: 'otlp-input', type: 'otlp', supported_telemetry: ['logs', 'metrics'] },
      ];
      unit.unit.destinations = [
        { id: 'es-logs', type: 'elasticsearch', supported_telemetry: ['logs'] },
        { id: 'es-metrics', type: 'elasticsearch', supported_telemetry: ['metrics'] },
      ];

      const published = withPublishedTelemetry(unit);

      expect(published.unit.pipelines).toEqual([
        {
          id: 'parent',
          supported_telemetry: ['logs', 'metrics'],
          config: [
            { name: 'sources', value: ['otlp-input'] },
            {
              name: 'routes',
              value: [
                { when: 'x', telemetry: ['logs'], pipelines: ['child'] },
                { destinations: ['es-metrics'] },
              ],
            },
          ],
        },
        {
          id: 'child',
          supported_telemetry: ['logs'],
          config: [
            { name: 'processors', value: ['tag'], telemetry: ['logs'] },
            { name: 'destinations', value: ['es-logs'] },
          ],
        },
      ]);
      expect(withPublishedTelemetry(published)).toEqual(published);
    });
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

    expect(canConnectLine(routed, rule('main', 0), destination('es-metrics'))).toBe(false);
    expect(canConnectLine(routed, rule('main', 1), destination('es-metrics'))).toBe(false);

    const next = connectLine(routed, rule('child', 0), destination('es-metrics'));

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

    expect(disconnectLine(routed, rule('child', 0), destination('es-logs'))).toBe(routed);
    expect(
      canMoveLine(routed, {
        previousOrigin: rule('child', 0),
        previousTarget: destination('es-logs'),
        origin: rule('child', 0),
        target: destination('es-metrics'),
      })
    ).toBe(true);
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
    const next = disconnectLine(routed, rule('main', 0), destination('es-logs'));

    expect(routesOf(next, 'main')).toEqual([
      { when: 'body["service.name"] == "nginx"', destinations: [] },
      { destinations: ['es-metrics'] },
    ]);
    expect(disconnectSourceFromDestination(routed, 'otlp-input', 'es-metrics')).toBe(routed);

    const reconnected = connectLine(next, rule('main', 0), destination('debug-out'));

    expect(routesOf(reconnected, 'main')).toEqual([
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
    const next = moveLine(routed, {
      previousOrigin: rule('main', 0),
      previousTarget: destination('es-logs'),
      origin: rule('main', 1),
      target: destination('es-logs'),
    });

    expect(routesOf(next, 'main')).toEqual([
      { when: 'true', destinations: [] },
      { destinations: ['es-metrics', 'es-logs'] },
    ]);
  });

  it('moves the line of a route processing node as the line of its rule', () => {
    const routed = unitWith([
      {
        id: 'main',
        supported_telemetry: ['logs'],
        config: [
          { name: 'sources', value: ['otlp-input'] },
          { name: 'routes', value: [{ processors: ['tag'], destinations: ['es-logs'] }] },
        ],
      },
    ]);
    const next = moveLine(routed, {
      previousOrigin: routeProcessing('main', 0),
      previousTarget: destination('es-logs'),
      origin: routeProcessing('main', 0),
      target: destination('es-metrics'),
    });

    expect(routesOf(next, 'main')).toEqual([{ processors: ['tag'], destinations: ['es-metrics'] }]);
    expect(
      canMoveLine(routed, {
        previousOrigin: routeProcessing('main', 0),
        previousTarget: destination('es-logs'),
        origin: rule('main', 0),
        target: destination('es-logs'),
      })
    ).toBe(true);
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
    const toChild = moveLine(routed, {
      previousOrigin: rule('main', 0),
      previousTarget: destination('es-logs'),
      origin: rule('main', 0),
      target: pipelineTarget('child'),
    });

    expect(toChild.unit.pipelines[0]?.config[1]).toEqual({
      name: 'routes',
      value: [{ when: 'true', action: 'copy', pipelines: ['child'] }],
    });

    const back = moveLine(toChild, {
      previousOrigin: rule('main', 0),
      previousTarget: pipelineTarget('child'),
      origin: rule('main', 0),
      target: destination('debug-out'),
    });

    expect(back.unit.pipelines[0]?.config[1]).toEqual({
      name: 'routes',
      value: [{ when: 'true', action: 'copy', destinations: ['debug-out'] }],
    });
    expect(back.unit.pipelines.map(({ id }) => id)).toEqual(['main', 'child']);
  });

  it('refuses routes that would loop back, target a source pipeline, or mix destinations and pipelines', () => {
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
      {
        id: 'other-root',
        supported_telemetry: ['logs'],
        config: [
          { name: 'sources', value: ['bulk-input'] },
          { name: 'routes', value: [{ destinations: ['debug-out'] }] },
        ],
      },
    ]);
    const mainRule: RouteRuleRef = { pipelineId: 'main', ruleIndex: 0 };

    expect(
      moveLine(routed, {
        previousOrigin: rule('main', 0),
        previousTarget: destination('es-logs'),
        origin: rule('main', 0),
        target: pipelineTarget('child'),
      })
    ).toBe(routed);
    expect(
      moveLine(routed, {
        previousOrigin: rule('grandchild', 0),
        previousTarget: destination('es-logs'),
        origin: rule('grandchild', 0),
        target: pipelineTarget('child'),
      })
    ).toBe(routed);
    expect(canConnectLine(routed, { kind: 'rule', rule: mainRule }, pipelineTarget('main'))).toBe(
      false
    );
    expect(canConnectLine(routed, rule('grandchild', 0), pipelineTarget('other-root'))).toBe(false);
  });
});

describe('withoutUnconnectedWiring', () => {
  it('keeps each telemetry-scoped routes entry its own rules and returns a connected unit as is', () => {
    const unit = unitWith([
      {
        id: 'main',
        supported_telemetry: ['logs', 'metrics'],
        config: [
          { name: 'sources', value: ['otlp-input'] },
          { name: 'routes', value: [{ destinations: ['es-logs'] }], telemetry: ['logs'] },
          { name: 'routes', value: [{ destinations: ['es-metrics'] }], telemetry: ['metrics'] },
        ],
      },
    ]);

    expect(withoutUnconnectedWiring(unit)).toBe(unit);
  });

  it('drops an unhooked rule from its own entry, then the pipelines left unconnected', () => {
    const unit = unitWith([
      {
        id: 'main',
        supported_telemetry: ['logs', 'metrics'],
        config: [
          { name: 'sources', value: ['otlp-input'] },
          { name: 'routes', value: [{ when: 'x', destinations: [] }], telemetry: ['logs'] },
          { name: 'routes', value: [{ pipelines: ['child'] }], telemetry: ['metrics'] },
        ],
      },
      {
        id: 'child',
        supported_telemetry: ['metrics'],
        config: [{ name: 'processors', value: [] }],
      },
    ]);

    expect(withoutUnconnectedWiring(unit).unit.pipelines).toEqual([]);
  });

  describe('scoped wiring whose signal no source sends any more', () => {
    /** `logs-in` + `metrics-in` -> router with one rule per signal. */
    const splitRouter = (): Unit => {
      const unit = unitWith([
        {
          id: 'main',
          supported_telemetry: ['logs', 'metrics'],
          config: [
            { name: 'sources', value: ['logs-in', 'metrics-in'] },
            {
              name: 'routes',
              value: [
                { telemetry: ['logs'], destinations: ['es-logs'] },
                { telemetry: ['metrics'], destinations: ['es-metrics'] },
              ],
            },
          ],
        },
      ]);
      unit.unit.sources = [
        { id: 'logs-in', type: 'otlp', supported_telemetry: ['logs'] },
        { id: 'metrics-in', type: 'otlp', supported_telemetry: ['metrics'] },
      ];
      unit.unit.destinations = [
        { id: 'es-logs', type: 'elasticsearch', supported_telemetry: ['logs'] },
        { id: 'es-metrics', type: 'elasticsearch', supported_telemetry: ['metrics'] },
      ];
      return unit;
    };

    it('is reported once the source is unhooked, and not while it is connected', () => {
      expect(getUnreachableScopes(splitRouter())).toEqual([]);

      const unhooked = disconnectLine(splitRouter(), source('metrics-in'), pipelineTarget('main'));
      expect(withPublishedTelemetry(unhooked).unit.pipelines[0]?.supported_telemetry).toEqual([
        'logs',
      ]);
      expect(getUnreachableScopes(unhooked)).toEqual([
        { pipeline: unhooked.unit.pipelines[0], telemetry: ['metrics'] },
      ]);
    });

    it('is dropped from the published copy while the other rule stays', () => {
      const unhooked = disconnectLine(splitRouter(), source('metrics-in'), pipelineTarget('main'));

      expect(withoutUnconnectedWiring(unhooked).unit.pipelines).toEqual([
        {
          id: 'main',
          supported_telemetry: ['logs', 'metrics'],
          config: [
            { name: 'sources', value: ['logs-in'] },
            { name: 'routes', value: [{ telemetry: ['logs'], destinations: ['es-logs'] }] },
          ],
        },
      ]);
    });

    it('is reachable again when the source comes back', () => {
      const unhooked = disconnectLine(splitRouter(), source('metrics-in'), pipelineTarget('main'));
      const reconnected = connectLine(unhooked, source('metrics-in'), pipelineTarget('main'));

      expect(reconnected).toEqual(splitRouter());
      expect(getUnreachableScopes(reconnected)).toEqual([]);
    });

    it('reports an unscoped rule destination nothing reaches any more and drops it from the published copy', () => {
      const router = splitRouter();
      router.unit.pipelines[0].config = [
        { name: 'sources', value: ['logs-in', 'metrics-in'] },
        {
          name: 'routes',
          value: [{ when: 'x', destinations: ['es-metrics'] }, { destinations: ['es-logs'] }],
        },
      ];
      const unhooked = disconnectLine(router, source('metrics-in'), pipelineTarget('main'));

      expect(getUnreachableScopes(unhooked)).toEqual([]);
      expect(getUnfedDestinations(unhooked)).toEqual([
        { pipeline: unhooked.unit.pipelines[0], destinationId: 'es-metrics' },
      ]);
      expect(withoutUnconnectedWiring(unhooked).unit.pipelines[0]?.config).toEqual([
        { name: 'sources', value: ['logs-in'] },
        { name: 'routes', value: [{ destinations: ['es-logs'] }] },
      ]);
    });
  });
});

describe('getUnconnectedPipelines', () => {
  it('reports pipelines that forward nowhere and pipelines nothing feeds', () => {
    const unit = unitWith([
      {
        id: 'root',
        supported_telemetry: ['logs'],
        config: [
          { name: 'sources', value: ['otlp-input'] },
          { name: 'routes', value: [{ pipelines: ['child'] }] },
        ],
      },
      {
        id: 'child',
        supported_telemetry: ['logs'],
        config: [{ name: 'processors', value: ['tag'] }],
      },
      {
        id: 'lonely',
        supported_telemetry: ['logs'],
        config: [
          { name: 'processors', value: ['tag'] },
          { name: 'destinations', value: ['es-logs'] },
        ],
      },
    ]);

    expect(
      getUnconnectedPipelines(unit).map(({ pipeline, reason }) => [pipeline.id, reason])
    ).toEqual([
      ['child', 'noDestination'],
      ['lonely', 'noSource'],
    ]);
  });

  it('reports a routing pipeline with a rule left without a target', () => {
    const unit = unitWith([
      {
        id: 'root',
        supported_telemetry: ['logs'],
        config: [
          { name: 'sources', value: ['otlp-input'] },
          {
            name: 'routes',
            value: [{ when: 'true', destinations: [] }, { destinations: ['es-logs'] }],
          },
        ],
      },
      {
        id: 'delegating',
        supported_telemetry: ['logs'],
        config: [
          { name: 'sources', value: ['otlp-input'] },
          { name: 'routes', value: [{ pipelines: [] }] },
        ],
      },
    ]);

    expect(
      getUnconnectedPipelines(unit).map(({ pipeline, reason }) => [pipeline.id, reason])
    ).toEqual([
      ['root', 'noRuleTarget'],
      ['delegating', 'noRuleTarget'],
    ]);
  });
});

describe('routeLine', () => {
  const routes = [
    { destinations: ['es-logs'] },
    { when: 'body == "x"', action: 'copy' as const, destinations: [] },
  ];

  it('moves a shared source line onto a routing pipeline with the given rules', () => {
    const unit = unitWith([sharedPipeline()]);
    const line = { origin: source('otlp-input'), destinationId: 'es-logs' };
    expect(canRouteLine(unit, line)).toBe(true);
    const next = routeLine(unit, line, routes);

    expect(pipelineConfig(next, 'p-otlp-input-2')).toEqual([
      { name: 'sources', value: ['otlp-input'] },
      { name: 'routes', value: routes },
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
    const next = routeLine(unit, { origin: processing('main'), destinationId: 'es-logs' }, routes);

    expect(next.unit.pipelines.find(({ id }) => id === 'main')?.config).toEqual([
      { name: 'sources', value: ['otlp-input'] },
      { name: 'processors', value: ['tag'] },
      { name: 'routes', value: routes },
    ]);
  });

  it('leaves lines it cannot route as they are', () => {
    const fanOut = processedUnit(['es-logs', 'es-metrics']);
    const processingLine = { origin: processing('main'), destinationId: 'es-logs' };
    const sourceLine = { origin: source('otlp-input'), destinationId: 'es-traces' };

    expect(canRouteLine(fanOut, processingLine)).toBe(false);
    expect(routeLine(fanOut, processingLine, routes)).toBe(fanOut);
    expect(routeLine(fanOut, sourceLine, routes)).toBe(fanOut);
    const single = processedUnit(['es-logs']);
    expect(routeLine(single, processingLine, [])).toBe(single);
  });
});

describe('routeLine from a routing rule', () => {
  const routedUnit = (): Unit =>
    unitWith([
      {
        id: 'main',
        supported_telemetry: ['logs', 'traces'],
        config: [
          { name: 'sources', value: ['otlp-input'] },
          {
            name: 'routes',
            value: [
              {
                when: 'resource.attributes["env"] == "prod"',
                telemetry: ['logs'],
                destinations: ['es-logs'],
                processors: ['tag'],
              },
              { when: 'true', destinations: ['es-logs', 'es-metrics'] },
            ],
          },
        ],
      },
    ]);
  const ruleLine = (ruleIndex: number, destinationId: string) => ({
    origin: rule('main', ruleIndex),
    destinationId,
  });

  it("delegates the rule to a new child routing node that keeps the rule's destination", () => {
    const unit = routedUnit();
    const line = ruleLine(0, 'es-logs');
    expect(canRouteLine(unit, line)).toBe(true);

    const next = routeLine(unit, line, [
      { destinations: ['es-logs'] },
      { when: 'body == "x"', destinations: [] },
    ]);

    expect(getPipelineRoutes(next, 'main')[0]).toEqual({
      when: 'resource.attributes["env"] == "prod"',
      telemetry: ['logs'],
      processors: ['tag'],
      pipelines: ['main-routing'],
    });
    expect(next.unit.pipelines.find(({ id }) => id === 'main-routing')).toEqual({
      id: 'main-routing',
      supported_telemetry: ['logs'],
      config: [
        {
          name: 'routes',
          value: [{ destinations: ['es-logs'] }, { when: 'body == "x"', destinations: [] }],
        },
      ],
    });
  });

  it('limits the child routing node to the signals its parent rule carries', () => {
    const unit = routedUnit();
    unit.unit.sources = [
      { id: 'otlp-input', name: 'OTLP', type: 'otlp', supported_telemetry: ['logs', 'traces'] },
    ];
    const line = ruleLine(0, 'es-logs');
    expect(getRoutableLineSignals(unit, line)).toEqual({ current: ['logs'], available: ['logs'] });

    const next = routeLine(unit, line, [{ destinations: ['es-logs'] }], ['logs', 'traces']);
    expect(
      next.unit.pipelines.find(({ id }) => id === 'main-routing')?.supported_telemetry
    ).toEqual(['logs']);
  });

  it('leaves rules with several targets as they are', () => {
    const unit = routedUnit();
    const line = ruleLine(1, 'es-logs');
    expect(canRouteLine(unit, line)).toBe(false);
    expect(routeLine(unit, line, [{ destinations: ['es-logs'] }])).toBe(unit);
  });
});

describe('routing signals', () => {
  const narrowedUnit = (): Unit => {
    const unit = routeLine(
      processedUnit(['es-logs']),
      { origin: processing('main'), destinationId: 'es-logs' },
      [{ destinations: ['es-logs'] }]
    );
    unit.unit.sources = [
      ...(unit.unit.sources ?? []),
      { id: 'otlp-input', name: 'OTLP', type: 'otlp', supported_telemetry: ['logs', 'traces'] },
    ];
    return unit;
  };

  it('offers the signals the incoming source sends beyond those of a narrowed routing node', () => {
    expect(getPipelineRoutingSignals(narrowedUnit(), 'main')).toEqual({
      current: ['logs'],
      available: ['logs', 'traces'],
    });
  });

  it('offers what the source sends for a new routing node on its line', () => {
    const unit = narrowedUnit();
    expect(
      getRoutableLineSignals(unit, { origin: processing('main'), destinationId: 'x' })
    ).toEqual({ current: ['logs'], available: ['logs', 'traces'] });
  });

  it('widens a routing node to the signals its rules handle', () => {
    const next = writePipelineRoutes(
      narrowedUnit(),
      'main',
      [
        { destinations: ['es-logs'], telemetry: ['logs'] },
        { when: 'true', destinations: [] },
      ],
      ['logs', 'traces']
    );
    expect(next.unit.pipelines.find(({ id }) => id === 'main')?.supported_telemetry).toEqual([
      'logs',
      'traces',
    ]);
  });
});

describe('writePipelineRoutes', () => {
  it('replaces the rules of a routing node and reads them back', () => {
    const unit = routeLine(
      processedUnit(['es-logs']),
      { origin: processing('main'), destinationId: 'es-logs' },
      [{ destinations: ['es-logs'] }]
    );
    const routes = [
      { when: 'body == "x"', destinations: ['es-logs'], processors: ['tag'] },
      { action: 'copy' as const, destinations: [] },
    ];
    const next = writePipelineRoutes(unit, 'main', routes);

    expect(getPipelineRoutes(next, 'main')).toEqual(routes);
  });

  it('turns a plain destinations list into routes', () => {
    const unit = processedUnit(['es-logs']);
    expect(getPipelineRoutes(unit, 'main')).toEqual([{ destinations: ['es-logs'] }]);

    const next = writePipelineRoutes(unit, 'main', [{ when: 'true', destinations: ['es-logs'] }]);
    expect(next.unit.pipelines.find(({ id }) => id === 'main')?.config).toEqual([
      { name: 'sources', value: ['otlp-input'] },
      { name: 'processors', value: ['tag'] },
      { name: 'routes', value: [{ when: 'true', destinations: ['es-logs'] }] },
    ]);
  });

  it('leaves missing pipelines and empty rule lists alone', () => {
    const unit = processedUnit(['es-logs']);
    expect(canEditPipelineRoutes(unit, 'missing')).toBe(false);
    expect(writePipelineRoutes(unit, 'missing', [{ destinations: ['es-logs'] }])).toBe(unit);
    expect(writePipelineRoutes(unit, 'main', [])).toBe(unit);
  });
});
