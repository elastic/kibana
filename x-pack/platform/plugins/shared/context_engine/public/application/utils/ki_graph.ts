/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryAiIndicesResponse } from '../../../common/http_api/ai_indices';

/** KIs read into one graph. The query API caps a response at this many rows. */
export const KI_GRAPH_MAX_KIS = 1000;

const KI_URI_PREFIX = 'ki://';

/** A bubble: a KI, or something outside the index that KIs reference (`index://…`, `trace://…`). */
export interface KiGraphNode {
  id: string;
  kind: 'ki' | 'reference';
  /** Layer the node belongs to: a KI type family, or `ref:<scheme>` for references. */
  group: string;
  label: string;
  /** KI type, for KI nodes. */
  type?: string;
  /** Backing index of the KI, needed to load it. */
  index?: string;
  /** The URI, for reference nodes. */
  uri?: string;
  degree: number;
}

export interface KiGraphLink {
  source: string;
  target: string;
}

export interface KiGraphLayer {
  group: string;
  kind: KiGraphNode['kind'];
  count: number;
}

export interface KiGraph {
  nodes: KiGraphNode[];
  links: KiGraphLink[];
  layers: KiGraphLayer[];
  /** Neighbour ids per node id. */
  neighbors: Map<string, Set<string>>;
  /** True when the index holds more KIs than one graph reads. */
  truncated: boolean;
}

/** ES|QL identifiers the graph query may splice into `FROM`. AI index dests already match this. */
const SAFE_DEST = /^[a-zA-Z0-9._*,-]+$/;

export const buildKiGraphQuery = (dest: string): string => {
  if (!SAFE_DEST.test(dest)) {
    throw new Error(`AI index destination "${dest}" cannot be queried as a graph.`);
  }
  return `FROM ${dest} METADATA _index | KEEP _index, id, type, title, references.uri | LIMIT ${KI_GRAPH_MAX_KIS}`;
};

/** `memory.entity.service` → `memory.entity`; short-term and session memories share a layer each. */
export const kiGroupOf = (type: string | undefined): string => {
  if (!type) {
    return 'other';
  }
  const parts = type.split('.');
  if (parts[0] !== 'memory') {
    return type;
  }
  if (parts[1] === 'session' || parts[1] === 'session_fact') {
    return 'memory.session';
  }
  return parts.length > 2 ? `${parts[0]}.${parts[1]}` : type;
};

const referenceGroupOf = (uri: string): string => {
  const separator = uri.indexOf('://');
  return `ref:${separator > 0 ? uri.slice(0, separator) : 'other'}`;
};

const referenceLabelOf = (uri: string): string => {
  const separator = uri.indexOf('://');
  return separator > 0 ? uri.slice(separator + 3) : uri;
};

const toStrings = (value: unknown): string[] => {
  if (value === null || value === undefined) {
    return [];
  }
  return (Array.isArray(value) ? value : [value]).filter(
    (item): item is string => typeof item === 'string' && item.length > 0
  );
};

const REFERENCE_NODE_PREFIX = 'ref:';

export const referenceNodeId = (uri: string): string => `${REFERENCE_NODE_PREFIX}${uri}`;

/**
 * KIs are nodes, and so is every URI they reference outside the index. A `ki://` reference to a
 * KI in the graph links the two KIs; one to a KI outside the graph becomes a reference node.
 */
export const buildKiGraph = ({ columns, values }: QueryAiIndicesResponse): KiGraph => {
  const column = (name: string) => columns.findIndex((entry) => entry.name === name);
  const indexColumn = column('_index');
  const idColumn = column('id');
  const typeColumn = column('type');
  const titleColumn = column('title');
  const referencesColumn = column('references.uri');

  const nodes = new Map<string, KiGraphNode>();
  const kiReferences = new Map<string, string[]>();
  for (const row of values) {
    const id = row[idColumn];
    if (typeof id !== 'string' || nodes.has(id)) {
      continue;
    }
    const type = typeof row[typeColumn] === 'string' ? (row[typeColumn] as string) : undefined;
    const title = row[titleColumn];
    const index = row[indexColumn];
    nodes.set(id, {
      id,
      kind: 'ki',
      group: kiGroupOf(type),
      label: typeof title === 'string' && title.length > 0 ? title : id,
      ...(type !== undefined && { type }),
      ...(typeof index === 'string' && { index }),
      degree: 0,
    });
    kiReferences.set(id, referencesColumn >= 0 ? toStrings(row[referencesColumn]) : []);
  }

  const links: KiGraphLink[] = [];
  const seenLinks = new Set<string>();
  const addLink = (source: string, target: string) => {
    if (source === target) {
      return;
    }
    const key = source < target ? `${source}\n${target}` : `${target}\n${source}`;
    if (seenLinks.has(key)) {
      return;
    }
    seenLinks.add(key);
    links.push({ source, target });
  };

  for (const [id, uris] of kiReferences) {
    for (const uri of uris) {
      const kiTarget = uri.startsWith(KI_URI_PREFIX) ? uri.slice(KI_URI_PREFIX.length) : undefined;
      if (kiTarget !== undefined && nodes.get(kiTarget)?.kind === 'ki') {
        addLink(id, kiTarget);
        continue;
      }
      const refId = referenceNodeId(uri);
      if (!nodes.has(refId)) {
        nodes.set(refId, {
          id: refId,
          kind: 'reference',
          group: referenceGroupOf(uri),
          label: referenceLabelOf(uri),
          uri,
          degree: 0,
        });
      }
      addLink(id, refId);
    }
  }

  const neighbors = new Map<string, Set<string>>([...nodes.keys()].map((id) => [id, new Set()]));
  for (const { source, target } of links) {
    neighbors.get(source)?.add(target);
    neighbors.get(target)?.add(source);
  }
  for (const node of nodes.values()) {
    node.degree = neighbors.get(node.id)?.size ?? 0;
  }

  const layerCounts = new Map<string, KiGraphLayer>();
  for (const { group, kind } of nodes.values()) {
    const layer = layerCounts.get(group) ?? { group, kind, count: 0 };
    layer.count++;
    layerCounts.set(group, layer);
  }
  // KI layers first, largest first, so colours stay stable for the main content.
  const layers = [...layerCounts.values()].sort(
    (a, b) =>
      Number(a.kind === 'reference') - Number(b.kind === 'reference') ||
      b.count - a.count ||
      a.group.localeCompare(b.group)
  );

  return {
    nodes: [...nodes.values()],
    links,
    layers,
    neighbors,
    truncated: kiReferences.size >= KI_GRAPH_MAX_KIS,
  };
};
