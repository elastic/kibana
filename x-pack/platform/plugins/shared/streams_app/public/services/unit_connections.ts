/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Unit } from './unit_repository';

/**
 * Wires one source to the destinations the canvas connects it to.
 *
 * Each source has its own pipeline. Unconditional wires are that pipeline's
 * `destinations` list. Conditional wires are `routes` rules, which cannot
 * share a pipeline with `destinations`. A new wire on a pipeline that already
 * uses routes is stored as a catch-all rule so a later condition can be set
 * on it without changing the connection model.
 */

type UnitPipeline = Unit['unit']['pipelines'][number];
type PipelineConfig = UnitPipeline['config'];

const DEFAULT_SUPPORTED_TELEMETRY = ['logs', 'metrics', 'traces'] as const;
const PIPELINE_ID_PATTERN = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;

export type UnitConnectionForwarding = 'direct' | 'route';

export interface UnitConnection {
  sourceId: string;
  destinationId: string;
  /** `direct` is an unconditional destinations list. `route` is a routing rule. */
  forwarding: UnitConnectionForwarding;
}

type RouteRule = Extract<PipelineConfig[number], { name: 'routes' }>['value'][number];

const readIdentifiers = (config: PipelineConfig, name: 'sources' | 'destinations'): string[] => {
  for (const entry of config) {
    if (entry.name === 'sources' && name === 'sources') {
      return [...entry.value];
    }
    if (entry.name === 'destinations' && name === 'destinations') {
      return [...entry.value];
    }
  }
  return [];
};

const withIdentifiers = <Name extends 'sources' | 'destinations'>(
  config: PipelineConfig,
  name: Name,
  value: string[]
): PipelineConfig => {
  if (value.length === 0) {
    return config.filter((entry) => entry.name !== name);
  }
  const exists = config.some((entry) => entry.name === name);
  if (!exists) {
    return [...config, { name, value }];
  }
  return config.map((entry) => (entry.name === name ? { ...entry, value } : entry));
};

const pipelineUsesRoutes = (pipeline: UnitPipeline): boolean =>
  pipeline.config.some((entry) => entry.name === 'routes');

const readRoutes = (config: PipelineConfig): RouteRule[] => {
  for (const entry of config) {
    if (entry.name === 'routes') {
      return [...entry.value];
    }
  }
  return [];
};

const withRoutes = (config: PipelineConfig, routes: readonly RouteRule[]): PipelineConfig => {
  if (routes.length === 0) {
    return config.filter((entry) => entry.name !== 'routes');
  }
  const exists = config.some((entry) => entry.name === 'routes');
  if (!exists) {
    return [...config, { name: 'routes', value: [...routes] }];
  }
  return config.map((entry) =>
    entry.name === 'routes' ? { ...entry, value: [...routes] } : entry
  );
};

const routeDestinationIds = (route: RouteRule): readonly string[] =>
  'destinations' in route ? route.destinations : [];

const isCatchAllDestinationRoute = (route: RouteRule): boolean =>
  route.when === undefined && 'destinations' in route;

/** A catch-all that delegates to child pipelines already consumes every record. */
const catchAllBlocksDestination = (routes: readonly RouteRule[]): boolean => {
  const catchAll = routes.find((route) => route.when === undefined);
  return catchAll !== undefined && !('destinations' in catchAll);
};

const routesIncludeDestination = (routes: readonly RouteRule[], destinationId: string): boolean =>
  routes.some((route) => routeDestinationIds(route).includes(destinationId));

const addDestinationToRoutes = (
  routes: readonly RouteRule[],
  destinationId: string
): RouteRule[] => {
  const catchAllIndex = routes.findIndex(isCatchAllDestinationRoute);
  if (catchAllIndex === -1) {
    return [...routes, { destinations: [destinationId] }];
  }
  return routes.map((route, index) => {
    if (index !== catchAllIndex || !('destinations' in route)) {
      return route;
    }
    if (route.destinations.includes(destinationId)) {
      return route;
    }
    return { ...route, destinations: [...route.destinations, destinationId] };
  });
};

const removeDestinationFromRoutes = (
  routes: readonly RouteRule[],
  destinationId: string
): RouteRule[] =>
  routes.flatMap((route) => {
    if (!('destinations' in route) || !route.destinations.includes(destinationId)) {
      return [route];
    }
    const destinations = route.destinations.filter((id) => id !== destinationId);
    return destinations.length > 0 ? [{ ...route, destinations }] : [];
  });

const pipelineForwards = (config: PipelineConfig): boolean =>
  readIdentifiers(config, 'destinations').length > 0 ||
  config.some((entry) => entry.name === 'routes');

const replacePipelines = (unit: Unit, pipelines: Unit['unit']['pipelines']): Unit => ({
  ...unit,
  unit: {
    ...unit.unit,
    pipelines,
  },
});

const findSourcePipelineIndex = (pipelines: Unit['unit']['pipelines'], sourceId: string): number =>
  pipelines.findIndex((pipeline) => readIdentifiers(pipeline.config, 'sources').includes(sourceId));

const writePipeline = (unit: Unit, pipelineIndex: number, config: PipelineConfig): Unit => {
  const pipelines = unit.unit.pipelines.flatMap((pipeline, index) => {
    if (index !== pipelineIndex) {
      return [pipeline];
    }
    if (!pipelineForwards(config)) {
      return [];
    }
    return [{ ...pipeline, config }];
  });
  return replacePipelines(unit, pipelines);
};

const usedIds = (unit: Unit): Set<string> => {
  const ids = new Set<string>();
  for (const source of unit.unit.sources) {
    ids.add(source.id);
  }
  for (const destination of unit.unit.destinations) {
    ids.add(destination.id);
  }
  for (const processor of unit.unit.processors ?? []) {
    ids.add(processor.id);
  }
  for (const pipeline of unit.unit.pipelines) {
    ids.add(pipeline.id);
  }
  return ids;
};

const isFreePipelineId = (id: string, taken: ReadonlySet<string>): boolean =>
  id.length <= 256 && PIPELINE_ID_PATTERN.test(id) && !taken.has(id);

/** Allocates a pipeline id that does not collide with another component in the unit. */
const pipelineIdForSource = (unit: Unit, sourceId: string): string => {
  const taken = usedIds(unit);
  const root = `p-${sourceId}`;
  if (isFreePipelineId(root, taken)) {
    return root;
  }
  for (let suffix = 2; suffix < 10000; suffix++) {
    const tail = `-${suffix}`;
    const stem = root.slice(0, 256 - tail.length).replace(/-+$/g, '');
    const candidate = `${stem}${tail}`;
    if (isFreePipelineId(candidate, taken)) {
      return candidate;
    }
  }
  return `p-${sourceId.length}`;
};

const appendSourcePipeline = (
  unit: Unit,
  sourceId: string,
  supportedTelemetry: UnitPipeline['supported_telemetry'],
  forwarding: PipelineConfig
): Unit =>
  replacePipelines(unit, [
    ...unit.unit.pipelines,
    {
      id: pipelineIdForSource(unit, sourceId),
      supported_telemetry: [...supportedTelemetry],
      config: [{ name: 'sources', value: [sourceId] }, ...forwarding],
    },
  ]);

const processorEntries = (config: PipelineConfig): PipelineConfig =>
  config.filter((entry) => entry.name === 'processors');

const detachSource = (unit: Unit, pipelineIndex: number, sourceId: string): Unit => {
  const pipeline = unit.unit.pipelines[pipelineIndex];
  return writePipeline(
    unit,
    pipelineIndex,
    withIdentifiers(
      pipeline.config,
      'sources',
      readIdentifiers(pipeline.config, 'sources').filter((id) => id !== sourceId)
    )
  );
};

const isConnected = (unit: Unit, sourceId: string, destinationId: string): boolean =>
  unit.unit.pipelines.some((pipeline) => {
    if (!readIdentifiers(pipeline.config, 'sources').includes(sourceId)) {
      return false;
    }
    if (pipelineUsesRoutes(pipeline)) {
      return routesIncludeDestination(readRoutes(pipeline.config), destinationId);
    }
    return readIdentifiers(pipeline.config, 'destinations').includes(destinationId);
  });

const pushConnection = (
  connections: UnitConnection[],
  seen: Set<string>,
  connection: UnitConnection
): void => {
  const key = `${connection.sourceId}\0${connection.destinationId}`;
  if (seen.has(key)) {
    return;
  }
  seen.add(key);
  connections.push(connection);
};

/** Source/destination pairs each source pipeline currently forwards. */
export const getUnitConnections = (
  unit: Unit,
  configuredSourceIds: ReadonlySet<string>,
  configuredDestinationIds: ReadonlySet<string>
): UnitConnection[] => {
  const seen = new Set<string>();
  const connections: UnitConnection[] = [];
  for (const pipeline of unit.unit.pipelines) {
    const sources = readIdentifiers(pipeline.config, 'sources').filter((id) =>
      configuredSourceIds.has(id)
    );
    if (pipelineUsesRoutes(pipeline)) {
      const destinationIds = readRoutes(pipeline.config).flatMap((route) => [
        ...routeDestinationIds(route),
      ]);
      for (const sourceId of sources) {
        for (const destinationId of destinationIds) {
          if (!configuredDestinationIds.has(destinationId)) {
            continue;
          }
          pushConnection(connections, seen, { sourceId, destinationId, forwarding: 'route' });
        }
      }
      continue;
    }
    const destinations = readIdentifiers(pipeline.config, 'destinations').filter((id) =>
      configuredDestinationIds.has(id)
    );
    for (const sourceId of sources) {
      for (const destinationId of destinations) {
        pushConnection(connections, seen, { sourceId, destinationId, forwarding: 'direct' });
      }
    }
  }
  return connections;
};

export const canConnectSourceToDestination = (
  unit: Unit,
  sourceId: string,
  destinationId: string
): boolean => {
  const pipelineIndex = findSourcePipelineIndex(unit.unit.pipelines, sourceId);
  if (pipelineIndex === -1) {
    return true;
  }
  const pipeline = unit.unit.pipelines[pipelineIndex];
  if (pipelineUsesRoutes(pipeline)) {
    const routes = readRoutes(pipeline.config);
    return !routesIncludeDestination(routes, destinationId) && !catchAllBlocksDestination(routes);
  }
  return !readIdentifiers(pipeline.config, 'destinations').includes(destinationId);
};

/** Adds a destination to the source's own pipeline, creating that pipeline when needed. */
export const connectSourceToDestination = (
  unit: Unit,
  sourceId: string,
  destinationId: string
): Unit => {
  if (!canConnectSourceToDestination(unit, sourceId, destinationId)) {
    return unit;
  }
  const pipelineIndex = findSourcePipelineIndex(unit.unit.pipelines, sourceId);
  if (pipelineIndex === -1) {
    return appendSourcePipeline(
      unit,
      sourceId,
      [...DEFAULT_SUPPORTED_TELEMETRY],
      [{ name: 'destinations', value: [destinationId] }]
    );
  }
  const pipeline = unit.unit.pipelines[pipelineIndex];
  const sources = readIdentifiers(pipeline.config, 'sources');
  if (pipelineUsesRoutes(pipeline)) {
    const routes = addDestinationToRoutes(readRoutes(pipeline.config), destinationId);
    if (sources.length === 1) {
      return writePipeline(unit, pipelineIndex, withRoutes(pipeline.config, routes));
    }
    return appendSourcePipeline(
      detachSource(unit, pipelineIndex, sourceId),
      sourceId,
      pipeline.supported_telemetry,
      [...processorEntries(pipeline.config), { name: 'routes', value: routes }]
    );
  }
  const destinations = readIdentifiers(pipeline.config, 'destinations');
  if (sources.length === 1) {
    return writePipeline(
      unit,
      pipelineIndex,
      withIdentifiers(pipeline.config, 'destinations', [...destinations, destinationId])
    );
  }
  return appendSourcePipeline(
    detachSource(unit, pipelineIndex, sourceId),
    sourceId,
    pipeline.supported_telemetry,
    [
      ...processorEntries(pipeline.config),
      { name: 'destinations', value: [...destinations, destinationId] },
    ]
  );
};

/** Drops one drawn line from the source pipeline that owns it. */
export const disconnectSourceFromDestination = (
  unit: Unit,
  sourceId: string,
  destinationId: string
): Unit => {
  const pipelineIndex = findSourcePipelineIndex(unit.unit.pipelines, sourceId);
  if (pipelineIndex === -1) {
    return unit;
  }
  const pipeline = unit.unit.pipelines[pipelineIndex];
  const sources = readIdentifiers(pipeline.config, 'sources');
  if (pipelineUsesRoutes(pipeline)) {
    if (!routesIncludeDestination(readRoutes(pipeline.config), destinationId)) {
      return unit;
    }
    const routes = removeDestinationFromRoutes(readRoutes(pipeline.config), destinationId);
    if (sources.length === 1) {
      return writePipeline(unit, pipelineIndex, withRoutes(pipeline.config, routes));
    }
    const detached = detachSource(unit, pipelineIndex, sourceId);
    if (routes.length === 0) {
      return detached;
    }
    return appendSourcePipeline(detached, sourceId, pipeline.supported_telemetry, [
      ...processorEntries(pipeline.config),
      { name: 'routes', value: routes },
    ]);
  }
  const destinations = readIdentifiers(pipeline.config, 'destinations');
  if (!destinations.includes(destinationId)) {
    return unit;
  }
  if (sources.length === 1) {
    return writePipeline(
      unit,
      pipelineIndex,
      withIdentifiers(
        pipeline.config,
        'destinations',
        destinations.filter((id) => id !== destinationId)
      )
    );
  }
  const detached = detachSource(unit, pipelineIndex, sourceId);
  const remaining = destinations.filter((id) => id !== destinationId);
  if (remaining.length === 0) {
    return detached;
  }
  return appendSourcePipeline(detached, sourceId, pipeline.supported_telemetry, [
    ...processorEntries(pipeline.config),
    { name: 'destinations', value: remaining },
  ]);
};

/** Moves a line onto a new source or destination handle. */
export const moveUnitConnection = (
  unit: Unit,
  {
    previousSourceId,
    previousDestinationId,
    sourceId,
    destinationId,
  }: {
    previousSourceId: string;
    previousDestinationId: string;
    sourceId: string;
    destinationId: string;
  }
): Unit => {
  if (previousSourceId === sourceId && previousDestinationId === destinationId) {
    return unit;
  }
  if (
    !canConnectSourceToDestination(unit, sourceId, destinationId) &&
    !isConnected(unit, sourceId, destinationId)
  ) {
    return unit;
  }
  const connected = connectSourceToDestination(unit, sourceId, destinationId);
  return disconnectSourceFromDestination(connected, previousSourceId, previousDestinationId);
};

/** Drops a deleted component id from pipeline source and destination lists. */
export const removeComponentFromPipelines = (unit: Unit, componentId: string): Unit =>
  replacePipelines(
    unit,
    unit.unit.pipelines.flatMap((pipeline) => {
      const hadSources = pipeline.config.some((entry) => entry.name === 'sources');
      const config: PipelineConfig = [];
      for (const entry of pipeline.config) {
        if (entry.name === 'sources') {
          const value = entry.value.filter((id) => id !== componentId);
          if (value.length > 0) {
            config.push({ ...entry, value });
          }
          continue;
        }
        if (entry.name === 'destinations') {
          const value = entry.value.filter((id) => id !== componentId);
          if (value.length > 0) {
            config.push({ ...entry, value });
          }
          continue;
        }
        if (entry.name === 'routes') {
          const value = removeDestinationFromRoutes(entry.value, componentId);
          if (value.length > 0) {
            config.push({ ...entry, value });
          }
          continue;
        }
        config.push(entry);
      }
      if (config.length === 0 || !pipelineForwards(config)) {
        return [];
      }
      if (hadSources && !config.some((entry) => entry.name === 'sources')) {
        return [];
      }
      return [{ ...pipeline, config }];
    })
  );
