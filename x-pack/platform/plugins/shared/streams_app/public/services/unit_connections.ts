/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual, omit, sortBy } from 'lodash';
import type { Unit } from './unit_repository';
import {
  EDGE_FORWARDING,
  GRAPH_ENDPOINT_KIND,
  LINE_TARGET_KIND,
  PROCESSING_SLOT_KIND,
  buildUnitGraph,
  endpointKey,
  pipelineEntryEndpoint,
  routeTargets,
  type LineTargetKind,
  type ProcessingNodeRef,
  type UnitEdgeForwarding,
  type UnitGraph,
  type UnitGraphEdge,
  type UnitGraphEndpoint,
  type UnitLineTarget,
} from './unit_graph';
import {
  DEFAULT_SUPPORTED_TELEMETRY,
  PIPELINE_ENTRY,
  allocateComponentId,
  delegatedFrom,
  delegatedPipelineIds,
  delegatingRules,
  hasScopedWiring,
  intersectSignals,
  isDelegatingRoute,
  isSameRule,
  narrowSelectors,
  pipelineForwards,
  pipelineHasProcessors,
  pipelineHasSources,
  pipelineUsesRoutes,
  pruneUnit,
  readEntryIds,
  mapRouteAt,
  readRouteAt,
  readRoutes,
  replaceUnit,
  unionSignals,
  usedComponentIds,
  type PipelineConfig,
  type PipelineConfigEntry,
  type RouteRule,
  type RouteRuleRef,
  type UnitPipeline,
  type UnitSignal,
} from './unit_pipeline';

// Edits the lines of the map. Every line is one reference in the unit's
// pipelines: a source in a pipeline's `sources`, a destination in its
// `destinations` or in one of its `routes`, or a child pipeline in a route's
// `pipelines`. A line from a source carries its records unprocessed, so it is
// stored on one of the source's pipelines without processors, created when the
// source has none; dropped on a processing or routing node it joins that
// pipeline's `sources` instead. A line from a pipeline's processing is stored on
// the pipeline that owns those processors. A line from a routing rule is one of
// that rule's targets.

export type { RouteRuleRef, UnitLineTarget };

/** Where a line starts: a source (unprocessed records) or a pipeline's processing (processed records). */
type UnitConnectionOrigin = Extract<
  UnitGraphEndpoint,
  { kind: typeof GRAPH_ENDPOINT_KIND.source | typeof GRAPH_ENDPOINT_KIND.processing }
>;

/** Where a drawn line starts: a source, a processing node, or one rule of a routing node. */
export type UnitLineOrigin = Extract<
  UnitGraphEndpoint,
  {
    kind:
      | typeof GRAPH_ENDPOINT_KIND.source
      | typeof GRAPH_ENDPOINT_KIND.processing
      | typeof GRAPH_ENDPOINT_KIND.rule;
  }
>;

export interface UnitConnection {
  sourceId: string;
  destinationId: string;
  /** `direct` is an unconditional destinations list. `route` is a routing rule. */
  forwarding: UnitEdgeForwarding;
}

type IdentifierEntryName = typeof PIPELINE_ENTRY.sources | typeof PIPELINE_ENTRY.destinations;

/** Replaces an id list entry; `sources` lead the config, `destinations` close it. */
const withIdentifiers = (
  config: PipelineConfig,
  name: IdentifierEntryName,
  value: string[]
): PipelineConfig => {
  if (value.length === 0) {
    return config.filter((entry) => entry.name !== name);
  }
  const exists = config.some((entry) => entry.name === name);
  if (!exists) {
    return name === PIPELINE_ENTRY.sources
      ? [{ name, value }, ...config]
      : [...config, { name, value }];
  }
  return config.map((entry) => (entry.name === name ? { ...entry, value } : entry));
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

const findPipelineIndex = (unit: Unit, pipelineId: string): number =>
  unit.unit.pipelines.findIndex(({ id }) => id === pipelineId);

const findPipeline = (unit: Unit, pipelineId: string): UnitPipeline | undefined =>
  unit.unit.pipelines[findPipelineIndex(unit, pipelineId)];

const forwardsDirectlyTo = (pipeline: UnitPipeline, destinationId: string): boolean =>
  readEntryIds(pipeline.config, PIPELINE_ENTRY.destinations).includes(destinationId);

/**
 * The source pipeline whose direct lines start at the source: one without
 * processors or routes, and without telemetry-scoped wiring this module would
 * merge. With a destination, only the pipeline that forwards to it matches.
 */
const findUnprocessedSourcePipelineIndex = (
  pipelines: Unit['unit']['pipelines'],
  sourceId: string,
  destinationId?: string
): number =>
  pipelines.findIndex(
    (pipeline) =>
      !pipelineHasProcessors(pipeline.config) &&
      !pipelineUsesRoutes(pipeline.config) &&
      !hasScopedWiring(pipeline.config) &&
      readEntryIds(pipeline.config, PIPELINE_ENTRY.sources).includes(sourceId) &&
      (destinationId === undefined || forwardsDirectlyTo(pipeline, destinationId))
  );

/** The pipeline a processing node's direct lines are stored on, unless it is a route's or scoped. */
const findWirableProcessingPipelineIndex = (unit: Unit, ref: ProcessingNodeRef): number => {
  if (ref.kind !== PROCESSING_SLOT_KIND.pipeline) {
    return -1;
  }
  const pipelineIndex = findPipelineIndex(unit, ref.pipelineId);
  return pipelineIndex !== -1 && !hasScopedWiring(unit.unit.pipelines[pipelineIndex].config)
    ? pipelineIndex
    : -1;
};

const sharesSignal = (left: readonly UnitSignal[], right: readonly UnitSignal[]): boolean =>
  left.some((signal) => right.includes(signal));

const DEFAULT_SIGNAL_ORDER: readonly UnitSignal[] = DEFAULT_SUPPORTED_TELEMETRY;

/** Signals in a stable order, so telemetry lists do not churn with the order of edits. */
const orderSignals = (signals: Iterable<UnitSignal>): UnitSignal[] =>
  sortBy([...new Set(signals)], (signal) => {
    const rank = DEFAULT_SIGNAL_ORDER.indexOf(signal);
    return rank === -1 ? Infinity : rank;
  });

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
 * pipeline would otherwise cause. Routing pipelines and unknown components are
 * left as they are, so a dropped rule line can come back to any destination the
 * pipeline supports, and a pipeline never ends up with no signal; publishing
 * narrows routing pipelines ({@link withPublishedTelemetry}).
 */
const fitSignals = (
  unit: Unit,
  telemetry: readonly UnitSignal[],
  config: PipelineConfig
): UnitSignal[] => {
  if (pipelineUsesRoutes(config)) {
    return [...telemetry];
  }
  const sent = componentSignals(unit.unit.sources, readEntryIds(config, PIPELINE_ENTRY.sources));
  const accepted = componentSignals(
    unit.unit.destinations,
    readEntryIds(config, PIPELINE_ENTRY.destinations)
  );
  const fitting = telemetry.filter(
    (signal) => (sent?.has(signal) ?? true) && (accepted?.has(signal) ?? true)
  );
  return fitting.length > 0 ? fitting : [...telemetry];
};

/**
 * Signals that arrive at a pipeline: what its sources send, or, for a delegated
 * child, what the rules delegating to it carry. A pipeline nothing feeds yet
 * keeps its declared signals, so it can be wired before a source is connected.
 */
export const upstreamSignals = (unit: Unit, pipelineId: string): UnitSignal[] =>
  upstreamSignalsVisiting(unit, pipelineId, new Set());

const upstreamSignalsVisiting = (
  unit: Unit,
  pipelineId: string,
  visited: ReadonlySet<string>
): UnitSignal[] => {
  const pipeline = findPipeline(unit, pipelineId);
  if (!pipeline || visited.has(pipelineId)) {
    return [];
  }
  if (pipelineHasSources(pipeline.config)) {
    const sent = componentSignals(
      unit.unit.sources,
      readEntryIds(pipeline.config, PIPELINE_ENTRY.sources)
    );
    return sent ? orderSignals(sent) : [...pipeline.supported_telemetry];
  }
  const parents = delegatingRules(unit.unit.pipelines, pipelineId);
  if (parents.length === 0) {
    return [...pipeline.supported_telemetry];
  }
  const nextVisited = new Set(visited).add(pipelineId);
  const carried = parents.flatMap(({ pipeline: parent, ruleIndex }) =>
    intersectSignals(ruleSignals(unit, parent, ruleIndex, nextVisited), parent.supported_telemetry)
  );
  return carried.length > 0 ? orderSignals(carried) : [...pipeline.supported_telemetry];
};

/** Signals a rule carries: its pipeline's upstream signals, narrowed by its `routes` entry and its own `telemetry`. */
const ruleSignals = (
  unit: Unit,
  pipeline: UnitPipeline,
  ruleIndex: number,
  visited: ReadonlySet<string> = new Set()
): UnitSignal[] => {
  const upstream = upstreamSignalsVisiting(unit, pipeline.id, visited);
  const found = readRouteAt(pipeline.config, ruleIndex);
  if (!found) {
    return upstream;
  }
  return intersectSignals(intersectSignals(upstream, found.entryTelemetry), found.route.telemetry);
};

const clampTelemetry = (
  telemetry: readonly UnitSignal[] | undefined,
  published: readonly UnitSignal[]
): UnitSignal[] | undefined => {
  if (!telemetry) {
    return undefined;
  }
  const clamped = intersectSignals(telemetry, published);
  return clamped.length > 0 ? clamped : [...telemetry];
};

/**
 * The unit as it is published. While staged, routing pipelines and delegated
 * children keep every signal so a dropped rule line can reconnect; here each of
 * them is narrowed to the signals its sources send and some destination
 * accepts, through delegation, and route and entry selectors are narrowed with
 * it. Other pipelines are published as they are.
 */
export const withPublishedTelemetry = (unit: Unit): Unit => {
  const { pipelines, destinations } = unit.unit;
  const delegated = delegatedPipelineIds(pipelines);
  const published = new Map<string, UnitSignal[]>();
  const computing = new Set<string>();
  const acceptedBy = (destinationIds: readonly string[]): Set<UnitSignal> | undefined =>
    componentSignals(destinations, destinationIds);

  const publishedSignals = (pipeline: UnitPipeline): UnitSignal[] => {
    const known = published.get(pipeline.id);
    if (known) {
      return known;
    }
    if (computing.has(pipeline.id)) {
      return [...pipeline.supported_telemetry];
    }
    computing.add(pipeline.id);
    const deliverable = new Set<UnitSignal>();
    let deliverableKnown = true;
    const deliver = (
      signals: ReadonlySet<UnitSignal> | undefined,
      scope: readonly UnitSignal[] | undefined
    ) => {
      if (!signals) {
        deliverableKnown = false;
        return;
      }
      intersectSignals([...signals], scope).forEach((signal) => deliverable.add(signal));
    };
    for (const entry of pipeline.config) {
      if (entry.name === PIPELINE_ENTRY.destinations) {
        deliver(acceptedBy(entry.value), entry.telemetry);
      } else if (entry.name === PIPELINE_ENTRY.routes) {
        for (const route of entry.value) {
          const scope = narrowSelectors(entry.telemetry, route.telemetry);
          if (isDelegatingRoute(route)) {
            for (const childId of route.pipelines) {
              const child = pipelines.find(({ id }) => id === childId);
              deliver(child ? new Set(publishedSignals(child)) : undefined, scope);
            }
          } else {
            deliver(acceptedBy(route.destinations), scope);
          }
        }
      }
    }
    const upstream = new Set(upstreamSignals(unit, pipeline.id));
    const fitting = pipeline.supported_telemetry.filter(
      (signal) => upstream.has(signal) && (!deliverableKnown || deliverable.has(signal))
    );
    const result = fitting.length > 0 ? fitting : [...pipeline.supported_telemetry];
    published.set(pipeline.id, result);
    return result;
  };

  return replacePipelines(
    unit,
    pipelines.map((pipeline) => {
      if (!pipelineUsesRoutes(pipeline.config) && !delegated.has(pipeline.id)) {
        return pipeline;
      }
      const supported = publishedSignals(pipeline);
      const config = pipeline.config.map((entry) => {
        const telemetry = clampTelemetry(entry.telemetry, supported);
        const scoped = telemetry ? { ...entry, telemetry } : entry;
        if (scoped.name !== PIPELINE_ENTRY.routes) {
          return scoped;
        }
        return {
          ...scoped,
          value: scoped.value.map((route) => {
            const routeTelemetry = clampTelemetry(route.telemetry, supported);
            return routeTelemetry ? { ...route, telemetry: routeTelemetry } : route;
          }),
        };
      });
      const next = { ...pipeline, supported_telemetry: supported, config };
      return isEqual(next, pipeline) ? pipeline : next;
    })
  );
};

/** Like `writePipeline`, but keeps a pipeline that forwards nowhere, as a staged, unconnected node. */
const replacePipelineConfig = (
  unit: Unit,
  pipelineIndex: number,
  config: PipelineConfig,
  supportedTelemetry?: UnitPipeline['supported_telemetry']
): Unit =>
  replacePipelines(
    unit,
    unit.unit.pipelines.map((pipeline, index) =>
      index === pipelineIndex
        ? {
            ...pipeline,
            config,
            supported_telemetry: fitSignals(
              unit,
              supportedTelemetry ?? pipeline.supported_telemetry,
              config
            ),
          }
        : pipeline
    )
  );

/** Writes a pipeline's config, dropping a pipeline left forwarding nowhere. */
const writePipeline = (
  unit: Unit,
  pipelineIndex: number,
  config: PipelineConfig,
  supportedTelemetry?: readonly UnitSignal[]
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
  supportedTelemetry: readonly UnitSignal[],
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
  supportedTelemetry: readonly UnitSignal[],
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

/** Lines out of a routing node's rules leave the routing node, which lines come into. */
const traversalKey = (endpoint: UnitGraphEndpoint): string =>
  endpoint.kind === GRAPH_ENDPOINT_KIND.rule
    ? endpointKey({ kind: GRAPH_ENDPOINT_KIND.routing, pipelineId: endpoint.rule.pipelineId })
    : endpointKey(endpoint);

const groupEdges = (
  graph: UnitGraph,
  by: (edge: UnitGraphEdge) => UnitGraphEndpoint
): Map<string, UnitGraphEdge[]> => {
  const grouped = new Map<string, UnitGraphEdge[]>();
  for (const edge of graph.edges) {
    const key = traversalKey(by(edge));
    grouped.set(key, [...(grouped.get(key) ?? []), edge]);
  }
  return grouped;
};

/**
 * Follows the unit graph's lines from an endpoint to the destinations they end
 * at, in drawing order. A path that crosses a route forwards by `route`.
 */
const reachabilityOf = (graph: UnitGraph) => {
  const outgoing = groupEdges(graph, (edge) => edge.source);
  return (start: UnitGraphEndpoint): ReachedDestination[] => {
    const reached = new Map<string, UnitEdgeForwarding>();
    const visited = new Set<string>();
    const visit = (endpoint: UnitGraphEndpoint, viaRoute: boolean) => {
      const key = traversalKey(endpoint);
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

const sourceOrigin = (id: string): UnitGraphEndpoint => ({ kind: GRAPH_ENDPOINT_KIND.source, id });

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
  const incoming = groupEdges(graph, (edge) => edge.target);
  const sourceIds = new Set<string>();
  const visited = new Set<string>();
  const visit = (current: UnitGraphEndpoint) => {
    const key = traversalKey(current);
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
  origins: readonly UnitGraphEndpoint[],
  destinationId: string
): boolean => {
  const reachedFrom = reachabilityOf(graph);
  return origins.some((origin) =>
    reachedFrom(origin).some((reached) => reached.destinationId === destinationId)
  );
};

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
): (typeof TELEMETRY_FIT)[keyof typeof TELEMETRY_FIT] | UnitSignal[] => {
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

const pipelineTelemetry = (unit: Unit, sourceId: string, destinationId: string): UnitSignal[] => {
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
): boolean =>
  telemetryFit(unit, sourceId, destinationId) !== TELEMETRY_FIT.incompatible &&
  !reaches(buildUnitGraph(unit), [sourceOrigin(sourceId)], destinationId);

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
  const destinations = readEntryIds(pipeline.config, PIPELINE_ENTRY.destinations);
  // The pipeline has no processors, so widening its signals for the new line is safe.
  const nextTelemetry = unionSignals(
    pipeline.supported_telemetry,
    pipelineTelemetry(unit, sourceId, destinationId)
  );
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

/** Drops one direct line drawn from the source, from the pipeline without processors that owns it. */
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
  const remaining = readEntryIds(pipeline.config, PIPELINE_ENTRY.destinations).filter(
    (id) => id !== destinationId
  );
  if (sources.length === 1) {
    return writePipeline(
      unit,
      pipelineIndex,
      withIdentifiers(pipeline.config, PIPELINE_ENTRY.destinations, remaining)
    );
  }
  const detached = detachSource(unit, pipelineIndex, sourceId);
  if (remaining.length === 0) {
    return detached;
  }
  return appendSourcePipeline(detached, sourceId, pipeline.supported_telemetry, [
    { name: PIPELINE_ENTRY.destinations, value: remaining },
  ]);
};

/**
 * Moves one source line off the pipeline it shares with other lines onto a new
 * source pipeline, so processing can be added to that line alone.
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
  if (!pipeline) {
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
const TEST_ROUTING_CONDITION = 'true';

/**
 * Testing aid: routes one drawn line through a routing node with a single
 * placeholder rule. A source line is first moved onto a pipeline of its own; a
 * processing line is only routed when it is its pipeline's one destination.
 * Returns `unit` unchanged when the line cannot be routed. TO BE REMOVED
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
    pipelineUsesRoutes(pipeline.config) ||
    !isEqual(readEntryIds(pipeline.config, PIPELINE_ENTRY.destinations), [destinationId])
  ) {
    return unit;
  }
  return writePipeline(routable, pipelineIndex, [
    ...withIdentifiers(pipeline.config, PIPELINE_ENTRY.destinations, []),
    {
      name: PIPELINE_ENTRY.routes,
      value: [{ when: TEST_ROUTING_CONDITION, destinations: [destinationId] }],
    },
  ]);
};

/**
 * Only pipeline processing starts direct lines, and only when the pipeline does
 * not route: a routed pipeline's processing feeds its routing node, whose rules
 * own the targets. Signals do not gate the line: a processing node carries
 * whatever its sources send and its destinations accept, so a destination the
 * node cannot feed yet is wired now and reported by `getUnfedDestinations`
 * until a source sending its signals is connected.
 */
const canConnectProcessingToDestination = (
  unit: Unit,
  ref: ProcessingNodeRef,
  destinationId: string
): boolean => {
  const pipeline = unit.unit.pipelines[findWirableProcessingPipelineIndex(unit, ref)];
  if (!pipeline || pipelineUsesRoutes(pipeline.config)) {
    return false;
  }
  const graph = buildUnitGraph(unit);
  const processing: UnitGraphEndpoint = { kind: GRAPH_ENDPOINT_KIND.processing, ref };
  const origins = [processing, ...upstreamSourceIds(graph, processing).map(sourceOrigin)];
  return !reaches(graph, origins, destinationId);
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
  const destination = unit.unit.destinations?.find(({ id }) => id === destinationId);
  // The pipeline widens to what the new line can carry; `fitSignals` keeps the
  // signals its sources send and the destination accepts.
  const telemetry = destination
    ? unionSignals(pipeline.supported_telemetry, destination.supported_telemetry)
    : pipeline.supported_telemetry;
  return writePipeline(
    unit,
    pipelineIndex,
    withIdentifiers(pipeline.config, PIPELINE_ENTRY.destinations, [
      ...readEntryIds(pipeline.config, PIPELINE_ENTRY.destinations),
      destinationId,
    ]),
    telemetry
  );
};

/** Drops a processing node's line. The node stays, unconnected, until it is reconnected or emptied. */
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
    withIdentifiers(
      config,
      PIPELINE_ENTRY.destinations,
      readEntryIds(config, PIPELINE_ENTRY.destinations).filter((id) => id !== destinationId)
    )
  );
};

/**
 * A source joins a pipeline's `sources` when the pipeline is not a delegation
 * target (the transpiler refuses routing to a source pipeline), its wiring is
 * not telemetry-scoped, and the source's records do not already reach it or
 * the destinations it feeds. A routing node also has to carry a signal the
 * source sends. A processing node does not: it carries whatever its sources
 * send and its destinations accept, and the transpiler ignores a source's
 * other signals, so a line can come back in any order after it was unhooked.
 */
const canConnectSourceToPipeline = (unit: Unit, sourceId: string, pipelineId: string): boolean => {
  const pipeline = findPipeline(unit, pipelineId);
  if (
    !pipeline ||
    hasScopedWiring(pipeline.config) ||
    delegatedPipelineIds(unit.unit.pipelines).has(pipelineId) ||
    readEntryIds(pipeline.config, PIPELINE_ENTRY.sources).includes(sourceId)
  ) {
    return false;
  }
  const source = unit.unit.sources.find(({ id }) => id === sourceId);
  if (
    source &&
    !pipelineHasProcessors(pipeline.config) &&
    !sharesSignal(source.supported_telemetry, pipeline.supported_telemetry)
  ) {
    return false;
  }
  const graph = buildUnitGraph(unit);
  const reachedFrom = reachabilityOf(graph);
  const fromSource = new Set(
    reachedFrom(sourceOrigin(sourceId)).map(({ destinationId }) => destinationId)
  );
  return reachedFrom(pipelineEntryEndpoint(pipeline)).every(
    ({ destinationId }) => !fromSource.has(destinationId)
  );
};

const connectSourceToPipeline = (unit: Unit, sourceId: string, pipelineId: string): Unit => {
  if (!canConnectSourceToPipeline(unit, sourceId, pipelineId)) {
    return unit;
  }
  const pipelineIndex = findPipelineIndex(unit, pipelineId);
  const pipeline = unit.unit.pipelines[pipelineIndex];
  const source = unit.unit.sources.find(({ id }) => id === sourceId);
  // The pipeline widens to the new source; `fitSignals` keeps what its
  // destinations accept, and publishing narrows a routing pipeline. A processor
  // that does not carry a signal is skipped for it by the transpiler.
  const telemetry = source
    ? unionSignals(pipeline.supported_telemetry, source.supported_telemetry)
    : pipeline.supported_telemetry;
  return replacePipelineConfig(
    unit,
    pipelineIndex,
    withIdentifiers(pipeline.config, PIPELINE_ENTRY.sources, [
      ...readEntryIds(pipeline.config, PIPELINE_ENTRY.sources),
      sourceId,
    ]),
    telemetry
  );
};

/** Removes a source from a pipeline's `sources`. The pipeline's nodes stay; a bare pipeline left without sources goes. */
const disconnectSourceFromPipeline = (unit: Unit, sourceId: string, pipelineId: string): Unit => {
  const pipelineIndex = findPipelineIndex(unit, pipelineId);
  const pipeline = unit.unit.pipelines[pipelineIndex];
  if (!pipeline || !readEntryIds(pipeline.config, PIPELINE_ENTRY.sources).includes(sourceId)) {
    return unit;
  }
  const remaining = readEntryIds(pipeline.config, PIPELINE_ENTRY.sources).filter(
    (id) => id !== sourceId
  );
  if (
    remaining.length === 0 &&
    !pipelineHasProcessors(pipeline.config) &&
    !pipelineUsesRoutes(pipeline.config)
  ) {
    return replacePipelines(
      unit,
      unit.unit.pipelines.filter((candidate) => candidate.id !== pipelineId)
    );
  }
  return replacePipelineConfig(
    unit,
    pipelineIndex,
    withIdentifiers(pipeline.config, PIPELINE_ENTRY.sources, remaining)
  );
};

const isSameTarget = (left: UnitLineTarget, right: UnitLineTarget): boolean =>
  left.kind === right.kind && left.id === right.id;

/** Whether records leaving `fromPipelineId` can reach `toPipelineId` through routes. */
const pipelineReaches = (unit: Unit, fromPipelineId: string, toPipelineId: string): boolean =>
  delegatedFrom(unit.unit.pipelines, [fromPipelineId]).has(toPipelineId);

/** Targets a rule forwards to, or undefined when the rule does not exist. */
const readRuleTargets = (
  pipeline: UnitPipeline,
  ruleIndex: number
): UnitLineTarget[] | undefined => {
  if (!pipelineUsesRoutes(pipeline.config)) {
    // A delegated child with a plain `destinations` list is drawn as a single rule.
    return ruleIndex === 0
      ? readEntryIds(pipeline.config, PIPELINE_ENTRY.destinations).map((id) => ({
          kind: LINE_TARGET_KIND.destination,
          id,
        }))
      : undefined;
  }
  const route = readRoutes(pipeline.config)[ruleIndex];
  if (!route) {
    return undefined;
  }
  return routeTargets(route);
};

const routeWithTargets = (rule: RouteRule, kind: LineTargetKind, ids: string[]): RouteRule => {
  const rest = isDelegatingRoute(rule) ? omit(rule, 'pipelines') : omit(rule, 'destinations');
  return kind === LINE_TARGET_KIND.destination
    ? { ...rest, destinations: ids }
    : { ...rest, pipelines: ids };
};

/**
 * Pipeline config with one rule's targets replaced. A rule left with no targets
 * stays in place, keeping its condition, so it can be reconnected, and
 * `getUnconnectedPipelines` reports it as `noRuleTarget`. Undefined when the targets cannot
 * be stored: a rule lists either destinations or pipelines, a plain
 * `destinations` list only holds destinations, and telemetry-scoped wiring is
 * left as it is.
 */
const withRuleTargets = (
  pipeline: UnitPipeline,
  ruleIndex: number,
  targets: readonly UnitLineTarget[]
): PipelineConfig | undefined => {
  const kinds = new Set(targets.map(({ kind }) => kind));
  if (kinds.size > 1 || hasScopedWiring(pipeline.config)) {
    return undefined;
  }
  const ids = targets.map(({ id }) => id);
  if (!pipelineUsesRoutes(pipeline.config)) {
    const kind = targets[0]?.kind ?? LINE_TARGET_KIND.destination;
    return kind === LINE_TARGET_KIND.destination
      ? withIdentifiers(pipeline.config, PIPELINE_ENTRY.destinations, ids)
      : undefined;
  }
  if (readRoutes(pipeline.config)[ruleIndex] === undefined) {
    return undefined;
  }
  return mapRouteAt(pipeline, ruleIndex, (route) => {
    const currentKind = isDelegatingRoute(route)
      ? LINE_TARGET_KIND.pipeline
      : LINE_TARGET_KIND.destination;
    return routeWithTargets(route, targets[0]?.kind ?? currentKind, ids);
  }).config;
};

/**
 * Signals a rule line to the target would carry, or none when it cannot be
 * drawn: a delegation to a source pipeline, a delegation that would loop, or a
 * target that shares no signal with what the rule carries.
 */
const routeFit = (
  unit: Unit,
  pipeline: UnitPipeline,
  ruleIndex: number,
  { kind, id }: UnitLineTarget
): UnitSignal[] => {
  const signals = ruleSignals(unit, pipeline, ruleIndex);
  if (kind === LINE_TARGET_KIND.pipeline) {
    const target = findPipeline(unit, id);
    return target !== undefined &&
      !pipelineHasSources(target.config) &&
      !pipelineReaches(unit, id, pipeline.id)
      ? intersectSignals(signals, target.supported_telemetry)
      : [];
  }
  const destination = unit.unit.destinations?.find((item) => item.id === id);
  return destination ? intersectSignals(signals, destination.supported_telemetry) : signals;
};

/**
 * Writes new targets for one rule, or returns `unit` unchanged when they do not
 * fit. A routed child pipeline keeps its last destination, since dropping the
 * pipeline would leave its parent route pointing nowhere. The pipeline widens
 * to the signals a new line carries, which publishing narrows again.
 */
const writeRuleTargets = (
  unit: Unit,
  { pipelineId, ruleIndex }: RouteRuleRef,
  targets: readonly UnitLineTarget[],
  carried: readonly UnitSignal[] = []
): Unit => {
  const pipelineIndex = findPipelineIndex(unit, pipelineId);
  const pipeline = unit.unit.pipelines[pipelineIndex];
  const config = pipeline ? withRuleTargets(pipeline, ruleIndex, targets) : undefined;
  if (
    !config ||
    (!pipelineForwards(config) && delegatedPipelineIds(unit.unit.pipelines).has(pipelineId))
  ) {
    return unit;
  }
  return writePipeline(
    unit,
    pipelineIndex,
    config,
    unionSignals(pipeline.supported_telemetry, carried)
  );
};

/** A rule's pipeline and current targets, or undefined when either does not exist. */
const findRuleTargets = (
  unit: Unit,
  { pipelineId, ruleIndex }: RouteRuleRef
): { pipeline: UnitPipeline; targets: UnitLineTarget[] } | undefined => {
  const pipeline = findPipeline(unit, pipelineId);
  const targets = pipeline ? readRuleTargets(pipeline, ruleIndex) : undefined;
  return pipeline && targets ? { pipeline, targets } : undefined;
};

/** Adds a target to one routing rule. */
const connectRouteToTarget = (unit: Unit, rule: RouteRuleRef, target: UnitLineTarget): Unit => {
  const found = findRuleTargets(unit, rule);
  if (!found || found.targets.some((item) => isSameTarget(item, target))) {
    return unit;
  }
  const { pipeline, targets } = found;
  const carried = routeFit(unit, pipeline, rule.ruleIndex, target);
  if (carried.length === 0) {
    return unit;
  }
  return writeRuleTargets(unit, rule, [...targets, target], carried);
};

/** Drops one target from a routing rule. A rule left with no targets stays, unconnected, and so does a delegated child. */
const disconnectRouteFromTarget = (
  unit: Unit,
  rule: RouteRuleRef,
  target: UnitLineTarget
): Unit => {
  const targets = findRuleTargets(unit, rule)?.targets;
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
 * Moves a routing rule's line onto another rule or target. Within one rule the
 * target is swapped in place, so a single-target rule can switch between a
 * destination and a child pipeline.
 */
const moveRouteConnection = (
  unit: Unit,
  previousRule: RouteRuleRef,
  previousTarget: UnitLineTarget,
  rule: RouteRuleRef,
  target: UnitLineTarget
): Unit => {
  if (!isSameRule(previousRule, rule)) {
    const connected = connectRouteToTarget(unit, rule, target);
    // Connect first: adding never removes a rule, so both rule indexes stay valid.
    return connected === unit
      ? unit
      : disconnectRouteFromTarget(connected, previousRule, previousTarget);
  }
  const found = findRuleTargets(unit, rule);
  if (
    !found ||
    !found.targets.some((item) => isSameTarget(item, previousTarget)) ||
    found.targets.some((item) => isSameTarget(item, target))
  ) {
    return unit;
  }
  const { pipeline, targets } = found;
  const carried = routeFit(unit, pipeline, rule.ruleIndex, target);
  if (carried.length === 0) {
    return unit;
  }
  return writeRuleTargets(
    unit,
    rule,
    targets.map((item) => (isSameTarget(item, previousTarget) ? target : item)),
    carried
  );
};

/** A route's processing node draws the lines of its rule, so it stands for that rule. */
const lineOrigin = (origin: UnitLineOrigin): UnitLineOrigin =>
  origin.kind === GRAPH_ENDPOINT_KIND.processing && origin.ref.kind === PROCESSING_SLOT_KIND.route
    ? {
        kind: GRAPH_ENDPOINT_KIND.rule,
        rule: { pipelineId: origin.ref.pipelineId, ruleIndex: origin.ref.routeIndex },
      }
    : origin;

/** Draws a line from `origin` to `target`, or returns `unit` unchanged when it cannot be drawn. */
export const connectLine = (unit: Unit, origin: UnitLineOrigin, target: UnitLineTarget): Unit => {
  const from = lineOrigin(origin);
  switch (from.kind) {
    case GRAPH_ENDPOINT_KIND.source:
      return target.kind === LINE_TARGET_KIND.destination
        ? connectSourceToDestination(unit, from.id, target.id)
        : connectSourceToPipeline(unit, from.id, target.id);
    case GRAPH_ENDPOINT_KIND.processing:
      return target.kind === LINE_TARGET_KIND.destination
        ? connectProcessingToDestination(unit, from.ref, target.id)
        : unit;
    case GRAPH_ENDPOINT_KIND.rule:
      return connectRouteToTarget(unit, from.rule, target);
  }
};

export const canConnectLine = (
  unit: Unit,
  origin: UnitLineOrigin,
  target: UnitLineTarget
): boolean => connectLine(unit, origin, target) !== unit;

/**
 * Removes one drawn line. A source pipeline left forwarding nowhere is dropped;
 * processing nodes, routing nodes and delegated children stay, unconnected,
 * until they are reconnected or removed.
 */
export const disconnectLine = (
  unit: Unit,
  origin: UnitLineOrigin,
  target: UnitLineTarget
): Unit => {
  const from = lineOrigin(origin);
  switch (from.kind) {
    case GRAPH_ENDPOINT_KIND.source:
      return target.kind === LINE_TARGET_KIND.destination
        ? pruneUnit(unit, disconnectSourceFromDestination(unit, from.id, target.id))
        : disconnectSourceFromPipeline(unit, from.id, target.id);
    case GRAPH_ENDPOINT_KIND.processing:
      return target.kind === LINE_TARGET_KIND.destination
        ? disconnectProcessingFromDestination(unit, from.ref, target.id)
        : unit;
    case GRAPH_ENDPOINT_KIND.rule:
      return disconnectRouteFromTarget(unit, from.rule, target);
  }
};

export interface UnitLineMove {
  previousOrigin: UnitLineOrigin;
  previousTarget: UnitLineTarget;
  origin: UnitLineOrigin;
  target: UnitLineTarget;
}

/** Whether the move puts the line back where it started. */
const isSameLine = ({ previousOrigin, previousTarget, origin, target }: UnitLineMove): boolean =>
  isEqual(lineOrigin(previousOrigin), lineOrigin(origin)) && isEqual(previousTarget, target);

/**
 * Moves an existing line onto another start or end handle, judged with the
 * line itself released. Returns `unit` unchanged when the move is not allowed.
 */
export const moveLine = (unit: Unit, move: UnitLineMove): Unit => {
  if (isSameLine(move)) {
    return unit;
  }
  const previousOrigin = lineOrigin(move.previousOrigin);
  const origin = lineOrigin(move.origin);
  if (
    previousOrigin.kind === GRAPH_ENDPOINT_KIND.rule &&
    origin.kind === GRAPH_ENDPOINT_KIND.rule
  ) {
    return moveRouteConnection(
      unit,
      previousOrigin.rule,
      move.previousTarget,
      origin.rule,
      move.target
    );
  }
  const released = disconnectLine(unit, previousOrigin, move.previousTarget);
  if (released === unit) {
    return unit;
  }
  const connected = connectLine(released, origin, move.target);
  return connected === released ? unit : connected;
};

/** Whether a moved line can be dropped there. Dropping it back where it started is allowed. */
export const canMoveLine = (unit: Unit, move: UnitLineMove): boolean =>
  isSameLine(move) || moveLine(unit, move) !== unit;

export const UNCONNECTED_PIPELINE_REASON = {
  noDestination: 'noDestination',
  noSource: 'noSource',
  /** A routing rule with no destination or pipeline, which the unit schema rejects. */
  noRuleTarget: 'noRuleTarget',
} as const;
export type UnconnectedPipelineReason =
  (typeof UNCONNECTED_PIPELINE_REASON)[keyof typeof UNCONNECTED_PIPELINE_REASON];

interface UnconnectedPipeline {
  pipeline: UnitPipeline;
  reason: UnconnectedPipelineReason;
}

const hasUnconnectedRule = (config: PipelineConfig): boolean =>
  readRoutes(config).some((route) => routeTargets(route).length === 0);

/**
 * Pipelines the distributor would reject: ones that forward nowhere, ones
 * no source feeds and no route delegates to, and ones with a rule left
 * without a target.
 */
export const getUnconnectedPipelines = (unit: Unit): UnconnectedPipeline[] => {
  const delegated = delegatedPipelineIds(unit.unit.pipelines);
  return unit.unit.pipelines.flatMap((pipeline): UnconnectedPipeline[] => {
    if (!pipelineForwards(pipeline.config)) {
      return [{ pipeline, reason: UNCONNECTED_PIPELINE_REASON.noDestination }];
    }
    if (!pipelineHasSources(pipeline.config) && !delegated.has(pipeline.id)) {
      return [{ pipeline, reason: UNCONNECTED_PIPELINE_REASON.noSource }];
    }
    if (hasUnconnectedRule(pipeline.config)) {
      return [{ pipeline, reason: UNCONNECTED_PIPELINE_REASON.noRuleTarget }];
    }
    return [];
  });
};

/**
 * Keeps the routes `keep` accepts, entry by entry so each `routes` entry keeps
 * its own selector. An entry left empty goes. Returns the same pipeline when
 * nothing changes.
 */
const keepRoutes = (
  pipeline: UnitPipeline,
  keep: (route: RouteRule) => RouteRule[]
): UnitPipeline => {
  const config = pipeline.config.flatMap((entry): PipelineConfigEntry[] => {
    if (entry.name !== PIPELINE_ENTRY.routes) {
      return [entry];
    }
    const value = entry.value.flatMap(keep);
    if (value.length === 0) {
      return [];
    }
    return [isEqual(value, entry.value) ? entry : { ...entry, value }];
  });
  return isEqual(config, pipeline.config) ? pipeline : { ...pipeline, config };
};

export interface UnreachableScope {
  pipeline: UnitPipeline;
  /** Signals the scoped wiring selects that no longer reach the pipeline. */
  telemetry: UnitSignal[];
}

/** Published signals per pipeline id. */
const publishedSignalsById = (unit: Unit): Map<string, readonly UnitSignal[]> =>
  new Map(
    withPublishedTelemetry(unit).unit.pipelines.map(({ id, supported_telemetry: signals }) => [
      id,
      signals,
    ])
  );

const reachesAny = (
  telemetry: readonly UnitSignal[] | undefined,
  published: readonly UnitSignal[]
): boolean => !telemetry || intersectSignals(telemetry, published).length > 0;

/**
 * Telemetry-scoped rules and config entries whose signals the pipeline no
 * longer carries once published, typically because the source sending them
 * was unhooked. The transpiler rejects them (`E012_TELEMETRY_SCOPE_MISMATCH`)
 * although the map still draws the rule as connected.
 */
export const getUnreachableScopes = (unit: Unit): UnreachableScope[] => {
  const published = publishedSignalsById(unit);
  return unit.unit.pipelines.flatMap((pipeline): UnreachableScope[] => {
    const signals = published.get(pipeline.id) ?? pipeline.supported_telemetry;
    const unreachable = (telemetry: readonly UnitSignal[] | undefined): UnitSignal[] =>
      reachesAny(telemetry, signals) ? [] : [...(telemetry ?? [])];
    const telemetry = new Set(
      pipeline.config.flatMap((entry) => [
        ...unreachable(entry.telemetry),
        ...(entry.name === PIPELINE_ENTRY.routes
          ? entry.value.flatMap((route) => unreachable(route.telemetry))
          : []),
      ])
    );
    return telemetry.size > 0 ? [{ pipeline, telemetry: orderSignals(telemetry) }] : [];
  });
};

/** Drops the scoped rules and entries `getUnreachableScopes` reports, entry by entry. */
const withoutUnreachableScopes = (unit: Unit, pipelines: UnitPipeline[]): UnitPipeline[] => {
  const published = publishedSignalsById(replacePipelines(unit, pipelines));
  return pipelines.map((pipeline) => {
    const signals = published.get(pipeline.id) ?? pipeline.supported_telemetry;
    const config = pipeline.config.flatMap((entry): PipelineConfigEntry[] => {
      if (!reachesAny(entry.telemetry, signals)) {
        return [];
      }
      if (entry.name !== PIPELINE_ENTRY.routes) {
        return [entry];
      }
      const value = entry.value.filter((route) => reachesAny(route.telemetry, signals));
      if (value.length === 0) {
        return [];
      }
      return [value.length === entry.value.length ? entry : { ...entry, value }];
    });
    return isEqual(config, pipeline.config) ? pipeline : { ...pipeline, config };
  });
};

export interface UnfedDestination {
  pipeline: UnitPipeline;
  destinationId: string;
}

/**
 * Walks every destination line of a pipeline with the signals that line
 * carries once published: the pipeline's published signals, narrowed by the
 * selectors of its entry and route. `keep` decides whether the line stays.
 */
const keepDestinationLines = (
  pipeline: UnitPipeline,
  published: readonly UnitSignal[],
  keep: (destinationId: string, carried: UnitSignal[]) => boolean
): UnitPipeline => {
  const config = pipeline.config.flatMap((entry): PipelineConfigEntry[] => {
    if (entry.name === PIPELINE_ENTRY.destinations) {
      const carried = intersectSignals(published, entry.telemetry);
      const value = entry.value.filter((id) => keep(id, carried));
      if (value.length === 0) {
        return [];
      }
      return [value.length === entry.value.length ? entry : { ...entry, value }];
    }
    if (entry.name !== PIPELINE_ENTRY.routes) {
      return [entry];
    }
    const value = entry.value.map((route) => {
      if (isDelegatingRoute(route)) {
        return route;
      }
      const carried = intersectSignals(
        published,
        narrowSelectors(entry.telemetry, route.telemetry)
      );
      const destinations = route.destinations.filter((id) => keep(id, carried));
      return destinations.length === route.destinations.length ? route : { ...route, destinations };
    });
    return [isEqual(value, entry.value) ? entry : { ...entry, value }];
  });
  return isEqual(config, pipeline.config) ? pipeline : { ...pipeline, config };
};

/**
 * Destination lines that carry nothing once published: the destination
 * accepts none of the signals reaching it, typically because the source
 * sending them was unhooked while the destination stayed. The canvas lets the
 * line be drawn, so a node can be rewired in any order; the transpiler rejects
 * it (`E040_ROUTE_NO_SHARED_SIGNAL`). A line whose selector itself carries
 * nothing is left to `getUnreachableScopes`.
 */
export const getUnfedDestinations = (unit: Unit): UnfedDestination[] => {
  const published = publishedSignalsById(unit);
  const unfed: UnfedDestination[] = [];
  for (const pipeline of unit.unit.pipelines) {
    keepDestinationLines(
      pipeline,
      published.get(pipeline.id) ?? pipeline.supported_telemetry,
      (destinationId, carried) => {
        const destination = unit.unit.destinations.find(({ id }) => id === destinationId);
        if (
          destination &&
          carried.length > 0 &&
          !sharesSignal(destination.supported_telemetry, carried)
        ) {
          unfed.push({ pipeline, destinationId });
        }
        return true;
      }
    );
  }
  return unfed;
};

/** Drops the destination lines `getUnfedDestinations` reports. */
const withoutUnfedDestinations = (unit: Unit, pipelines: UnitPipeline[]): UnitPipeline[] => {
  const published = publishedSignalsById(replacePipelines(unit, pipelines));
  return pipelines.map((pipeline) =>
    keepDestinationLines(
      pipeline,
      published.get(pipeline.id) ?? pipeline.supported_telemetry,
      (destinationId, carried) => {
        const destination = unit.unit.destinations.find(({ id }) => id === destinationId);
        return (
          !destination ||
          carried.length === 0 ||
          sharesSignal(destination.supported_telemetry, carried)
        );
      }
    )
  );
};

/**
 * The unit without the wiring the distributor would reject: destination lines
 * that carry nothing, rules left without a target, scoped wiring whose signals
 * no longer reach it, then every pipeline `getUnconnectedPipelines` reports,
 * until none is left. The canvas Save refuses such a unit; a component save
 * persists the staged unit while lines are unhooked, so the published copy is
 * cleaned up here. A connected unit comes back as it is.
 */
export const withoutUnconnectedWiring = (unit: Unit): Unit => {
  let pipelines = withoutUnreachableScopes(
    unit,
    withoutUnfedDestinations(unit, unit.unit.pipelines).map((pipeline) =>
      keepRoutes(pipeline, (route) => (routeTargets(route).length > 0 ? [route] : []))
    )
  );
  for (;;) {
    const unconnected = new Set(
      getUnconnectedPipelines(replacePipelines(unit, pipelines)).map(({ pipeline }) => pipeline.id)
    );
    if (unconnected.size === 0) {
      break;
    }
    const remaining = pipelines.filter(({ id }) => !unconnected.has(id));
    const remainingIds = new Set(remaining.map(({ id }) => id));
    pipelines = remaining.map((pipeline) =>
      keepRoutes(pipeline, (route) => {
        if (!isDelegatingRoute(route)) {
          return [route];
        }
        const delegated = route.pipelines.filter((id) => remainingIds.has(id));
        return delegated.length > 0 ? [{ ...route, pipelines: delegated }] : [];
      })
    );
  }
  return isEqual(pipelines, unit.unit.pipelines) ? unit : replacePipelines(unit, pipelines);
};

const removeComponentReferences = (unit: Unit, componentId: string): Unit =>
  replacePipelines(
    unit,
    unit.unit.pipelines.flatMap((pipeline) => {
      const hadSources = pipelineHasSources(pipeline.config);
      const forwarded = pipelineForwards(pipeline.config);
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
      if (config.length === 0 || (forwarded && !pipelineForwards(config))) {
        return [];
      }
      if (hadSources && !pipelineHasSources(config)) {
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
