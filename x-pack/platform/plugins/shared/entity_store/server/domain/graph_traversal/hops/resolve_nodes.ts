/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ResolvedTraversalNode,
  TraversalNode,
} from '../../../../common/graph_traversal/hop_types';
import { HOP_QUERY_PREAMBLE } from './build_hop_query';
import {
  firstString,
  readTraversalEntity,
  TRAVERSAL_ENTITY_FIELDS,
  type StoredTraversalEntity,
} from './read_traversal_entity';
import type { EsqlResult } from './run_hop';

export const ENTITY_ID_FIELD = 'entity.id';
export const RESOLVED_TO_FIELD = 'entity.relationships.resolution.resolved_to';

/** Columns read from the entity store for each resolved node, in `KEEP` order. */
export const RESOLVE_QUERY_COLUMNS = [ENTITY_ID_FIELD, ...TRAVERSAL_ENTITY_FIELDS] as const;

export const DEFAULT_RESOLVE_CHUNK_SIZE = 500;

export interface ResolveQuery {
  query: string;
  params: string[];
}

export type ExecuteResolveQuery = (query: ResolveQuery) => Promise<EsqlResult>;

export interface ResolveNodesInput {
  nodes: TraversalNode[];
  /** Latest entity index pattern of the execution space. */
  indexPattern: string;
  chunkSize?: number;
}

export interface ResolveNodesResult {
  nodes: ResolvedTraversalNode[];
  stats: {
    requested: number;
    resolved: number;
    unresolved: number;
    aliases: number;
    queries: number;
  };
}

/**
 * One ES|QL lookup of a chunk of node ids in the entity store. Ids travel as parameters.
 */
export const buildResolveQuery = (indexPattern: string, ids: string[]): ResolveQuery => {
  if (ids.length === 0) {
    throw new Error('Cannot build a resolve query for no ids');
  }
  const placeholders = ids.map(() => '?').join(', ');
  const query = [
    HOP_QUERY_PREAMBLE,
    `FROM ${indexPattern}`,
    `| WHERE ${ENTITY_ID_FIELD} IN (${placeholders})`,
    `| KEEP ${RESOLVE_QUERY_COLUMNS.join(', ')}`,
    `| LIMIT ${ids.length}`,
  ].join('\n');
  return { query, params: ids };
};

/**
 * Look every traversed node up in the entity store and annotate it. Nodes keep their order;
 * duplicates are looked up once.
 */
export const resolveNodes = async (
  { nodes, indexPattern, chunkSize = DEFAULT_RESOLVE_CHUNK_SIZE }: ResolveNodesInput,
  execute: ExecuteResolveQuery
): Promise<ResolveNodesResult> => {
  const ids = Array.from(new Set(nodes.map((node) => node.id)));
  const found = new Map<string, StoredEntity>();
  let queries = 0;

  for (let start = 0; start < ids.length; start += chunkSize) {
    const chunk = ids.slice(start, start + chunkSize);
    const result = await execute(buildResolveQuery(indexPattern, chunk));
    queries += 1;
    for (const stored of parseStoredEntities(result)) {
      if (!found.has(stored.id)) {
        found.set(stored.id, stored);
      }
    }
  }

  let aliases = 0;
  const resolved = nodes.map((node): ResolvedTraversalNode => {
    const stored = found.get(node.id);
    if (!stored) {
      return { ...node, euid: node.id, resolved: false };
    }
    if (stored.resolvedTo !== undefined) aliases += 1;
    return {
      ...node,
      euid: node.id,
      resolved: true,
      ...(stored.resolvedTo !== undefined && { canonical_euid: stored.resolvedTo }),
      entity: stored.entity,
    };
  });

  const resolvedCount = resolved.filter((node) => node.resolved).length;
  return {
    nodes: resolved,
    stats: {
      requested: nodes.length,
      resolved: resolvedCount,
      unresolved: nodes.length - resolvedCount,
      aliases,
      queries,
    },
  };
};

interface StoredEntity extends StoredTraversalEntity {
  id: string;
}

const parseStoredEntities = (result: EsqlResult): StoredEntity[] => {
  const column = (name: string) => result.columns.findIndex((c) => c.name === name);
  const idIndex = column(ENTITY_ID_FIELD);
  if (idIndex < 0) {
    throw new Error(`Resolve query result lacks the ${ENTITY_ID_FIELD} column`);
  }
  // Keyed by string: the reader callback is handed any field name, not only the listed columns.
  const indexes = new Map<string, number>(
    RESOLVE_QUERY_COLUMNS.map((name) => [name, column(name)])
  );

  const entities: StoredEntity[] = [];
  for (const row of result.values) {
    const id = firstString(row[idIndex]);
    if (id !== undefined) {
      const stored = readTraversalEntity((field) => {
        const idx = indexes.get(field) ?? -1;
        return idx >= 0 ? row[idx] : undefined;
      });
      entities.push({
        id,
        entity: stored?.entity ?? {},
        ...(stored?.resolvedTo !== undefined && { resolvedTo: stored.resolvedTo }),
      });
    }
  }
  return entities;
};
