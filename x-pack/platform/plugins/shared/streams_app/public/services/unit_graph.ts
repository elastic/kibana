/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Unit } from './unit_repository';
import {
  PIPELINE_ENTRY,
  delegatedPipelineIds,
  hasScopedWiring,
  intersectSignals,
  isDelegatingRoute,
  narrowSelectors,
  pipelineUsesRoutes,
  readEntryIds,
  readRoutes,
  type RouteRule,
  type RouteRuleRef,
  type UnitPipeline,
  type UnitSignal,
} from './unit_pipeline';

export const PROCESSING_SLOT_KIND = {
  pipeline: 'pipeline',
  route: 'route',
} as const;

/**
 * A processor slot. `routeIndex` counts routes across all of the pipeline's
 * `routes` entries, in declaration order.
 */
export type ProcessingNodeRef =
  | { kind: typeof PROCESSING_SLOT_KIND.pipeline; pipelineId: string }
  | { kind: typeof PROCESSING_SLOT_KIND.route; pipelineId: string; routeIndex: number };

export const SLOT_POSITION = {
  start: 'start',
  end: 'end',
} as const;
export type SlotPosition = (typeof SLOT_POSITION)[keyof typeof SLOT_POSITION];

interface UnitEdgeSlotTarget {
  ref: ProcessingNodeRef;
  position: SlotPosition;
  /** False when the slot has no processors yet, so saving creates its node. */
  exists: boolean;
}

export interface UnitLine {
  sourceId: string;
  destinationId: string;
}

/**
 * A line from a source whose only slot is its pipeline's, shared with the
 * pipeline's other lines. Saving its processing moves the line onto a source
 * pipeline of its own first, so the other lines are not processed.
 */
interface UnitEdgeLineTarget {
  line: UnitLine;
}

export type UnitEdgeProcessingTarget = UnitEdgeSlotTarget | UnitEdgeLineTarget;

export const GRAPH_ENDPOINT_KIND = {
  source: 'source',
  processing: 'processing',
  rule: 'rule',
  routing: 'routing',
  destination: 'destination',
} as const;

/**
 * Where a line starts or ends. A `rule` is one output handle of a routing
 * node and only starts lines; a `routing` node only receives them.
 */
export type UnitGraphEndpoint =
  | { kind: typeof GRAPH_ENDPOINT_KIND.source; id: string }
  | { kind: typeof GRAPH_ENDPOINT_KIND.processing; ref: ProcessingNodeRef }
  | { kind: typeof GRAPH_ENDPOINT_KIND.rule; rule: RouteRuleRef }
  | { kind: typeof GRAPH_ENDPOINT_KIND.routing; pipelineId: string }
  | { kind: typeof GRAPH_ENDPOINT_KIND.destination; id: string };

export const LINE_TARGET_KIND = {
  destination: 'destination',
  pipeline: 'pipeline',
} as const;
export type LineTargetKind = (typeof LINE_TARGET_KIND)[keyof typeof LINE_TARGET_KIND];

/** What a drawn line can end at: a destination, or a pipeline's entry node. */
export interface UnitLineTarget {
  kind: LineTargetKind;
  id: string;
}

export interface UnitGraphProcessingNode {
  ref: ProcessingNodeRef;
  processorIds: string[];
  telemetry: UnitSignal[];
  name?: string;
  editable: boolean;
}

/** One output handle of a routing node. It is connected when `targets` is not empty. */
export interface UnitGraphRoutingRule {
  index: number;
  when?: string;
  action?: RouteRule['action'];
  /** Signals the rule carries when narrower than its pipeline's. */
  telemetry?: UnitSignal[];
  targets: UnitLineTarget[];
}

/**
 * A pipeline drawn as a routing node: one with `routes`, or a delegated child
 * with neither processors nor routes, which is `synthetic` and shows its
 * `destinations` as a single unconditional rule so it stays visible.
 */
export interface UnitGraphRoutingNode {
  pipelineId: string;
  name?: string;
  sourceIds: string[];
  synthetic: boolean;
  rules: UnitGraphRoutingRule[];
}

export const EDGE_FORWARDING = {
  direct: 'direct',
  route: 'route',
} as const;
export type UnitEdgeForwarding = (typeof EDGE_FORWARDING)[keyof typeof EDGE_FORWARDING];

const EDGE_REFERENCE_KIND = {
  sources: 'sources',
  destinations: 'destinations',
  routeDestinations: 'routeDestinations',
  routePipelines: 'routePipelines',
} as const;

/** The pipeline list a line is stored in; unset for structural lines between a pipeline's own nodes. */
export type UnitEdgeReference =
  | { kind: typeof EDGE_REFERENCE_KIND.sources; pipelineId: string }
  | { kind: typeof EDGE_REFERENCE_KIND.destinations; pipelineId: string }
  | { kind: typeof EDGE_REFERENCE_KIND.routeDestinations; rule: RouteRuleRef }
  | { kind: typeof EDGE_REFERENCE_KIND.routePipelines; rule: RouteRuleRef };

export interface UnitGraphEdge {
  source: UnitGraphEndpoint;
  target: UnitGraphEndpoint;
  forwarding: UnitEdgeForwarding;
  reference?: UnitEdgeReference;
  /** Whether the line can be moved or unhooked on the map. */
  editable: boolean;
  /** Unset when the line leads to a read-only node. */
  processingTarget?: UnitEdgeProcessingTarget;
}

export interface UnitGraph {
  processingNodes: UnitGraphProcessingNode[];
  routingNodes: UnitGraphRoutingNode[];
  edges: UnitGraphEdge[];
}

export const processingNodeId = (ref: ProcessingNodeRef): string =>
  ref.kind === PROCESSING_SLOT_KIND.pipeline
    ? `processing-pipeline-${ref.pipelineId}`
    : `processing-route-${ref.pipelineId}-${ref.routeIndex}`;

export const endpointKey = (endpoint: UnitGraphEndpoint): string => {
  switch (endpoint.kind) {
    case GRAPH_ENDPOINT_KIND.processing:
      return `${endpoint.kind}:${processingNodeId(endpoint.ref)}`;
    case GRAPH_ENDPOINT_KIND.rule:
      return `${endpoint.kind}:${endpoint.rule.pipelineId}:${endpoint.rule.ruleIndex}`;
    case GRAPH_ENDPOINT_KIND.routing:
      return `${endpoint.kind}:${endpoint.pipelineId}`;
    default:
      return `${endpoint.kind}:${endpoint.id}`;
  }
};

/** Per-telemetry `processors` entries are shown but not edited yet. */
const isPipelineSlotEditable = (pipeline: UnitPipeline): boolean => {
  const entries = pipeline.config.filter((entry) => entry.name === PIPELINE_ENTRY.processors);
  return entries.length <= 1 && entries.every(({ telemetry }) => telemetry === undefined);
};

/** Whether the processing flyout can edit a slot, which must still exist. */
export const isProcessingSlotEditable = (unit: Unit, ref: ProcessingNodeRef): boolean => {
  const pipeline = unit.unit.pipelines.find(({ id }) => id === ref.pipelineId);
  if (!pipeline) {
    return false;
  }
  return ref.kind === PROCESSING_SLOT_KIND.route
    ? readRoutes(pipeline.config)[ref.routeIndex] !== undefined
    : isPipelineSlotEditable(pipeline);
};

const pipelineSlot = (pipelineId: string): ProcessingNodeRef => ({
  kind: PROCESSING_SLOT_KIND.pipeline,
  pipelineId,
});

const routeSlot = ({ pipelineId, ruleIndex }: RouteRuleRef): ProcessingNodeRef => ({
  kind: PROCESSING_SLOT_KIND.route,
  pipelineId,
  routeIndex: ruleIndex,
});

/**
 * The pipeline's routes in declaration order, each with the signals it carries:
 * its own `telemetry` narrowed by the selector of the `routes` entry it sits in.
 */
const readScopedRoutes = (
  config: UnitPipeline['config']
): Array<{ route: RouteRule; telemetry?: UnitSignal[] }> =>
  config.flatMap((entry) =>
    entry.name === PIPELINE_ENTRY.routes
      ? entry.value.map((route) => ({
          route,
          telemetry: narrowSelectors(entry.telemetry, route.telemetry),
        }))
      : []
  );

/** The targets of one routing rule as line targets. */
export const routeTargets = (route: RouteRule): UnitLineTarget[] =>
  isDelegatingRoute(route)
    ? route.pipelines.map((id) => ({ kind: LINE_TARGET_KIND.pipeline, id }))
    : route.destinations.map((id) => ({ kind: LINE_TARGET_KIND.destination, id }));

/** A pipeline is entered through its processing when it has any, else through its routing node. */
export const pipelineEntryEndpoint = (pipeline: UnitPipeline): UnitGraphEndpoint =>
  readEntryIds(pipeline.config, PIPELINE_ENTRY.processors).length > 0
    ? { kind: GRAPH_ENDPOINT_KIND.processing, ref: pipelineSlot(pipeline.id) }
    : { kind: GRAPH_ENDPOINT_KIND.routing, pipelineId: pipeline.id };

const toRoutingRule = (
  index: number,
  targets: UnitLineTarget[],
  route?: RouteRule,
  telemetry?: UnitSignal[]
): UnitGraphRoutingRule => ({
  index,
  ...(route?.when !== undefined ? { when: route.when } : {}),
  ...(route?.action !== undefined ? { action: route.action } : {}),
  ...(telemetry ? { telemetry } : {}),
  targets,
});

/** The processor ids of a slot, in order. A slot that does not exist has none. */
export const getSlotProcessorIds = (unit: Unit, ref: ProcessingNodeRef): string[] => {
  const pipeline = unit.unit.pipelines.find(({ id }) => id === ref.pipelineId);
  if (!pipeline) {
    return [];
  }
  return ref.kind === PROCESSING_SLOT_KIND.route
    ? [...(readRoutes(pipeline.config)[ref.routeIndex]?.processors ?? [])]
    : readEntryIds(pipeline.config, PIPELINE_ENTRY.processors);
};

interface Upstream {
  endpoint: UnitGraphEndpoint;
  forwarding: UnitEdgeForwarding;
  /** Slots without processors this path has crossed since `endpoint`, in flow order. */
  emptySlots: ProcessingNodeRef[];
}

interface DrawnEdge extends Omit<UnitGraphEdge, 'processingTarget'> {
  /** Empty slots every path drawn as this line crosses. */
  emptySlots: ProcessingNodeRef[];
}

interface LineKind {
  reference?: UnitEdgeReference;
  editable: boolean;
}

const STRUCTURAL: LineKind = { editable: false };

/** Route slots only cover their branch, so they are preferred over pipeline slots. */
const pickSlot = (slots: readonly ProcessingNodeRef[]): ProcessingNodeRef | undefined =>
  slots.find(({ kind }) => kind === PROCESSING_SLOT_KIND.route) ?? slots[0];

/**
 * Draws every pipeline of the unit: its sources into its processing or routing
 * node, its rules to their targets, and delegations into the child's entry
 * node. Pipelines nothing feeds are drawn too, unconnected, so they can be
 * reconnected. Without `configuredSourceIds` / `configuredDestinationIds`,
 * every referenced source and destination is included.
 */
export const buildUnitGraph = (
  unit: Unit,
  configuredSourceIds?: ReadonlySet<string>,
  configuredDestinationIds?: ReadonlySet<string>
): UnitGraph => {
  const isShownSource = (id: string): boolean => configuredSourceIds?.has(id) ?? true;
  const isShownDestination = (id: string): boolean => configuredDestinationIds?.has(id) ?? true;
  const { pipelines } = unit.unit;
  const pipelinesById = new Map(pipelines.map((pipeline) => [pipeline.id, pipeline]));
  const delegated = delegatedPipelineIds(pipelines);
  const processingNodes = new Map<string, UnitGraphProcessingNode>();
  const routingNodes: UnitGraphRoutingNode[] = [];
  const edges = new Map<string, DrawnEdge>();
  /** Which drawn lines each empty slot is crossed by. */
  const slotLines = new Map<string, Set<string>>();

  const processorIdsOf = (pipeline: UnitPipeline): string[] =>
    readEntryIds(pipeline.config, PIPELINE_ENTRY.processors);

  const addProcessingNode = (node: UnitGraphProcessingNode): UnitGraphEndpoint => {
    const id = processingNodeId(node.ref);
    if (!processingNodes.has(id)) {
      processingNodes.set(id, node);
    }
    return { kind: GRAPH_ENDPOINT_KIND.processing, ref: node.ref };
  };

  const connect = (
    upstream: readonly Upstream[],
    target: UnitGraphEndpoint,
    { reference, editable }: LineKind
  ) => {
    for (const { endpoint, forwarding, emptySlots } of upstream) {
      const key = `${endpointKey(endpoint)}->${endpointKey(target)}`;
      for (const slot of emptySlots) {
        const slotId = processingNodeId(slot);
        slotLines.set(slotId, (slotLines.get(slotId) ?? new Set()).add(key));
      }
      const existing = edges.get(key);
      if (existing) {
        const crossed = new Set(emptySlots.map(processingNodeId));
        existing.emptySlots = existing.emptySlots.filter((slot) =>
          crossed.has(processingNodeId(slot))
        );
        continue;
      }
      edges.set(key, {
        source: endpoint,
        target,
        forwarding,
        editable,
        emptySlots: [...emptySlots],
        ...(reference ? { reference } : {}),
      });
    }
  };

  const drawRule = (
    pipeline: UnitPipeline,
    rule: RouteRuleRef,
    route: RouteRule | undefined,
    targets: readonly UnitLineTarget[],
    emptySlot: ProcessingNodeRef
  ) => {
    const editable = !hasScopedWiring(pipeline.config);
    const ruleEndpoint: UnitGraphEndpoint = { kind: GRAPH_ENDPOINT_KIND.rule, rule };
    let upstream: Upstream[];
    if (route?.processors && route.processors.length > 0) {
      const endpoint = addProcessingNode({
        ref: routeSlot(rule),
        processorIds: [...route.processors],
        telemetry: intersectSignals(pipeline.supported_telemetry, route.telemetry),
        editable: true,
      });
      connect(
        [{ endpoint: ruleEndpoint, forwarding: EDGE_FORWARDING.route, emptySlots: [] }],
        endpoint,
        STRUCTURAL
      );
      upstream = [{ endpoint, forwarding: EDGE_FORWARDING.route, emptySlots: [] }];
    } else {
      upstream = [
        { endpoint: ruleEndpoint, forwarding: EDGE_FORWARDING.route, emptySlots: [emptySlot] },
      ];
    }
    for (const target of targets) {
      if (target.kind === LINE_TARGET_KIND.destination) {
        if (isShownDestination(target.id)) {
          connect(
            upstream,
            { kind: GRAPH_ENDPOINT_KIND.destination, id: target.id },
            {
              editable,
              reference: route
                ? { kind: EDGE_REFERENCE_KIND.routeDestinations, rule }
                : { kind: EDGE_REFERENCE_KIND.destinations, pipelineId: pipeline.id },
            }
          );
        }
        continue;
      }
      const child = pipelinesById.get(target.id);
      if (child) {
        connect(upstream, pipelineEntryEndpoint(child), {
          editable,
          reference: { kind: EDGE_REFERENCE_KIND.routePipelines, rule },
        });
      }
    }
  };

  for (const pipeline of pipelines) {
    const { config } = pipeline;
    const editable = !hasScopedWiring(config);
    const processorIds = processorIdsOf(pipeline);
    const usesRoutes = pipelineUsesRoutes(config);
    const isSynthetic = !usesRoutes && processorIds.length === 0 && delegated.has(pipeline.id);
    const sourceIds = readEntryIds(config, PIPELINE_ENTRY.sources);
    const sourcesReference: LineKind = {
      editable,
      reference: { kind: EDGE_REFERENCE_KIND.sources, pipelineId: pipeline.id },
    };
    const inbound: Upstream[] = sourceIds.filter(isShownSource).map((id) => ({
      endpoint: { kind: GRAPH_ENDPOINT_KIND.source, id },
      forwarding: EDGE_FORWARDING.direct,
      emptySlots: [],
    }));
    const routingEndpoint: UnitGraphEndpoint = {
      kind: GRAPH_ENDPOINT_KIND.routing,
      pipelineId: pipeline.id,
    };

    let outputs: Upstream[];
    if (processorIds.length > 0) {
      const endpoint = addProcessingNode({
        ref: pipelineSlot(pipeline.id),
        processorIds,
        telemetry: [...pipeline.supported_telemetry],
        name: pipeline.name,
        editable: isPipelineSlotEditable(pipeline),
      });
      connect(inbound, endpoint, sourcesReference);
      outputs = [{ endpoint, forwarding: EDGE_FORWARDING.direct, emptySlots: [] }];
    } else if (usesRoutes || isSynthetic) {
      connect(
        inbound.map((entry) => ({ ...entry, emptySlots: [pipelineSlot(pipeline.id)] })),
        routingEndpoint,
        sourcesReference
      );
      outputs = [];
    } else {
      outputs = inbound.map((entry) => ({
        ...entry,
        emptySlots: [pipelineSlot(pipeline.id)],
      }));
    }

    if (usesRoutes) {
      if (processorIds.length > 0) {
        connect(outputs, routingEndpoint, STRUCTURAL);
      }
      const rules = readScopedRoutes(config).map(
        ({ route, telemetry }, index): UnitGraphRoutingRule => {
          const rule = { pipelineId: pipeline.id, ruleIndex: index };
          const targets = routeTargets(route);
          drawRule(pipeline, rule, { ...route, telemetry }, targets, routeSlot(rule));
          return toRoutingRule(index, targets, route, telemetry);
        }
      );
      routingNodes.push({
        pipelineId: pipeline.id,
        name: pipeline.name,
        sourceIds,
        synthetic: false,
        rules,
      });
      continue;
    }

    const destinationIds = readEntryIds(config, PIPELINE_ENTRY.destinations);
    if (isSynthetic) {
      const rule = { pipelineId: pipeline.id, ruleIndex: 0 };
      const targets = destinationIds.map(
        (id): UnitLineTarget => ({ kind: LINE_TARGET_KIND.destination, id })
      );
      drawRule(pipeline, rule, undefined, targets, pipelineSlot(pipeline.id));
      routingNodes.push({
        pipelineId: pipeline.id,
        name: pipeline.name,
        sourceIds,
        synthetic: true,
        rules: [toRoutingRule(0, targets)],
      });
      continue;
    }

    for (const id of destinationIds) {
      if (isShownDestination(id)) {
        connect(
          outputs,
          { kind: GRAPH_ENDPOINT_KIND.destination, id },
          {
            editable,
            reference: { kind: EDGE_REFERENCE_KIND.destinations, pipelineId: pipeline.id },
          }
        );
      }
    }
  }

  const nodeTarget = (
    ref: ProcessingNodeRef,
    position: SlotPosition
  ): UnitEdgeSlotTarget | undefined =>
    processingNodes.get(processingNodeId(ref))?.editable
      ? { ref, position, exists: true }
      : undefined;

  const canMoveLineOff = (slot: ProcessingNodeRef): boolean => {
    const pipeline = pipelinesById.get(slot.pipelineId);
    return pipeline !== undefined && !hasScopedWiring(pipeline.config);
  };

  // A line creates the most specific empty slot it crosses, preferring one no
  // other line shares; failing that it adds to the node it leads into, then to
  // the node it leaves. A source line whose only slot is shared gets a pipeline
  // of its own instead, unless that pipeline's wiring is telemetry-scoped.
  const resolveProcessingTarget = ({
    source,
    target,
    emptySlots,
  }: DrawnEdge): UnitEdgeProcessingTarget | undefined => {
    const candidates = emptySlots.filter((slot) => isProcessingSlotEditable(unit, slot));
    const exclusive = candidates.filter(
      (slot) => slotLines.get(processingNodeId(slot))?.size === 1
    );
    if (
      exclusive.length === 0 &&
      source.kind === GRAPH_ENDPOINT_KIND.source &&
      target.kind === GRAPH_ENDPOINT_KIND.destination &&
      candidates.length === 1 &&
      candidates[0].kind === PROCESSING_SLOT_KIND.pipeline &&
      emptySlots.length === 1 &&
      canMoveLineOff(candidates[0])
    ) {
      return { line: { sourceId: source.id, destinationId: target.id } };
    }
    // A pipeline slot is shared by every source line into a routing node, so only a lone line creates it.
    const sharedSlotAllowed = !(
      source.kind === GRAPH_ENDPOINT_KIND.source && target.kind === GRAPH_ENDPOINT_KIND.routing
    );
    const slot = pickSlot(exclusive) ?? (sharedSlotAllowed ? pickSlot(candidates) : undefined);
    if (slot) {
      return { ref: slot, position: SLOT_POSITION.end, exists: false };
    }
    if (source.kind === GRAPH_ENDPOINT_KIND.processing) {
      return nodeTarget(source.ref, SLOT_POSITION.end);
    }
    return target.kind === GRAPH_ENDPOINT_KIND.processing
      ? nodeTarget(target.ref, SLOT_POSITION.start)
      : undefined;
  };

  return {
    processingNodes: [...processingNodes.values()],
    routingNodes,
    edges: [...edges.values()].map((edge) => {
      const { source, target, forwarding, reference, editable } = edge;
      const processingTarget = resolveProcessingTarget(edge);
      return {
        source,
        target,
        forwarding,
        editable,
        ...(reference ? { reference } : {}),
        ...(processingTarget ? { processingTarget } : {}),
      };
    }),
  };
};
