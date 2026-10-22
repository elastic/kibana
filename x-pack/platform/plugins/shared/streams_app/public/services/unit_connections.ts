/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Unit } from './unit_repository';

/**
 * Wires sources to destinations.
 *
 * Each source has its own direct pipeline. Unconditional wires are that
 * pipeline's `destinations` list, which can name several destinations.
 * Conditional wires are `routes` rules, which cannot share a pipeline with
 * `destinations`, so a source that already feeds a routing pipeline gets a
 * separate direct pipeline for new wires. Wires drawn from a routing rule are
 * added to that rule.
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

/** The pipeline holding a source's unconditional wires. Routing pipelines are left alone. */
const findSourcePipelineIndex = (pipelines: Unit['unit']['pipelines'], sourceId: string): number =>
  pipelines.findIndex(
    (pipeline) =>
      !pipelineUsesRoutes(pipeline) &&
      readIdentifiers(pipeline.config, 'sources').includes(sourceId)
  );

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

const pushConnection = (
  connections: UnitConnection[],
  seen: Set<string>,
  connection: UnitConnection
): void => {
  const key = `${connection.sourceId}\0${connection.destinationId}\0${connection.forwarding}`;
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

/**
 * Signals both components accept. `unknown` means one side is not on the unit,
 * so compatibility is left to the caller. `incompatible` means both are known
 * and share no signal.
 */
const telemetryFit = (
  unit: Unit,
  sourceId: string,
  destinationId: string
): 'unknown' | 'incompatible' | UnitPipeline['supported_telemetry'] => {
  const source = unit.unit.sources?.find((item) => item.id === sourceId);
  const destination = unit.unit.destinations?.find((item) => item.id === destinationId);
  if (!source || !destination) {
    return 'unknown';
  }
  const destinationSignals = new Set(destination.supported_telemetry);
  const shared = source.supported_telemetry.filter((signal) => destinationSignals.has(signal));
  if (shared.length === 0) {
    return 'incompatible';
  }
  return shared;
};

const pipelineTelemetry = (
  unit: Unit,
  sourceId: string,
  destinationId: string
): UnitPipeline['supported_telemetry'] => {
  const fit = telemetryFit(unit, sourceId, destinationId);
  return fit === 'unknown' || fit === 'incompatible' ? [...DEFAULT_SUPPORTED_TELEMETRY] : fit;
};

export const canConnectSourceToDestination = (
  unit: Unit,
  sourceId: string,
  destinationId: string
): boolean => {
  const fit = telemetryFit(unit, sourceId, destinationId);
  if (fit === 'incompatible') {
    return false;
  }
  const pipelineIndex = findSourcePipelineIndex(unit.unit.pipelines, sourceId);
  if (pipelineIndex === -1) {
    return true;
  }
  const pipeline = unit.unit.pipelines[pipelineIndex];
  if (fit !== 'unknown') {
    const pipelineSignals = new Set(pipeline.supported_telemetry);
    if (!fit.some((signal) => pipelineSignals.has(signal))) {
      return false;
    }
  }
  return !readIdentifiers(pipeline.config, 'destinations').includes(destinationId);
};

/**
 * Adds a destination to the source's own direct pipeline, creating that
 * pipeline when needed. A routing pipeline the source also feeds is untouched.
 */
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
    return appendSourcePipeline(unit, sourceId, pipelineTelemetry(unit, sourceId, destinationId), [
      { name: 'destinations', value: [destinationId] },
    ]);
  }
  const pipeline = unit.unit.pipelines[pipelineIndex];
  const sources = readIdentifiers(pipeline.config, 'sources');
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

/** Drops one drawn line from the source's direct pipeline. */
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
  const released = disconnectSourceFromDestination(unit, previousSourceId, previousDestinationId);
  if (!canConnectSourceToDestination(released, sourceId, destinationId)) {
    return unit;
  }
  return connectSourceToDestination(released, sourceId, destinationId);
};

/**
 * One output of a routing node: a rule in a pipeline's `routes` list, or rule 0
 * of a routed child pipeline that uses a plain `destinations` list.
 */
export interface RouteRuleRef {
  pipelineId: string;
  ruleIndex: number;
}

const findPipelineIndex = (unit: Unit, pipelineId: string): number =>
  unit.unit.pipelines.findIndex((pipeline) => pipeline.id === pipelineId);

const isRoutedPipeline = (unit: Unit, pipelineId: string): boolean =>
  unit.unit.pipelines.some((pipeline) =>
    readRoutes(pipeline.config).some(
      (route) => 'pipelines' in route && route.pipelines.includes(pipelineId)
    )
  );

/** Destination ids a rule forwards to, or undefined when the rule cannot take destinations. */
const readRuleDestinations = (
  pipeline: UnitPipeline,
  ruleIndex: number
): readonly string[] | undefined => {
  if (!pipelineUsesRoutes(pipeline)) {
    return ruleIndex === 0 ? readIdentifiers(pipeline.config, 'destinations') : undefined;
  }
  const route = readRoutes(pipeline.config)[ruleIndex];
  return route && 'destinations' in route ? route.destinations : undefined;
};

const withRuleDestinations = (
  pipeline: UnitPipeline,
  ruleIndex: number,
  destinations: string[]
): PipelineConfig => {
  if (!pipelineUsesRoutes(pipeline)) {
    return withIdentifiers(pipeline.config, 'destinations', destinations);
  }
  return withRoutes(
    pipeline.config,
    readRoutes(pipeline.config).flatMap((route, index) => {
      if (index !== ruleIndex || !('destinations' in route)) {
        return [route];
      }
      return destinations.length > 0 ? [{ ...route, destinations }] : [];
    })
  );
};

const routeFitsDestination = (
  unit: Unit,
  pipeline: UnitPipeline,
  destinationId: string
): boolean => {
  const destination = unit.unit.destinations?.find((item) => item.id === destinationId);
  if (!destination) {
    return true;
  }
  const destinationSignals = new Set(destination.supported_telemetry);
  return pipeline.supported_telemetry.some((signal) => destinationSignals.has(signal));
};

export const canConnectRouteToDestination = (
  unit: Unit,
  { pipelineId, ruleIndex }: RouteRuleRef,
  destinationId: string
): boolean => {
  const pipeline = unit.unit.pipelines[findPipelineIndex(unit, pipelineId)];
  if (!pipeline || !routeFitsDestination(unit, pipeline, destinationId)) {
    return false;
  }
  const destinations = readRuleDestinations(pipeline, ruleIndex);
  return destinations !== undefined && !destinations.includes(destinationId);
};

/** Adds a destination to one routing rule. */
export const connectRouteToDestination = (
  unit: Unit,
  rule: RouteRuleRef,
  destinationId: string
): Unit => {
  if (!canConnectRouteToDestination(unit, rule, destinationId)) {
    return unit;
  }
  const pipelineIndex = findPipelineIndex(unit, rule.pipelineId);
  const pipeline = unit.unit.pipelines[pipelineIndex];
  const destinations = readRuleDestinations(pipeline, rule.ruleIndex) ?? [];
  return writePipeline(
    unit,
    pipelineIndex,
    withRuleDestinations(pipeline, rule.ruleIndex, [...destinations, destinationId])
  );
};

/**
 * Drops one destination from a routing rule. A rule left with no destinations is
 * removed. A routed child pipeline keeps its last destination, since dropping
 * the pipeline would leave its parent route pointing nowhere.
 */
export const disconnectRouteFromDestination = (
  unit: Unit,
  rule: RouteRuleRef,
  destinationId: string
): Unit => {
  const pipelineIndex = findPipelineIndex(unit, rule.pipelineId);
  const pipeline = unit.unit.pipelines[pipelineIndex];
  const destinations = pipeline ? readRuleDestinations(pipeline, rule.ruleIndex) : undefined;
  if (!pipeline || !destinations?.includes(destinationId)) {
    return unit;
  }
  const config = withRuleDestinations(
    pipeline,
    rule.ruleIndex,
    destinations.filter((id) => id !== destinationId)
  );
  if (!pipelineForwards(config) && isRoutedPipeline(unit, rule.pipelineId)) {
    return unit;
  }
  return writePipeline(unit, pipelineIndex, config);
};

/** Moves a routing rule's line onto another destination or another rule. */
export const moveRouteConnection = (
  unit: Unit,
  {
    previousRule,
    previousDestinationId,
    rule,
    destinationId,
  }: {
    previousRule: RouteRuleRef;
    previousDestinationId: string;
    rule: RouteRuleRef;
    destinationId: string;
  }
): Unit => {
  if (!canConnectRouteToDestination(unit, rule, destinationId)) {
    return unit;
  }
  // Connect first: adding never removes a rule, so both rule indexes stay valid.
  return disconnectRouteFromDestination(
    connectRouteToDestination(unit, rule, destinationId),
    previousRule,
    previousDestinationId
  );
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
