/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash';
import type { Unit } from './unit_repository';
import {
  EDGE_FORWARDING,
  GRAPH_ENDPOINT_KIND,
  PROCESSING_SLOT_KIND,
  buildUnitGraph,
  endpointKey,
  type ProcessingNodeRef,
  type UnitEdgeForwarding,
  type UnitGraph,
  type UnitGraphEdge,
  type UnitGraphEndpoint,
} from './unit_graph';
import {
  DEFAULT_SUPPORTED_TELEMETRY,
  PIPELINE_ENTRY,
  allocateComponentId,
  isDelegatingRoute,
  hasScopedWiring,
  pipelineForwards,
  pruneUnit,
  readEntryIds,
  readRoutes,
  replaceUnit,
  unionSignals,
  usedComponentIds,
  type PipelineConfig,
  type RouteRule,
  type UnitPipeline,
  type UnitSignal,
} from './unit_pipeline';

/**
 * Wires sources and processing to destinations.
 *
 * A line from a source carries its records unprocessed, so it is stored on one
 * of the source's pipelines without processors, created when the source has
 * none. A line from a processing node is stored on the pipeline that owns those
 * processors, after them. Unconditional wires are a pipeline's `destinations`
 * list, which can name several destinations. Conditional wires are `routes`
 * rules, which cannot share a pipeline with `destinations`. A new wire on a
 * pipeline that already uses routes is stored as a catch-all rule so a later
 * condition can be set on it without changing the connection model.
 */

/** Where a line starts: a source (unprocessed records) or a processing node (processed records). */
export type UnitConnectionOrigin = Exclude<
  UnitGraphEndpoint,
  { kind: typeof GRAPH_ENDPOINT_KIND.destination }
>;

export interface UnitConnection {
  sourceId: string;
  destinationId: string;
  /** `direct` is an unconditional destinations list. `route` is a routing rule. */
  forwarding: UnitEdgeForwarding;
}

type IdentifierEntryName = typeof PIPELINE_ENTRY.sources | typeof PIPELINE_ENTRY.destinations;

const withIdentifiers = <Name extends IdentifierEntryName>(
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
  pipeline.config.some((entry) => entry.name === PIPELINE_ENTRY.routes);

const withRoutes = (config: PipelineConfig, routes: readonly RouteRule[]): PipelineConfig => {
  if (routes.length === 0) {
    return config.filter((entry) => entry.name !== PIPELINE_ENTRY.routes);
  }
  const exists = config.some((entry) => entry.name === PIPELINE_ENTRY.routes);
  if (!exists) {
    return [...config, { name: PIPELINE_ENTRY.routes, value: [...routes] }];
  }
  return config.map((entry) =>
    entry.name === PIPELINE_ENTRY.routes ? { ...entry, value: [...routes] } : entry
  );
};

const routeDestinationIds = (route: RouteRule): readonly string[] =>
  isDelegatingRoute(route) ? [] : route.destinations;

const isCatchAllDestinationRoute = (route: RouteRule): boolean =>
  route.when === undefined && !isDelegatingRoute(route);

/**
 * A new line on a routed pipeline joins its catch-all. That is refused when the
 * catch-all delegates to child pipelines, or when it has processors the new
 * destination would then also receive. A second catch-all would never match.
 */
const catchAllBlocksDestination = (routes: readonly RouteRule[]): boolean => {
  const catchAll = routes.find((route) => route.when === undefined);
  return (
    catchAll !== undefined &&
    (isDelegatingRoute(catchAll) || (catchAll.processors?.length ?? 0) > 0)
  );
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
    if (index !== catchAllIndex || isDelegatingRoute(route)) {
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
    if (isDelegatingRoute(route) || !route.destinations.includes(destinationId)) {
      return [route];
    }
    const destinations = route.destinations.filter((id) => id !== destinationId);
    return destinations.length > 0 ? [{ ...route, destinations }] : [];
  });

const replacePipelines = (unit: Unit, pipelines: Unit['unit']['pipelines']): Unit =>
  replaceUnit(unit, { pipelines });

const hasProcessors = (pipeline: UnitPipeline): boolean =>
  pipeline.config.some(
    (entry) => entry.name === PIPELINE_ENTRY.processors && entry.value.length > 0
  );

const forwardsDirectlyTo = (pipeline: UnitPipeline, destinationId: string): boolean =>
  pipelineUsesRoutes(pipeline)
    ? routesIncludeDestination(readRoutes(pipeline.config), destinationId)
    : readEntryIds(pipeline.config, PIPELINE_ENTRY.destinations).includes(destinationId);

/**
 * The source pipeline whose lines start at the source: one without processors,
 * and without telemetry-scoped wiring this module would merge. Routing
 * pipelines are drawn through their routing node, so they never hold a source
 * line. With a destination, only the pipeline that forwards to it matches.
 */
const findUnprocessedSourcePipelineIndex = (
  pipelines: Unit['unit']['pipelines'],
  sourceId: string,
  destinationId?: string
): number =>
  pipelines.findIndex(
    (pipeline) =>
      !hasProcessors(pipeline) &&
      !pipelineUsesRoutes(pipeline) &&
      !hasScopedWiring(pipeline.config) &&
      readEntryIds(pipeline.config, PIPELINE_ENTRY.sources).includes(sourceId) &&
      (destinationId === undefined || forwardsDirectlyTo(pipeline, destinationId))
  );

const findPipelineIndex = (unit: Unit, pipelineId: string): number =>
  unit.unit.pipelines.findIndex(({ id }) => id === pipelineId);

/** The pipeline a processing node's lines are stored on, unless it is a route's or scoped. */
const findWirableProcessingPipelineIndex = (unit: Unit, ref: ProcessingNodeRef): number => {
  if (ref.kind !== PROCESSING_SLOT_KIND.pipeline) {
    return -1;
  }
  const pipelineIndex = findPipelineIndex(unit, ref.pipelineId);
  return pipelineIndex !== -1 && !hasScopedWiring(unit.unit.pipelines[pipelineIndex].config)
    ? pipelineIndex
    : -1;
};

/** The signals the listed components handle, or `undefined` when one of them is not on the unit. */
const componentSignals = (
  components: ReadonlyArray<{ id: string; supported_telemetry: readonly UnitSignal[] }>,
  ids: readonly string[]
): Set<UnitSignal> | undefined => {
  if (ids.length === 0) {
    return undefined;
  }
  const signals = new Set<UnitSignal>();
  for (const id of ids) {
    const component = components.find((candidate) => candidate.id === id);
    if (!component) {
      return undefined;
    }
    component.supported_telemetry.forEach((signal) => signals.add(signal));
  }
  return signals;
};

/**
 * Narrows a pipeline's signals to those its sources send and its destinations
 * accept. The distributor compiles one collector pipeline per declared signal
 * and rejects one with no receiver or exporter, which a line leaving a widened
 * pipeline would otherwise cause. Delegating pipelines and unknown components
 * are left as they are, and a pipeline never ends up with no signal.
 */
const fitSignals = (
  unit: Unit,
  telemetry: UnitPipeline['supported_telemetry'],
  config: PipelineConfig
): UnitPipeline['supported_telemetry'] => {
  const routes = readRoutes(config);
  if (routes.some(isDelegatingRoute)) {
    return [...telemetry];
  }
  const sent = componentSignals(unit.unit.sources, readEntryIds(config, PIPELINE_ENTRY.sources));
  const accepted = componentSignals(unit.unit.destinations, [
    ...readEntryIds(config, PIPELINE_ENTRY.destinations),
    ...routes.flatMap(routeDestinationIds),
  ]);
  const fitting = telemetry.filter(
    (signal) => (sent?.has(signal) ?? true) && (accepted?.has(signal) ?? true)
  );
  return fitting.length > 0 ? fitting : [...telemetry];
};

const replacePipelineConfig = (unit: Unit, pipelineIndex: number, config: PipelineConfig): Unit =>
  replacePipelines(
    unit,
    unit.unit.pipelines.map((pipeline, index) =>
      index === pipelineIndex
        ? {
            ...pipeline,
            config,
            supported_telemetry: fitSignals(unit, pipeline.supported_telemetry, config),
          }
        : pipeline
    )
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
        supported_telemetry: fitSignals(
          unit,
          supportedTelemetry ?? pipeline.supported_telemetry,
          config
        ),
      },
    ];
  });
  return replacePipelines(unit, pipelines);
};

const pipelineIdForSource = (unit: Unit, sourceId: string): string =>
  allocateComponentId(`p-${sourceId}`, usedComponentIds(unit), { bareFirst: true });

const insertSourcePipeline = (
  unit: Unit,
  pipelineId: string,
  sourceId: string,
  supportedTelemetry: UnitPipeline['supported_telemetry'],
  forwarding: PipelineConfig
): Unit => {
  const config: PipelineConfig = [
    { name: PIPELINE_ENTRY.sources, value: [sourceId] },
    ...forwarding,
  ];
  return replacePipelines(unit, [
    ...unit.unit.pipelines,
    { id: pipelineId, supported_telemetry: fitSignals(unit, supportedTelemetry, config), config },
  ]);
};

const appendSourcePipeline = (
  unit: Unit,
  sourceId: string,
  supportedTelemetry: UnitPipeline['supported_telemetry'],
  forwarding: PipelineConfig
): Unit =>
  insertSourcePipeline(
    unit,
    pipelineIdForSource(unit, sourceId),
    sourceId,
    supportedTelemetry,
    forwarding
  );

const detachSource = (unit: Unit, pipelineIndex: number, sourceId: string): Unit => {
  const pipeline = unit.unit.pipelines[pipelineIndex];
  return writePipeline(
    unit,
    pipelineIndex,
    withIdentifiers(
      pipeline.config,
      PIPELINE_ENTRY.sources,
      readEntryIds(pipeline.config, PIPELINE_ENTRY.sources).filter((id) => id !== sourceId)
    )
  );
};

interface ReachedDestination {
  destinationId: string;
  forwarding: UnitEdgeForwarding;
}

/**
 * Follows the unit graph's lines from an endpoint to the destinations they end
 * at, in drawing order. A path that crosses a route forwards by `route`.
 */
const reachabilityOf = (graph: UnitGraph) => {
  const outgoing = new Map<string, UnitGraphEdge[]>();
  for (const edge of graph.edges) {
    const key = endpointKey(edge.source);
    outgoing.set(key, [...(outgoing.get(key) ?? []), edge]);
  }
  return (start: UnitConnectionOrigin): ReachedDestination[] => {
    const reached = new Map<string, UnitEdgeForwarding>();
    const visited = new Set<string>();
    const visit = (endpoint: UnitGraphEndpoint, viaRoute: boolean) => {
      const key = endpointKey(endpoint);
      if (visited.has(key)) {
        return;
      }
      visited.add(key);
      for (const { target, forwarding } of outgoing.get(key) ?? []) {
        const routed = viaRoute || forwarding === EDGE_FORWARDING.route;
        if (target.kind !== GRAPH_ENDPOINT_KIND.destination) {
          visit(target, routed);
        } else if (!reached.has(target.id)) {
          reached.set(target.id, routed ? EDGE_FORWARDING.route : EDGE_FORWARDING.direct);
        }
      }
    };
    visit(start, false);
    return [...reached].map(([destinationId, forwarding]) => ({ destinationId, forwarding }));
  };
};

const sourceOrigin = (id: string): UnitConnectionOrigin => ({
  kind: GRAPH_ENDPOINT_KIND.source,
  id,
});

/** Source/destination pairs the unit currently delivers, including through processing and delegation. */
export const getUnitConnections = (
  unit: Unit,
  configuredSourceIds: ReadonlySet<string>,
  configuredDestinationIds: ReadonlySet<string>
): UnitConnection[] => {
  const graph = buildUnitGraph(unit, configuredSourceIds, configuredDestinationIds);
  const reachedFrom = reachabilityOf(graph);
  const sourceIds = new Set(
    graph.edges.flatMap(({ source }) =>
      source.kind === GRAPH_ENDPOINT_KIND.source ? [source.id] : []
    )
  );
  return [...sourceIds].flatMap((sourceId) =>
    reachedFrom(sourceOrigin(sourceId)).map(({ destinationId, forwarding }) => ({
      sourceId,
      destinationId,
      forwarding,
    }))
  );
};

/** Sources whose records reach the endpoint, including through route delegation. */
const upstreamSourceIds = (graph: UnitGraph, endpoint: UnitGraphEndpoint): string[] => {
  const incoming = new Map<string, UnitGraphEdge[]>();
  for (const edge of graph.edges) {
    const key = endpointKey(edge.target);
    incoming.set(key, [...(incoming.get(key) ?? []), edge]);
  }
  const sourceIds = new Set<string>();
  const visited = new Set<string>();
  const visit = (current: UnitGraphEndpoint) => {
    const key = endpointKey(current);
    if (visited.has(key)) {
      return;
    }
    visited.add(key);
    for (const { source } of incoming.get(key) ?? []) {
      if (source.kind === GRAPH_ENDPOINT_KIND.source) {
        sourceIds.add(source.id);
      } else {
        visit(source);
      }
    }
  };
  visit(endpoint);
  return [...sourceIds];
};

/** Whether records from any of the origins already reach the destination, processed or not. */
const reaches = (
  graph: UnitGraph,
  origins: readonly UnitConnectionOrigin[],
  destinationId: string
): boolean => {
  const reachedFrom = reachabilityOf(graph);
  return origins.some((origin) =>
    reachedFrom(origin).some((reached) => reached.destinationId === destinationId)
  );
};

const sharesSignal = (left: readonly UnitSignal[], right: readonly UnitSignal[]): boolean =>
  left.some((signal) => right.includes(signal));

const TELEMETRY_FIT = {
  unknown: 'unknown',
  incompatible: 'incompatible',
} as const;

/**
 * Signals both components accept. `unknown` means one side is not on the unit,
 * so compatibility is left to the caller. `incompatible` means both are known
 * and share no signal.
 */
const telemetryFit = (
  unit: Unit,
  sourceId: string,
  destinationId: string
): (typeof TELEMETRY_FIT)[keyof typeof TELEMETRY_FIT] | UnitPipeline['supported_telemetry'] => {
  const source = unit.unit.sources?.find((item) => item.id === sourceId);
  const destination = unit.unit.destinations?.find((item) => item.id === destinationId);
  if (!source || !destination) {
    return TELEMETRY_FIT.unknown;
  }
  const destinationSignals = new Set(destination.supported_telemetry);
  const shared = source.supported_telemetry.filter((signal) => destinationSignals.has(signal));
  if (shared.length === 0) {
    return TELEMETRY_FIT.incompatible;
  }
  return shared;
};

const pipelineTelemetry = (
  unit: Unit,
  sourceId: string,
  destinationId: string
): UnitPipeline['supported_telemetry'] => {
  const fit = telemetryFit(unit, sourceId, destinationId);
  return fit === TELEMETRY_FIT.unknown || fit === TELEMETRY_FIT.incompatible
    ? [...DEFAULT_SUPPORTED_TELEMETRY]
    : fit;
};

/**
 * Whether the source already forwards somewhere, through a direct pipeline or a
 * routing pipeline. A source has at most one outgoing connection.
 */
export const hasSourceConnection = (unit: Unit, sourceId: string): boolean =>
  unit.unit.pipelines.some(
    ({ config }) =>
      readEntryIds(config, PIPELINE_ENTRY.sources).includes(sourceId) && pipelineForwards(config)
  );

/** A source line is refused when the source already delivers to the destination on any path. */
export const canConnectSourceToDestination = (
  unit: Unit,
  sourceId: string,
  destinationId: string
): boolean => {
  const fit = telemetryFit(unit, sourceId, destinationId);
  if (
    fit === TELEMETRY_FIT.incompatible ||
    reaches(buildUnitGraph(unit), [sourceOrigin(sourceId)], destinationId)
  ) {
    return false;
  }
  const pipelineIndex = findUnprocessedSourcePipelineIndex(unit.unit.pipelines, sourceId);
  if (pipelineIndex === -1) {
    return true;
  }
  const pipeline = unit.unit.pipelines[pipelineIndex];
  return !pipelineUsesRoutes(pipeline) || !catchAllBlocksDestination(readRoutes(pipeline.config));
};

/** Adds a destination to the source's pipeline without processors, creating it when needed. */
export const connectSourceToDestination = (
  unit: Unit,
  sourceId: string,
  destinationId: string
): Unit => {
  if (!canConnectSourceToDestination(unit, sourceId, destinationId)) {
    return unit;
  }
  const pipelineIndex = findUnprocessedSourcePipelineIndex(unit.unit.pipelines, sourceId);
  if (pipelineIndex === -1) {
    return appendSourcePipeline(unit, sourceId, pipelineTelemetry(unit, sourceId, destinationId), [
      { name: PIPELINE_ENTRY.destinations, value: [destinationId] },
    ]);
  }
  const pipeline = unit.unit.pipelines[pipelineIndex];
  const sources = readEntryIds(pipeline.config, PIPELINE_ENTRY.sources);
  // The pipeline has no processors, so widening its signals for the new line is safe.
  const nextTelemetry = unionSignals(
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
      [{ name: PIPELINE_ENTRY.routes, value: routes }]
    );
  }
  const destinations = readEntryIds(pipeline.config, PIPELINE_ENTRY.destinations);
  if (sources.length === 1) {
    return writePipeline(
      unit,
      pipelineIndex,
      withIdentifiers(pipeline.config, PIPELINE_ENTRY.destinations, [
        ...destinations,
        destinationId,
      ]),
      nextTelemetry
    );
  }
  return appendSourcePipeline(
    detachSource(unit, pipelineIndex, sourceId),
    sourceId,
    nextTelemetry,
    [{ name: PIPELINE_ENTRY.destinations, value: [...destinations, destinationId] }]
  );
};

/** Drops one line drawn from the source, from the pipeline without processors that owns it. */
export const disconnectSourceFromDestination = (
  unit: Unit,
  sourceId: string,
  destinationId: string
): Unit => {
  const pipelineIndex = findUnprocessedSourcePipelineIndex(
    unit.unit.pipelines,
    sourceId,
    destinationId
  );
  if (pipelineIndex === -1) {
    return unit;
  }
  const pipeline = unit.unit.pipelines[pipelineIndex];
  const sources = readEntryIds(pipeline.config, PIPELINE_ENTRY.sources);
  if (pipelineUsesRoutes(pipeline)) {
    const routes = removeDestinationFromRoutes(readRoutes(pipeline.config), destinationId);
    if (sources.length === 1) {
      return writePipeline(unit, pipelineIndex, withRoutes(pipeline.config, routes));
    }
    const detached = detachSource(unit, pipelineIndex, sourceId);
    if (routes.length === 0) {
      return detached;
    }
    return appendSourcePipeline(detached, sourceId, pipeline.supported_telemetry, [
      { name: PIPELINE_ENTRY.routes, value: routes },
    ]);
  }
  const destinations = readEntryIds(pipeline.config, PIPELINE_ENTRY.destinations);
  if (sources.length === 1) {
    return writePipeline(
      unit,
      pipelineIndex,
      withIdentifiers(
        pipeline.config,
        PIPELINE_ENTRY.destinations,
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
    { name: PIPELINE_ENTRY.destinations, value: remaining },
  ]);
};

/**
 * Moves one source line off the pipeline it shares with other lines onto a new
 * source pipeline, so processing can be added to that line alone. Lines on
 * routes are left alone: each route already has its own slot.
 */
export const isolateSourceLine = (
  unit: Unit,
  sourceId: string,
  destinationId: string
): { unit: Unit; pipelineId: string } | undefined => {
  const pipeline =
    unit.unit.pipelines[
      findUnprocessedSourcePipelineIndex(unit.unit.pipelines, sourceId, destinationId)
    ];
  if (!pipeline || pipelineUsesRoutes(pipeline)) {
    return undefined;
  }
  const released = disconnectSourceFromDestination(unit, sourceId, destinationId);
  const pipelineId = pipelineIdForSource(released, sourceId);
  return {
    unit: insertSourcePipeline(released, pipelineId, sourceId, pipeline.supported_telemetry, [
      { name: PIPELINE_ENTRY.destinations, value: [destinationId] },
    ]),
    pipelineId,
  };
};

/** Condition of the placeholder rule {@link addTestRoutingToLine} creates. */
export const TEST_ROUTING_CONDITION = 'true';

/**
 * Testing aid: routes one drawn line through a routing node with a single
 * placeholder rule. A source line is first moved onto a pipeline of its own; a
 * processing line is only routed when it is its pipeline's one destination.
 * Returns `unit` unchanged when the line cannot be routed.
 */
export const addTestRoutingToLine = (
  unit: Unit,
  origin: UnitConnectionOrigin,
  destinationId: string
): Unit => {
  let routable = unit;
  let pipelineIndex: number;
  if (origin.kind === GRAPH_ENDPOINT_KIND.source) {
    const isolated = isolateSourceLine(unit, origin.id, destinationId);
    if (!isolated) {
      return unit;
    }
    routable = isolated.unit;
    pipelineIndex = findPipelineIndex(routable, isolated.pipelineId);
  } else {
    pipelineIndex = findWirableProcessingPipelineIndex(unit, origin.ref);
  }
  const pipeline = routable.unit.pipelines[pipelineIndex];
  if (
    !pipeline ||
    pipelineUsesRoutes(pipeline) ||
    !isEqual(readEntryIds(pipeline.config, PIPELINE_ENTRY.destinations), [destinationId])
  ) {
    return unit;
  }
  return writePipeline(
    routable,
    pipelineIndex,
    withRoutes(withIdentifiers(pipeline.config, PIPELINE_ENTRY.destinations, []), [
      { when: TEST_ROUTING_CONDITION, destinations: [destinationId] },
    ])
  );
};

/**
 * Only pipeline processing can start a line. A route's branch targets belong to
 * its routing node, so its processing node does not add to them.
 */
const canConnectProcessingToDestination = (
  unit: Unit,
  ref: ProcessingNodeRef,
  destinationId: string
): boolean => {
  const pipeline = unit.unit.pipelines[findWirableProcessingPipelineIndex(unit, ref)];
  if (!pipeline) {
    return false;
  }
  const destination = unit.unit.destinations?.find(({ id }) => id === destinationId);
  if (destination && !sharesSignal(destination.supported_telemetry, pipeline.supported_telemetry)) {
    return false;
  }
  const graph = buildUnitGraph(unit);
  const processing: UnitConnectionOrigin = { kind: GRAPH_ENDPOINT_KIND.processing, ref };
  const origins = [processing, ...upstreamSourceIds(graph, processing).map(sourceOrigin)];
  if (reaches(graph, origins, destinationId)) {
    return false;
  }
  return !pipelineUsesRoutes(pipeline) || !catchAllBlocksDestination(readRoutes(pipeline.config));
};

const connectProcessingToDestination = (
  unit: Unit,
  ref: ProcessingNodeRef,
  destinationId: string
): Unit => {
  if (!canConnectProcessingToDestination(unit, ref, destinationId)) {
    return unit;
  }
  const pipelineIndex = findWirableProcessingPipelineIndex(unit, ref);
  const pipeline = unit.unit.pipelines[pipelineIndex];
  const { config } = pipeline;
  return writePipeline(
    unit,
    pipelineIndex,
    pipelineUsesRoutes(pipeline)
      ? withRoutes(config, addDestinationToRoutes(readRoutes(config), destinationId))
      : withIdentifiers(config, PIPELINE_ENTRY.destinations, [
          ...readEntryIds(config, PIPELINE_ENTRY.destinations),
          destinationId,
        ])
  );
};

const disconnectProcessingFromDestination = (
  unit: Unit,
  ref: ProcessingNodeRef,
  destinationId: string
): Unit => {
  const pipelineIndex = findWirableProcessingPipelineIndex(unit, ref);
  const pipeline = unit.unit.pipelines[pipelineIndex];
  if (!pipeline || !forwardsDirectlyTo(pipeline, destinationId)) {
    return unit;
  }
  const { config } = pipeline;
  return replacePipelineConfig(
    unit,
    pipelineIndex,
    pipelineUsesRoutes(pipeline)
      ? withRoutes(config, removeDestinationFromRoutes(readRoutes(config), destinationId))
      : withIdentifiers(
          config,
          PIPELINE_ENTRY.destinations,
          readEntryIds(config, PIPELINE_ENTRY.destinations).filter((id) => id !== destinationId)
        )
  );
};

export const canConnectToDestination = (
  unit: Unit,
  origin: UnitConnectionOrigin,
  destinationId: string
): boolean =>
  origin.kind === GRAPH_ENDPOINT_KIND.source
    ? canConnectSourceToDestination(unit, origin.id, destinationId)
    : canConnectProcessingToDestination(unit, origin.ref, destinationId);

/** Draws a line from a source (unprocessed records) or a processing node (processed records). */
export const connectToDestination = (
  unit: Unit,
  origin: UnitConnectionOrigin,
  destinationId: string
): Unit =>
  origin.kind === GRAPH_ENDPOINT_KIND.source
    ? connectSourceToDestination(unit, origin.id, destinationId)
    : connectProcessingToDestination(unit, origin.ref, destinationId);

/**
 * Removes one drawn line. A source pipeline left forwarding nowhere is dropped;
 * a processing node stays, unconnected, until it is reconnected or emptied.
 */
export const disconnectFromDestination = (
  unit: Unit,
  origin: UnitConnectionOrigin,
  destinationId: string
): Unit =>
  origin.kind === GRAPH_ENDPOINT_KIND.source
    ? pruneUnit(unit, disconnectSourceFromDestination(unit, origin.id, destinationId))
    : disconnectProcessingFromDestination(unit, origin.ref, destinationId);

/** Pipelines that send records nowhere. The distributor rejects a unit that has any. */
export const getPipelinesWithoutDestinations = (unit: Unit): UnitPipeline[] =>
  unit.unit.pipelines.filter(({ config }) => !pipelineForwards(config));

/**
 * Whether the drawn line is stored where this module can remove it. Lines the
 * graph collapses through delegated pipelines without processors are not.
 */
export const canDisconnectFromDestination = (
  unit: Unit,
  origin: UnitConnectionOrigin,
  destinationId: string
): boolean => {
  if (origin.kind === GRAPH_ENDPOINT_KIND.source) {
    return findUnprocessedSourcePipelineIndex(unit.unit.pipelines, origin.id, destinationId) !== -1;
  }
  const pipeline = unit.unit.pipelines[findWirableProcessingPipelineIndex(unit, origin.ref)];
  return pipeline !== undefined && forwardsDirectlyTo(pipeline, destinationId);
};

export interface UnitConnectionMove {
  previousOrigin: UnitConnectionOrigin;
  previousDestinationId: string;
  origin: UnitConnectionOrigin;
  destinationId: string;
}

const isSameLine = ({
  previousOrigin,
  previousDestinationId,
  origin,
  destinationId,
}: UnitConnectionMove) =>
  isEqual(previousOrigin, origin) && previousDestinationId === destinationId;

/** Whether a line can be dropped on the new handle, judged with the line itself released. */
export const canMoveUnitConnection = (unit: Unit, move: UnitConnectionMove): boolean =>
  isSameLine(move) ||
  canConnectToDestination(
    disconnectFromDestination(unit, move.previousOrigin, move.previousDestinationId),
    move.origin,
    move.destinationId
  );

/** Moves a line onto a new start or destination handle. */
export const moveUnitConnection = (unit: Unit, move: UnitConnectionMove): Unit => {
  if (isSameLine(move)) {
    return unit;
  }
  const { previousOrigin, previousDestinationId, origin, destinationId } = move;
  const released = disconnectFromDestination(unit, previousOrigin, previousDestinationId);
  return canConnectToDestination(released, origin, destinationId)
    ? connectToDestination(released, origin, destinationId)
    : unit;
};

/**
 * One output of a routing node: a rule in a pipeline's `routes` list, or rule 0
 * of a routed child pipeline that uses a plain `destinations` list.
 */
export interface RouteRuleRef {
  pipelineId: string;
  ruleIndex: number;
}

/** Where a routing rule forwards records: a destination, or a child pipeline. */
export interface RouteTarget {
  kind: 'destination' | 'pipeline';
  id: string;
}

const isSameTarget = (left: RouteTarget, right: RouteTarget): boolean =>
  left.kind === right.kind && left.id === right.id;

const isRoutedPipeline = (unit: Unit, pipelineId: string): boolean =>
  unit.unit.pipelines.some(({ config }) =>
    readRoutes(config).some(
      (route) => isDelegatingRoute(route) && route.pipelines.includes(pipelineId)
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
      if (isDelegatingRoute(route)) {
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
      ? readEntryIds(pipeline.config, PIPELINE_ENTRY.destinations).map((id) => ({
          kind: 'destination',
          id,
        }))
      : undefined;
  }
  const route = readRoutes(pipeline.config)[ruleIndex];
  if (!route) {
    return undefined;
  }
  return isDelegatingRoute(route)
    ? route.pipelines.map((id) => ({ kind: 'pipeline', id }))
    : route.destinations.map((id) => ({ kind: 'destination', id }));
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
 * stays in place, keeping its condition, so it can be reconnected; unconnected
 * rules are stripped when the unit is saved. Undefined when the targets cannot
 * be stored: a rule lists either destinations or pipelines, a plain
 * `destinations` list only holds destinations, and telemetry-scoped wiring is
 * left as it is.
 */
const withRuleTargets = (
  pipeline: UnitPipeline,
  ruleIndex: number,
  targets: readonly RouteTarget[]
): PipelineConfig | undefined => {
  const kinds = new Set(targets.map(({ kind }) => kind));
  if (kinds.size > 1 || hasScopedWiring(pipeline.config)) {
    return undefined;
  }
  const ids = targets.map(({ id }) => id);
  if (!pipelineUsesRoutes(pipeline)) {
    const kind = targets[0]?.kind ?? 'destination';
    return kind === 'destination'
      ? withIdentifiers(pipeline.config, PIPELINE_ENTRY.destinations, ids)
      : undefined;
  }
  return withRoutes(
    pipeline.config,
    readRoutes(pipeline.config).flatMap((route, index) => {
      if (index !== ruleIndex) {
        return [route];
      }
      const currentKind = isDelegatingRoute(route) ? 'pipeline' : 'destination';
      return [routeWithTargets(route, targets[0]?.kind ?? currentKind, ids)];
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
    return (
      target !== undefined &&
      !pipelineReaches(unit, id, pipeline.id) &&
      sharesSignal(pipeline.supported_telemetry, target.supported_telemetry)
    );
  }
  const destination = unit.unit.destinations?.find((item) => item.id === id);
  return (
    !destination || sharesSignal(pipeline.supported_telemetry, destination.supported_telemetry)
  );
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

/** Drops one target from a routing rule. A rule left with no targets stays, unconnected. */
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

export interface RouteConnectionMove {
  previousRule: RouteRuleRef;
  previousTarget: RouteTarget;
  rule: RouteRuleRef;
  target: RouteTarget;
}

/**
 * Moves a routing rule's line onto another target. Within one rule the target
 * is swapped in place, so a single-target rule can switch between a
 * destination and a child pipeline.
 */
export const moveRouteConnection = (
  unit: Unit,
  { previousRule, previousTarget, rule, target }: RouteConnectionMove
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

const removeComponentReferences = (unit: Unit, componentId: string): Unit =>
  replacePipelines(
    unit,
    unit.unit.pipelines.flatMap((pipeline) => {
      const hadSources = pipeline.config.some((entry) => entry.name === PIPELINE_ENTRY.sources);
      const config: PipelineConfig = [];
      for (const entry of pipeline.config) {
        if (entry.name === PIPELINE_ENTRY.sources) {
          const value = entry.value.filter((id) => id !== componentId);
          if (value.length > 0) {
            config.push({ ...entry, value });
          }
          continue;
        }
        if (entry.name === PIPELINE_ENTRY.destinations) {
          const value = entry.value.filter((id) => id !== componentId);
          if (value.length > 0) {
            config.push({ ...entry, value });
          }
          continue;
        }
        if (entry.name === PIPELINE_ENTRY.routes) {
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
      if (hadSources && !config.some((entry) => entry.name === PIPELINE_ENTRY.sources)) {
        return [];
      }
      return [
        {
          ...pipeline,
          config,
          supported_telemetry: fitSignals(unit, pipeline.supported_telemetry, config),
        },
      ];
    })
  );

/**
 * Drops a deleted component id from pipeline source and destination lists, then
 * removes processing pipelines (and their processors) the deletion orphaned.
 */
export const removeComponentFromPipelines = (unit: Unit, componentId: string): Unit =>
  pruneUnit(unit, removeComponentReferences(unit, componentId));
