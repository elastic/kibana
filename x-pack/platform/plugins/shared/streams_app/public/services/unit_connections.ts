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
 * A source has a single outgoing connection: either its own direct pipeline
 * to one destination, or a routing pipeline whose `routes` rules fan out.
 * Several sources can share a destination. Wires drawn from a routing rule are
 * added to that rule. Existing pipelines with several destinations still render
 * and can be unhooked line by line.
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

/** The pipeline holding a source's unconditional wires. Routing pipelines are left alone. */
const findSourcePipelineIndex = (pipelines: Unit['unit']['pipelines'], sourceId: string): number =>
  pipelines.findIndex(
    (pipeline) =>
      !pipelineUsesRoutes(pipeline) &&
      readIdentifiers(pipeline.config, 'sources').includes(sourceId)
  );

const writePipeline = (
  unit: Unit,
  pipelineIndex: number,
  config: PipelineConfig,
  supportedTelemetry?: UnitPipeline['supported_telemetry']
): Unit => {
  const pipelines = unit.unit.pipelines.flatMap((pipeline, index) => {
    if (index !== pipelineIndex) {
      return [pipeline];
    }
    if (!pipelineForwards(config)) {
      return [];
    }
    return [
      {
        ...pipeline,
        config,
        ...(supportedTelemetry ? { supported_telemetry: [...supportedTelemetry] } : {}),
      },
    ];
  });
  return replacePipelines(unit, pipelines);
};

const unionTelemetry = (
  current: UnitPipeline['supported_telemetry'],
  added: UnitPipeline['supported_telemetry']
): UnitPipeline['supported_telemetry'] => {
  const seen = new Set(current);
  const next = [...current];
  for (const signal of added) {
    if (!seen.has(signal)) {
      seen.add(signal);
      next.push(signal);
    }
  }
  return next;
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

/**
 * Whether the source already forwards somewhere, through a direct pipeline or a
 * routing pipeline. A source has at most one outgoing connection.
 */
export const hasSourceConnection = (unit: Unit, sourceId: string): boolean =>
  unit.unit.pipelines.some(
    (pipeline) =>
      readIdentifiers(pipeline.config, 'sources').includes(sourceId) &&
      pipelineForwards(pipeline.config)
  );

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
  if (pipelineUsesRoutes(pipeline)) {
    const routes = readRoutes(pipeline.config);
    return !routesIncludeDestination(routes, destinationId) && !catchAllBlocksDestination(routes);
  }
  return !readIdentifiers(pipeline.config, 'destinations').includes(destinationId);
};

/** Gives an unconnected source its own direct pipeline to one destination. */
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
  const nextTelemetry = unionTelemetry(
    pipeline.supported_telemetry,
    pipelineTelemetry(unit, sourceId, destinationId)
  );
  if (pipelineUsesRoutes(pipeline)) {
    const routes = addDestinationToRoutes(readRoutes(pipeline.config), destinationId);
    if (sources.length === 1) {
      return writePipeline(unit, pipelineIndex, withRoutes(pipeline.config, routes), nextTelemetry);
    }
    return appendSourcePipeline(
      detachSource(unit, pipelineIndex, sourceId),
      sourceId,
      nextTelemetry,
      [...processorEntries(pipeline.config), { name: 'routes', value: routes }]
    );
  }
  const destinations = readIdentifiers(pipeline.config, 'destinations');
  if (sources.length === 1) {
    return writePipeline(
      unit,
      pipelineIndex,
      withIdentifiers(pipeline.config, 'destinations', [...destinations, destinationId]),
      nextTelemetry
    );
  }
  return appendSourcePipeline(
    detachSource(unit, pipelineIndex, sourceId),
    sourceId,
    nextTelemetry,
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

/** Where a routing rule forwards records: a destination, or a child pipeline. */
export interface RouteTarget {
  kind: 'destination' | 'pipeline';
  id: string;
}

const isSameTarget = (left: RouteTarget, right: RouteTarget): boolean =>
  left.kind === right.kind && left.id === right.id;

const isRoutedPipeline = (unit: Unit, pipelineId: string): boolean =>
  unit.unit.pipelines.some((pipeline) =>
    readRoutes(pipeline.config).some(
      (route) => 'pipelines' in route && route.pipelines.includes(pipelineId)
    )
  );

/** Whether records leaving `fromPipelineId` can reach `toPipelineId` through routes. */
const pipelineReaches = (unit: Unit, fromPipelineId: string, toPipelineId: string): boolean => {
  const visited = new Set<string>();
  const pending = [fromPipelineId];
  while (pending.length > 0) {
    const pipelineId = pending.pop();
    if (pipelineId === undefined || visited.has(pipelineId)) {
      continue;
    }
    if (pipelineId === toPipelineId) {
      return true;
    }
    visited.add(pipelineId);
    const pipeline = unit.unit.pipelines.find(({ id }) => id === pipelineId);
    for (const route of pipeline ? readRoutes(pipeline.config) : []) {
      if ('pipelines' in route) {
        pending.push(...route.pipelines);
      }
    }
  }
  return false;
};

/** Targets a rule forwards to, or undefined when the rule does not exist. */
const readRuleTargets = (pipeline: UnitPipeline, ruleIndex: number): RouteTarget[] | undefined => {
  if (!pipelineUsesRoutes(pipeline)) {
    return ruleIndex === 0
      ? readIdentifiers(pipeline.config, 'destinations').map((id) => ({ kind: 'destination', id }))
      : undefined;
  }
  const route = readRoutes(pipeline.config)[ruleIndex];
  if (!route) {
    return undefined;
  }
  return 'destinations' in route
    ? route.destinations.map((id) => ({ kind: 'destination', id }))
    : route.pipelines.map((id) => ({ kind: 'pipeline', id }));
};

const routeWithTargets = (rule: RouteRule, kind: RouteTarget['kind'], ids: string[]): RouteRule => {
  // We omit existing destinations/pipelines from the original rule, so we can recreate
  // it with the updated target ids.
  // oxlint-disable-next-line no-unused-vars
  const { pipelines, destinations, ...rest } = rule as Record<string, unknown>;

  return kind === 'destination' ? { ...rest, destinations: ids } : { ...rest, pipelines: ids };
};

/**
 * Pipeline config with one rule's targets replaced. A rule left with no targets
 * is removed. Undefined when the targets cannot be stored: a rule lists either
 * destinations or pipelines, and a plain `destinations` list only holds
 * destinations.
 */
const withRuleTargets = (
  pipeline: UnitPipeline,
  ruleIndex: number,
  targets: readonly RouteTarget[]
): PipelineConfig | undefined => {
  const kinds = new Set(targets.map(({ kind }) => kind));
  if (kinds.size > 1) {
    return undefined;
  }
  const kind = targets[0]?.kind ?? 'destination';
  const ids = targets.map(({ id }) => id);
  if (!pipelineUsesRoutes(pipeline)) {
    return kind === 'destination'
      ? withIdentifiers(pipeline.config, 'destinations', ids)
      : undefined;
  }
  return withRoutes(
    pipeline.config,
    readRoutes(pipeline.config).flatMap((route, index) => {
      if (index !== ruleIndex) {
        return [route];
      }
      return ids.length > 0 ? [routeWithTargets(route, kind, ids)] : [];
    })
  );
};

const routeFitsTarget = (
  unit: Unit,
  pipeline: UnitPipeline,
  { kind, id }: RouteTarget
): boolean => {
  if (kind === 'pipeline') {
    const target = unit.unit.pipelines.find((item) => item.id === id);
    if (!target || pipelineReaches(unit, id, pipeline.id)) {
      return false;
    }
    const targetSignals = new Set(target.supported_telemetry);
    return pipeline.supported_telemetry.some((signal) => targetSignals.has(signal));
  }
  const destination = unit.unit.destinations?.find((item) => item.id === id);
  if (!destination) {
    return true;
  }
  const destinationSignals = new Set(destination.supported_telemetry);
  return pipeline.supported_telemetry.some((signal) => destinationSignals.has(signal));
};

/**
 * Writes new targets for one rule, or returns `unit` unchanged when they do not
 * fit. A routed child pipeline keeps its last destination, since dropping the
 * pipeline would leave its parent route pointing nowhere.
 */
const writeRuleTargets = (
  unit: Unit,
  { pipelineId, ruleIndex }: RouteRuleRef,
  targets: readonly RouteTarget[]
): Unit => {
  const pipelineIndex = findPipelineIndex(unit, pipelineId);
  const pipeline = unit.unit.pipelines[pipelineIndex];
  const config = pipeline ? withRuleTargets(pipeline, ruleIndex, targets) : undefined;
  if (!config || (!pipelineForwards(config) && isRoutedPipeline(unit, pipelineId))) {
    return unit;
  }
  return writePipeline(unit, pipelineIndex, config);
};

export const canConnectRouteToTarget = (
  unit: Unit,
  rule: RouteRuleRef,
  target: RouteTarget
): boolean => connectRouteToTarget(unit, rule, target) !== unit;

/** Adds a target to one routing rule. */
export const connectRouteToTarget = (unit: Unit, rule: RouteRuleRef, target: RouteTarget): Unit => {
  const pipeline = unit.unit.pipelines[findPipelineIndex(unit, rule.pipelineId)];
  const targets = pipeline ? readRuleTargets(pipeline, rule.ruleIndex) : undefined;
  if (
    !pipeline ||
    !targets ||
    targets.some((item) => isSameTarget(item, target)) ||
    !routeFitsTarget(unit, pipeline, target)
  ) {
    return unit;
  }
  return writeRuleTargets(unit, rule, [...targets, target]);
};

/** Drops one target from a routing rule. A rule left with no targets is removed. */
export const disconnectRouteFromTarget = (
  unit: Unit,
  rule: RouteRuleRef,
  target: RouteTarget
): Unit => {
  const pipeline = unit.unit.pipelines[findPipelineIndex(unit, rule.pipelineId)];
  const targets = pipeline ? readRuleTargets(pipeline, rule.ruleIndex) : undefined;
  if (!targets?.some((item) => isSameTarget(item, target))) {
    return unit;
  }
  return writeRuleTargets(
    unit,
    rule,
    targets.filter((item) => !isSameTarget(item, target))
  );
};

/**
 * Moves a routing rule's line onto another target. Within one rule the target
 * is swapped in place, so a single-target rule can switch between a
 * destination and a child pipeline.
 */
export const moveRouteConnection = (
  unit: Unit,
  {
    previousRule,
    previousTarget,
    rule,
    target,
  }: {
    previousRule: RouteRuleRef;
    previousTarget: RouteTarget;
    rule: RouteRuleRef;
    target: RouteTarget;
  }
): Unit => {
  if (previousRule.pipelineId !== rule.pipelineId || previousRule.ruleIndex !== rule.ruleIndex) {
    const connected = connectRouteToTarget(unit, rule, target);
    // Connect first: adding never removes a rule, so both rule indexes stay valid.
    return connected === unit
      ? unit
      : disconnectRouteFromTarget(connected, previousRule, previousTarget);
  }
  const pipeline = unit.unit.pipelines[findPipelineIndex(unit, rule.pipelineId)];
  const targets = pipeline ? readRuleTargets(pipeline, rule.ruleIndex) : undefined;
  if (
    !pipeline ||
    !targets?.some((item) => isSameTarget(item, previousTarget)) ||
    targets.some((item) => isSameTarget(item, target)) ||
    !routeFitsTarget(unit, pipeline, target)
  ) {
    return unit;
  }
  return writeRuleTargets(
    unit,
    rule,
    targets.map((item) => (isSameTarget(item, previousTarget) ? target : item))
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
