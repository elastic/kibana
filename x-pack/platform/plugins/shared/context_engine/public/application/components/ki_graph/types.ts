/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** `document` is any KI type that is not a fact, entity or memory. */
export type KiGraphNodeKind = 'fact' | 'entity' | 'memory' | 'document' | 'workflow' | 'crawler';

export const isKiGraphDocumentViewerTarget = (node: Pick<KiGraphNodeData, 'kind'>): boolean =>
  node.kind !== 'crawler';

export const DERIVED_FROM_RELATION = 'derived_from';
export const CREATED_BY_RELATION = 'created_by';

export interface KiGraphViewerTarget {
  kiId: string;
  index: string;
}

export interface KiGraphNodeData {
  /** KI id, or `workflow:<id>` / `crawler:<name>` for synthetic provenance nodes. */
  kiId: string;
  index: string;
  kind: KiGraphNodeKind;
  /** The KI type without its `fact.` / `entity.` / `memory.` prefix. Empty for workflow and crawler nodes. */
  subtype: string;
  title: string;
  occurrences?: number;
  lastSeenAt?: string;
}

export interface KiGraphEdgeData {
  relation: string;
}

export type KiGraphEdge = KiGraphEdgeData & {
  id: string;
  source: string;
  target: string;
};

export interface KiGraph {
  nodes: readonly KiGraphNodeData[];
  edges: readonly KiGraphEdge[];
  /** True when the query hit its row limit, so some KIs may be missing. */
  truncated: boolean;
}
