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
  type ProcessingNodeRef,
  type UnitEdgeForwarding,
  type UnitGraphEndpoint,
  type UnitSignal,
} from './unit_graph';
import {
  PIPELINE_ENTRY,
  isDelegatingRoute,
  type PipelineConfig,
  type RouteRule,
  type UnitPipeline,
} from './unit_pipeline';
import { pruneUnit } from './unit_processing';

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

const DEFAULT_SUPPORTED_TELEMETRY = ['logs', 'metrics', 'traces'] as const;
const PIPELINE_ID_PATTERN = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;

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

const readIdentifiers = (config: PipelineConfig, name: IdentifierEntryName): string[] => {
  for (const entry of config) {
    if (entry.name === name) {
      return [...entry.value];
    }
  }
  return [];
};

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

const readRoutes = (config: PipelineConfig): RouteRule[] => {
  for (const entry of config) {
    if (entry.name === PIPELINE_ENTRY.routes) {
      return [...entry.value];
    }
  }
  return [];
};

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

const pipelineForwards = (config: PipelineConfig): boolean =>
  readIdentifiers(config, PIPELINE_ENTRY.destinations).length > 0 ||
  config.some((entry) => entry.name === PIPELINE_ENTRY.routes);

const replacePipelines = (unit: Unit, pipelines: Unit['unit']['pipelines']): Unit => ({
  ...unit,
  unit: {
    ...unit.unit,
    pipelines,
  },
});

const hasProcessors = (pipeline: UnitPipeline): boolean =>
  pipeline.config.some(
    (entry) => entry.name === PIPELINE_ENTRY.processors && entry.value.length > 0
  );

const forwardsDirectlyTo = (pipeline: UnitPipeline, destinationId: string): boolean =>
  pipelineUsesRoutes(pipeline)
    ? routesIncludeDestination(readRoutes(pipeline.config), destinationId)
    : readIdentifiers(pipeline.config, PIPELINE_ENTRY.destinations).includes(destinationId);

/**
 * The source pipeline whose lines start at the source: one without processors.
 * With a destination, only the pipeline that forwards to it matches.
 */
const findUnprocessedSourcePipelineIndex = (
  pipelines: Unit['unit']['pipelines'],
  sourceId: string,
  destinationId?: string
): number =>
  pipelines.findIndex(
    (pipeline) =>
      !hasProcessors(pipeline) &&
      readIdentifiers(pipeline.config, PIPELINE_ENTRY.sources).includes(sourceId) &&
      (destinationId === undefined || forwardsDirectlyTo(pipeline, destinationId))
  );

const findPipelineIndex = (unit: Unit, pipelineId: string): number =>
  unit.unit.pipelines.findIndex(({ id }) => id === pipelineId);

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
      config: [{ name: PIPELINE_ENTRY.sources, value: [sourceId] }, ...forwarding],
    },
  ]);

const detachSource = (unit: Unit, pipelineIndex: number, sourceId: string): Unit => {
  const pipeline = unit.unit.pipelines[pipelineIndex];
  return writePipeline(
    unit,
    pipelineIndex,
    withIdentifiers(
      pipeline.config,
      PIPELINE_ENTRY.sources,
      readIdentifiers(pipeline.config, PIPELINE_ENTRY.sources).filter((id) => id !== sourceId)
    )
  );
};

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

/** Destinations a pipeline forwards to, following route delegation into processing pipelines. */
const forwardedDestinations = (
  pipeline: UnitPipeline,
  pipelinesById: ReadonlyMap<string, UnitPipeline>,
  forwarding: UnitEdgeForwarding,
  visiting: ReadonlySet<string>
): Array<{ destinationId: string; forwarding: UnitEdgeForwarding }> => {
  if (visiting.has(pipeline.id)) {
    return [];
  }
  const nextVisiting = new Set(visiting).add(pipeline.id);
  if (!pipelineUsesRoutes(pipeline)) {
    return readIdentifiers(pipeline.config, PIPELINE_ENTRY.destinations).map((destinationId) => ({
      destinationId,
      forwarding,
    }));
  }
  return readRoutes(pipeline.config).flatMap((route) => {
    if (!isDelegatingRoute(route)) {
      return route.destinations.map((destinationId) => ({
        destinationId,
        forwarding: EDGE_FORWARDING.route,
      }));
    }
    return route.pipelines.flatMap((childId) => {
      const child = pipelinesById.get(childId);
      return child
        ? forwardedDestinations(child, pipelinesById, EDGE_FORWARDING.route, nextVisiting)
        : [];
    });
  });
};

/** Source/destination pairs each source pipeline currently forwards, including through delegation. */
export const getUnitConnections = (
  unit: Unit,
  configuredSourceIds: ReadonlySet<string>,
  configuredDestinationIds: ReadonlySet<string>
): UnitConnection[] => {
  const seen = new Set<string>();
  const connections: UnitConnection[] = [];
  const pipelinesById = new Map(unit.unit.pipelines.map((pipeline) => [pipeline.id, pipeline]));
  for (const pipeline of unit.unit.pipelines) {
    const sources = readIdentifiers(pipeline.config, PIPELINE_ENTRY.sources).filter((id) =>
      configuredSourceIds.has(id)
    );
    if (sources.length === 0) {
      continue;
    }
    const destinations = forwardedDestinations(
      pipeline,
      pipelinesById,
      EDGE_FORWARDING.direct,
      new Set()
    ).filter(({ destinationId }) => configuredDestinationIds.has(destinationId));
    for (const sourceId of sources) {
      for (const { destinationId, forwarding } of destinations) {
        pushConnection(connections, seen, { sourceId, destinationId, forwarding });
      }
    }
  }
  return connections;
};

const pipelineReaches = (unit: Unit, pipeline: UnitPipeline, destinationId: string): boolean => {
  const pipelinesById = new Map(unit.unit.pipelines.map((item) => [item.id, item]));
  return forwardedDestinations(pipeline, pipelinesById, EDGE_FORWARDING.direct, new Set()).some(
    (forwarded) => forwarded.destinationId === destinationId
  );
};

/** Whether any of the source's pipelines already delivers to the destination, processed or not. */
const sourceReaches = (unit: Unit, sourceId: string, destinationId: string): boolean =>
  unit.unit.pipelines.some(
    (pipeline) =>
      readIdentifiers(pipeline.config, PIPELINE_ENTRY.sources).includes(sourceId) &&
      pipelineReaches(unit, pipeline, destinationId)
  );

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
  if (fit === TELEMETRY_FIT.incompatible || sourceReaches(unit, sourceId, destinationId)) {
    return false;
  }
  const pipelineIndex = findUnprocessedSourcePipelineIndex(unit.unit.pipelines, sourceId);
  if (pipelineIndex === -1) {
    return true;
  }
  const pipeline = unit.unit.pipelines[pipelineIndex];
  if (fit !== TELEMETRY_FIT.unknown && !sharesSignal(fit, pipeline.supported_telemetry)) {
    return false;
  }
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
  const sources = readIdentifiers(pipeline.config, PIPELINE_ENTRY.sources);
  if (pipelineUsesRoutes(pipeline)) {
    const routes = addDestinationToRoutes(readRoutes(pipeline.config), destinationId);
    if (sources.length === 1) {
      return writePipeline(unit, pipelineIndex, withRoutes(pipeline.config, routes));
    }
    return appendSourcePipeline(
      detachSource(unit, pipelineIndex, sourceId),
      sourceId,
      pipeline.supported_telemetry,
      [{ name: PIPELINE_ENTRY.routes, value: routes }]
    );
  }
  const destinations = readIdentifiers(pipeline.config, PIPELINE_ENTRY.destinations);
  if (sources.length === 1) {
    return writePipeline(
      unit,
      pipelineIndex,
      withIdentifiers(pipeline.config, PIPELINE_ENTRY.destinations, [
        ...destinations,
        destinationId,
      ])
    );
  }
  return appendSourcePipeline(
    detachSource(unit, pipelineIndex, sourceId),
    sourceId,
    pipeline.supported_telemetry,
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
  const sources = readIdentifiers(pipeline.config, PIPELINE_ENTRY.sources);
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
  const destinations = readIdentifiers(pipeline.config, PIPELINE_ENTRY.destinations);
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
    unit: appendSourcePipeline(released, sourceId, pipeline.supported_telemetry, [
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
  if (ref.kind !== PROCESSING_SLOT_KIND.pipeline) {
    return false;
  }
  const pipeline = unit.unit.pipelines.find(({ id }) => id === ref.pipelineId);
  if (!pipeline) {
    return false;
  }
  const destination = unit.unit.destinations?.find(({ id }) => id === destinationId);
  if (destination && !sharesSignal(destination.supported_telemetry, pipeline.supported_telemetry)) {
    return false;
  }
  if (
    pipelineReaches(unit, pipeline, destinationId) ||
    readIdentifiers(pipeline.config, PIPELINE_ENTRY.sources).some((sourceId) =>
      sourceReaches(unit, sourceId, destinationId)
    )
  ) {
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
  const pipelineIndex = findPipelineIndex(unit, ref.pipelineId);
  const pipeline = unit.unit.pipelines[pipelineIndex];
  const { config } = pipeline;
  return writePipeline(
    unit,
    pipelineIndex,
    pipelineUsesRoutes(pipeline)
      ? withRoutes(config, addDestinationToRoutes(readRoutes(config), destinationId))
      : withIdentifiers(config, PIPELINE_ENTRY.destinations, [
          ...readIdentifiers(config, PIPELINE_ENTRY.destinations),
          destinationId,
        ])
  );
};

const disconnectProcessingFromDestination = (
  unit: Unit,
  ref: ProcessingNodeRef,
  destinationId: string
): Unit => {
  const pipelineIndex =
    ref.kind === PROCESSING_SLOT_KIND.pipeline ? findPipelineIndex(unit, ref.pipelineId) : -1;
  const pipeline = unit.unit.pipelines[pipelineIndex];
  if (!pipeline || !forwardsDirectlyTo(pipeline, destinationId)) {
    return unit;
  }
  const { config } = pipeline;
  return writePipeline(
    unit,
    pipelineIndex,
    pipelineUsesRoutes(pipeline)
      ? withRoutes(config, removeDestinationFromRoutes(readRoutes(config), destinationId))
      : withIdentifiers(
          config,
          PIPELINE_ENTRY.destinations,
          readIdentifiers(config, PIPELINE_ENTRY.destinations).filter((id) => id !== destinationId)
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
 * Removes one drawn line. A pipeline left forwarding nowhere is dropped with
 * the processors only it used.
 */
export const disconnectFromDestination = (
  unit: Unit,
  origin: UnitConnectionOrigin,
  destinationId: string
): Unit =>
  pruneUnit(
    unit,
    origin.kind === GRAPH_ENDPOINT_KIND.source
      ? disconnectSourceFromDestination(unit, origin.id, destinationId)
      : disconnectProcessingFromDestination(unit, origin.ref, destinationId)
  );

/** Moves a line onto a new start or destination handle. */
export const moveUnitConnection = (
  unit: Unit,
  {
    previousOrigin,
    previousDestinationId,
    origin,
    destinationId,
  }: {
    previousOrigin: UnitConnectionOrigin;
    previousDestinationId: string;
    origin: UnitConnectionOrigin;
    destinationId: string;
  }
): Unit => {
  if (isEqual(previousOrigin, origin) && previousDestinationId === destinationId) {
    return unit;
  }
  const released = disconnectFromDestination(unit, previousOrigin, previousDestinationId);
  if (canConnectToDestination(released, origin, destinationId)) {
    return connectToDestination(released, origin, destinationId);
  }
  // Releasing a processing node's last line drops its pipeline, so add the new line first.
  const connected = connectToDestination(unit, origin, destinationId);
  return connected === unit
    ? unit
    : disconnectFromDestination(connected, previousOrigin, previousDestinationId);
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
