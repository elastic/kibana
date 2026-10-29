/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Unit } from './unit_repository';
import {
  PIPELINE_ENTRY,
  hasScopedWiring,
  intersectSignals,
  isDelegatingRoute,
  readEntryIds,
  readRoutes,
  type UnitPipeline,
  type UnitSignal,
} from './unit_pipeline';

export const PROCESSING_SLOT_KIND = {
  pipeline: 'pipeline',
  route: 'route',
} as const;
export type ProcessingSlotKind = (typeof PROCESSING_SLOT_KIND)[keyof typeof PROCESSING_SLOT_KIND];

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

export interface UnitEdgeSlotTarget {
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
export interface UnitEdgeLineTarget {
  line: UnitLine;
}

export type UnitEdgeProcessingTarget = UnitEdgeSlotTarget | UnitEdgeLineTarget;

export const GRAPH_ENDPOINT_KIND = {
  source: 'source',
  processing: 'processing',
  destination: 'destination',
} as const;
export type GraphEndpointKind = (typeof GRAPH_ENDPOINT_KIND)[keyof typeof GRAPH_ENDPOINT_KIND];

export type UnitGraphEndpoint =
  | { kind: typeof GRAPH_ENDPOINT_KIND.source; id: string }
  | { kind: typeof GRAPH_ENDPOINT_KIND.processing; ref: ProcessingNodeRef }
  | { kind: typeof GRAPH_ENDPOINT_KIND.destination; id: string };

export interface UnitGraphProcessingNode {
  ref: ProcessingNodeRef;
  processorIds: string[];
  telemetry: UnitSignal[];
  name?: string;
  editable: boolean;
}

export const EDGE_FORWARDING = {
  direct: 'direct',
  route: 'route',
} as const;
export type UnitEdgeForwarding = (typeof EDGE_FORWARDING)[keyof typeof EDGE_FORWARDING];

export interface UnitGraphEdge {
  source: UnitGraphEndpoint;
  target: UnitGraphEndpoint;
  forwarding: UnitEdgeForwarding;
  /** Unset when the line leads to a read-only node. */
  processingTarget?: UnitEdgeProcessingTarget;
}

export interface UnitGraph {
  processingNodes: UnitGraphProcessingNode[];
  edges: UnitGraphEdge[];
}

export const processingNodeId = (ref: ProcessingNodeRef): string =>
  ref.kind === PROCESSING_SLOT_KIND.pipeline
    ? `processing-pipeline-${ref.pipelineId}`
    : `processing-route-${ref.pipelineId}-${ref.routeIndex}`;

export const endpointKey = (endpoint: UnitGraphEndpoint): string =>
  endpoint.kind === GRAPH_ENDPOINT_KIND.processing
    ? `${endpoint.kind}:${processingNodeId(endpoint.ref)}`
    : `${endpoint.kind}:${endpoint.id}`;

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

interface Upstream {
  endpoint: UnitGraphEndpoint;
  forwarding: UnitEdgeForwarding;
  /** Slots without processors this path has crossed since `endpoint`, in flow order. */
  emptySlots: ProcessingNodeRef[];
}

interface DrawnEdge {
  source: UnitGraphEndpoint;
  target: UnitGraphEndpoint;
  forwarding: UnitEdgeForwarding;
  /** Empty slots every path drawn as this line crosses. */
  emptySlots: ProcessingNodeRef[];
}

/** Route slots only cover their branch, so they are preferred over pipeline slots. */
const pickSlot = (slots: readonly ProcessingNodeRef[]): ProcessingNodeRef | undefined =>
  slots.find(({ kind }) => kind === PROCESSING_SLOT_KIND.route) ?? slots[0];

/**
 * Walks the unit from every source through its pipelines, routes and
 * delegations. Without `configuredSourceIds` / `configuredDestinationIds`,
 * every referenced source and destination is included.
 */
export const buildUnitGraph = (
  unit: Unit,
  configuredSourceIds?: ReadonlySet<string>,
  configuredDestinationIds?: ReadonlySet<string>
): UnitGraph => {
  const isShownSource = (id: string) => configuredSourceIds?.has(id) ?? true;
  const isShownDestination = (id: string) => configuredDestinationIds?.has(id) ?? true;
  const pipelinesById = new Map(unit.unit.pipelines.map((pipeline) => [pipeline.id, pipeline]));
  const nodes = new Map<string, UnitGraphProcessingNode>();
  const edges = new Map<string, DrawnEdge>();
  /** Which drawn lines each empty slot is crossed by. */
  const slotLines = new Map<string, Set<string>>();

  const addNode = (node: UnitGraphProcessingNode): UnitGraphEndpoint => {
    const id = processingNodeId(node.ref);
    if (!nodes.has(id)) {
      nodes.set(id, node);
    }
    return { kind: GRAPH_ENDPOINT_KIND.processing, ref: node.ref };
  };

  const connect = (upstream: readonly Upstream[], target: UnitGraphEndpoint) => {
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
      edges.set(key, { source: endpoint, target, forwarding, emptySlots: [...emptySlots] });
    }
  };

  const walk = (pipeline: UnitPipeline, upstream: Upstream[], stack: ReadonlySet<string>) => {
    if (upstream.length === 0 || stack.has(pipeline.id)) {
      return;
    }
    const nextStack = new Set(stack).add(pipeline.id);
    const pipelineRef: ProcessingNodeRef = {
      kind: PROCESSING_SLOT_KIND.pipeline,
      pipelineId: pipeline.id,
    };
    const processorIds = readEntryIds(pipeline.config, PIPELINE_ENTRY.processors);

    let outputs: Upstream[];
    if (processorIds.length > 0) {
      const endpoint = addNode({
        ref: pipelineRef,
        processorIds,
        telemetry: [...pipeline.supported_telemetry],
        name: pipeline.name,
        editable: isPipelineSlotEditable(pipeline),
      });
      connect(upstream, endpoint);
      outputs = [{ endpoint, forwarding: upstream[0].forwarding, emptySlots: [] }];
    } else {
      outputs = upstream.map((entry) => ({
        ...entry,
        emptySlots: [...entry.emptySlots, pipelineRef],
      }));
    }

    for (const id of readEntryIds(pipeline.config, PIPELINE_ENTRY.destinations)) {
      if (isShownDestination(id)) {
        connect(outputs, { kind: GRAPH_ENDPOINT_KIND.destination, id });
      }
    }

    readRoutes(pipeline.config).forEach((route, index) => {
      const routeRef: ProcessingNodeRef = {
        kind: PROCESSING_SLOT_KIND.route,
        pipelineId: pipeline.id,
        routeIndex: index,
      };
      let routeUpstream: Upstream[];
      if (route.processors && route.processors.length > 0) {
        const endpoint = addNode({
          ref: routeRef,
          processorIds: [...route.processors],
          telemetry: intersectSignals(pipeline.supported_telemetry, route.telemetry),
          editable: true,
        });
        connect(
          outputs.map((entry) => ({ ...entry, forwarding: EDGE_FORWARDING.route })),
          endpoint
        );
        routeUpstream = [{ endpoint, forwarding: EDGE_FORWARDING.route, emptySlots: [] }];
      } else {
        routeUpstream = outputs.map((entry) => ({
          endpoint: entry.endpoint,
          forwarding: EDGE_FORWARDING.route,
          emptySlots: [...entry.emptySlots, routeRef],
        }));
      }
      if (isDelegatingRoute(route)) {
        for (const childId of route.pipelines) {
          const child = pipelinesById.get(childId);
          if (child) {
            walk(child, routeUpstream, nextStack);
          }
        }
        return;
      }
      for (const id of route.destinations) {
        if (isShownDestination(id)) {
          connect(routeUpstream, { kind: GRAPH_ENDPOINT_KIND.destination, id });
        }
      }
    });
  };

  for (const pipeline of unit.unit.pipelines) {
    const sources = readEntryIds(pipeline.config, PIPELINE_ENTRY.sources).filter(isShownSource);
    walk(
      pipeline,
      sources.map((id) => ({
        endpoint: { kind: GRAPH_ENDPOINT_KIND.source, id },
        forwarding: EDGE_FORWARDING.direct,
        emptySlots: [],
      })),
      new Set()
    );
  }

  const nodeTarget = (
    ref: ProcessingNodeRef,
    position: SlotPosition
  ): UnitEdgeSlotTarget | undefined =>
    nodes.get(processingNodeId(ref))?.editable ? { ref, position, exists: true } : undefined;

  const canMoveLineOff = (slot: ProcessingNodeRef): boolean => {
    const pipeline = pipelinesById.get(slot.pipelineId);
    return pipeline !== undefined && !hasScopedWiring(pipeline.config);
  };

  // A line adds to the node it leads into; otherwise it creates the most specific
  // empty slot it crosses, preferring one no other line shares. A source line
  // whose only slot is shared gets a pipeline of its own instead, unless that
  // pipeline's wiring is telemetry-scoped. Otherwise the line adds to the node it
  // leaves.
  const resolveProcessingTarget = ({
    source,
    target,
    emptySlots,
  }: DrawnEdge): UnitEdgeProcessingTarget | undefined => {
    if (target.kind === GRAPH_ENDPOINT_KIND.processing) {
      return nodeTarget(target.ref, SLOT_POSITION.start);
    }
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
    const slot = pickSlot(exclusive) ?? pickSlot(candidates);
    if (slot) {
      return { ref: slot, position: SLOT_POSITION.end, exists: false };
    }
    return source.kind === GRAPH_ENDPOINT_KIND.processing
      ? nodeTarget(source.ref, SLOT_POSITION.end)
      : undefined;
  };

  return {
    processingNodes: [...nodes.values()],
    edges: [...edges.values()].map((edge) => {
      const processingTarget = resolveProcessingTarget(edge);
      return {
        source: edge.source,
        target: edge.target,
        forwarding: edge.forwarding,
        ...(processingTarget ? { processingTarget } : {}),
      };
    }),
  };
};
