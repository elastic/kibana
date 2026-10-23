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

/** A catch-all that delegates to child pipelines already consumes every record. */
const catchAllBlocksDestination = (routes: readonly RouteRule[]): boolean => {
  const catchAll = routes.find((route) => route.when === undefined);
  return catchAll !== undefined && isDelegatingRoute(catchAll);
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
 * and without telemetry-scoped wiring this module would merge. With a
 * destination, only the pipeline that forwards to it matches.
 */
const findUnprocessedSourcePipelineIndex = (
  pipelines: Unit['unit']['pipelines'],
  sourceId: string,
  destinationId?: string
): number =>
  pipelines.findIndex(
    (pipeline) =>
      !hasProcessors(pipeline) &&
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

const replacePipelineConfig = (unit: Unit, pipelineIndex: number, config: PipelineConfig): Unit =>
  replacePipelines(
    unit,
    unit.unit.pipelines.map((pipeline, index) =>
      index === pipelineIndex ? { ...pipeline, config } : pipeline
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
        ...(supportedTelemetry ? { supported_telemetry: [...supportedTelemetry] } : {}),
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
): Unit =>
  replacePipelines(unit, [
    ...unit.unit.pipelines,
    {
      id: pipelineId,
      supported_telemetry: [...supportedTelemetry],
      config: [{ name: PIPELINE_ENTRY.sources, value: [sourceId] }, ...forwarding],
    },
  ]);

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
      return [{ ...pipeline, config }];
    })
  );

/**
 * Drops a deleted component id from pipeline source and destination lists, then
 * removes processing pipelines (and their processors) the deletion orphaned.
 */
export const removeComponentFromPipelines = (unit: Unit, componentId: string): Unit =>
  pruneUnit(unit, removeComponentReferences(unit, componentId));
