/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type KiGraphNodeKind = 'fact' | 'entity';

export interface KiGraphNodeData {
  kiId: string;
  index: string;
  kind: KiGraphNodeKind;
  /** The KI type without its `fact.` / `entity.` prefix. */
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
