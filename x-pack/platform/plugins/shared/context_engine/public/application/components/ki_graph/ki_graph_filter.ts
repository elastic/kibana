/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KiGraph, KiGraphNodeData, KiGraphNodeKind } from './types';

const KIND_DISPLAY_ORDER: readonly KiGraphNodeKind[] = [
  'entity',
  'fact',
  'memory',
  'document',
  'workflow',
  'crawler',
];

export const getKiGraphFilterKey = (kind: KiGraphNodeKind, subtype: string): string => {
  if (kind === 'workflow' || kind === 'crawler') {
    return kind;
  }
  const normalizedSubtype = subtype.trim();
  if (kind === 'memory' && normalizedSubtype.length === 0) {
    return 'memory';
  }
  if (normalizedSubtype.length === 0) {
    return kind;
  }
  return `${kind}:${normalizedSubtype}`;
};

export interface KiGraphLegendFilterEntry {
  key: string;
  kind: KiGraphNodeKind;
  subtype: string;
  count: number;
}

export interface KiGraphFilterState {
  hiddenKeys: ReadonlySet<string>;
  hideUnconnected: boolean;
}

export const createDefaultKiGraphFilterState = (): KiGraphFilterState => ({
  hiddenKeys: new Set(),
  hideUnconnected: true,
});

export const buildKiGraphConnectedNodeIds = (graph: KiGraph): ReadonlySet<string> => {
  const connected = new Set<string>();
  for (const edge of graph.edges) {
    connected.add(edge.source);
    connected.add(edge.target);
  }
  return connected;
};

export const setKiGraphHideUnconnected = (
  filter: KiGraphFilterState,
  hideUnconnected: boolean
): KiGraphFilterState => ({
  ...filter,
  hideUnconnected,
});

export const buildKiGraphLegendFilterEntries = (
  graph: KiGraph
): readonly KiGraphLegendFilterEntry[] => {
  const counts = new Map<string, KiGraphLegendFilterEntry>();

  for (const node of graph.nodes) {
    const key = getKiGraphFilterKey(node.kind, node.subtype);
    const existing = counts.get(key);
    if (existing !== undefined) {
      counts.set(key, { ...existing, count: existing.count + 1 });
      continue;
    }
    counts.set(key, { key, kind: node.kind, subtype: node.subtype, count: 1 });
  }

  const entries = [...counts.values()];
  const kindRank = (kind: KiGraphNodeKind): number => {
    const index = KIND_DISPLAY_ORDER.indexOf(kind);
    return index === -1 ? KIND_DISPLAY_ORDER.length : index;
  };

  entries.sort((a, b) => {
    const kindDiff = kindRank(a.kind) - kindRank(b.kind);
    if (kindDiff !== 0) {
      return kindDiff;
    }
    return a.subtype.localeCompare(b.subtype);
  });

  return entries;
};

const isKiGraphNodeHiddenByKey = (
  kind: KiGraphNodeKind,
  subtype: string,
  hiddenKeys: ReadonlySet<string>
): boolean => {
  if (hiddenKeys.has(kind)) {
    return true;
  }
  return hiddenKeys.has(getKiGraphFilterKey(kind, subtype));
};

export const isKiGraphNodeHidden = (
  node: Pick<KiGraphNodeData, 'kiId' | 'kind' | 'subtype'>,
  filter: KiGraphFilterState,
  connectedNodeIds: ReadonlySet<string>
): boolean => {
  if (isKiGraphNodeHiddenByKey(node.kind, node.subtype, filter.hiddenKeys)) {
    return true;
  }
  if (filter.hideUnconnected && !connectedNodeIds.has(node.kiId)) {
    return true;
  }
  return false;
};

export const isKiGraphFilterKeyVisible = (
  key: string,
  kind: KiGraphNodeKind,
  hiddenKeys: ReadonlySet<string>
): boolean => {
  if (hiddenKeys.has(kind)) {
    return false;
  }
  return !hiddenKeys.has(key);
};

export const toggleKiGraphFilterKeyVisibility = (
  hiddenKeys: ReadonlySet<string>,
  key: string,
  kind: KiGraphNodeKind
): ReadonlySet<string> => {
  const next = new Set(hiddenKeys);
  const isVisible = isKiGraphFilterKeyVisible(key, kind, hiddenKeys);
  if (isVisible) {
    next.add(key);
    return next;
  }
  next.delete(key);
  next.delete(kind);
  return next;
};

export const getVisibleKiGraph = (
  graph: KiGraph,
  filter: KiGraphFilterState,
  connectedNodeIds: ReadonlySet<string>
): KiGraph => {
  const visibleNodes = graph.nodes.filter(
    (node) => !isKiGraphNodeHidden(node, filter, connectedNodeIds)
  );
  const visibleIds = new Set(visibleNodes.map(({ kiId }) => kiId));
  const visibleEdges = graph.edges.filter(
    (edge) => visibleIds.has(edge.source) && visibleIds.has(edge.target)
  );
  return {
    nodes: visibleNodes,
    edges: visibleEdges,
    truncated: graph.truncated,
  };
};

export const isKiGraphEdgeHidden = (
  sourceNode: KiGraphNodeData | undefined,
  targetNode: KiGraphNodeData | undefined,
  filter: KiGraphFilterState,
  connectedNodeIds: ReadonlySet<string>
): boolean => {
  if (sourceNode === undefined || targetNode === undefined) {
    return true;
  }
  return (
    isKiGraphNodeHidden(sourceNode, filter, connectedNodeIds) ||
    isKiGraphNodeHidden(targetNode, filter, connectedNodeIds)
  );
};

export const shouldClearKiGraphSelection = (
  selectedId: string | undefined,
  graph: KiGraph,
  filter: KiGraphFilterState,
  connectedNodeIds: ReadonlySet<string>
): boolean => {
  if (selectedId === undefined) {
    return false;
  }
  const selected = graph.nodes.find((node) => node.kiId === selectedId);
  if (selected === undefined) {
    return false;
  }
  return isKiGraphNodeHidden(selected, filter, connectedNodeIds);
};

export const areAllKiGraphNodesHidden = (
  graph: KiGraph,
  filter: KiGraphFilterState,
  connectedNodeIds: ReadonlySet<string>
): boolean => {
  if (graph.nodes.length === 0) {
    return false;
  }
  return graph.nodes.every((node) => isKiGraphNodeHidden(node, filter, connectedNodeIds));
};

export const KI_GRAPH_LEGEND_KIND_ORDER = KIND_DISPLAY_ORDER;
