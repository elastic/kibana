/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Tone } from '@kbn/adaptive-ui';

/** `graphSchema` rejects a spec beyond these, so adapters trim before building the node. */
const GRAPH_MAX_NODES = 24;
const GRAPH_MAX_EDGES = 48;

interface GraphTopologyNode {
  id: string;
  label?: string;
  tone?: Tone;
  group?: string;
}

interface GraphTopologyEdge {
  source: string;
  target: string;
  label?: string;
  tone?: Tone;
  weight?: number;
}

export interface GraphTopology {
  nodes: GraphTopologyNode[];
  edges: GraphTopologyEdge[];
  /** Nodes and edges dropped to fit the primitive's budget, for an honest caption. */
  omitted: { nodes: number; edges: number };
}

/**
 * Trims a live topology to what the `graph` primitive accepts: unique ids, at
 * most 24 nodes and 48 edges, and no edge naming a node that did not survive.
 * The primitive is chat-card sized by design — a full interactive map belongs in
 * the host's own canvas — so a larger topology is truncated, never rescaled.
 */
export const toGraphTopology = (
  nodes: GraphTopologyNode[],
  edges: GraphTopologyEdge[]
): GraphTopology => {
  const byId = new Map<string, GraphTopologyNode>();
  for (const node of nodes) {
    if (!byId.has(node.id)) {
      byId.set(node.id, node);
    }
  }

  const kept = [...byId.values()].slice(0, GRAPH_MAX_NODES);
  const keptIds = new Set(kept.map(({ id }) => id));
  const connected = edges.filter(
    ({ source, target }) => keptIds.has(source) && keptIds.has(target)
  );

  return {
    nodes: kept,
    edges: connected.slice(0, GRAPH_MAX_EDGES),
    omitted: {
      nodes: byId.size - kept.length,
      edges: edges.length - Math.min(connected.length, GRAPH_MAX_EDGES),
    },
  };
};

/** Sentence naming what {@link toGraphTopology} dropped, or `undefined` when nothing was. */
export const graphOmissionNote = ({ omitted }: GraphTopology): string | undefined => {
  const parts: string[] = [];
  if (omitted.nodes > 0) {
    parts.push(`${omitted.nodes} more node${omitted.nodes === 1 ? '' : 's'}`);
  }
  if (omitted.edges > 0) {
    parts.push(`${omitted.edges} more connection${omitted.edges === 1 ? '' : 's'}`);
  }
  return parts.length === 0 ? undefined : `Diagram truncated: ${parts.join(' and ')} not shown.`;
};

/**
 * Maps a Kibana severity label onto an Adaptive UI {@link Tone}. Mirrors the
 * `low < medium < high < critical` buckets shared by Cases and Security so a
 * severity pill reads the same in chat, Slack, and markdown.
 */
export const severityTone = (severity?: string): Tone => {
  switch (severity?.toLowerCase()) {
    case 'low':
      return 'success';
    case 'medium':
      return 'warning';
    case 'high':
      return 'risk';
    case 'critical':
      return 'danger';
    default:
      return 'neutral';
  }
};

export const titleCase = (value: string): string =>
  value.length === 0 ? value : value.charAt(0).toUpperCase() + value.slice(1);

/**
 * Nightshift event-flyout href. `eventUuid` is the flyout's restore key
 * (`buildNightshiftEventFlyoutShareUrl`); `eventId` is included whenever present.
 */
export const buildNightshiftEventHref = ({
  eventId,
  eventUuid,
}: {
  eventId?: string;
  eventUuid?: string;
}): string | undefined => {
  if (!eventId && !eventUuid) {
    return undefined;
  }
  const params = new URLSearchParams();
  if (eventUuid) {
    params.set('eventUuid', eventUuid);
  }
  if (eventId) {
    params.set('eventId', eventId);
  }
  return `/app/nightshift?${params.toString()}`;
};
