/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GraphTraversalEntity, GraphTraversalNode } from '../../../../common/graph_traversal';
import type { EsqlResult } from './map_graph_expand_result';

const ENTITY_ID_FIELD = 'entity.id';
const RESOLVED_TO_FIELD = 'entity.relationships.resolution.resolved_to';
const COLUMNS = [
  ENTITY_ID_FIELD,
  'entity.name',
  'entity.type',
  'entity.sub_type',
  'entity.EngineMetadata.Type',
  'entity.source',
  'asset.criticality',
  'entity.risk.calculated_level',
  'entity.risk.calculated_score_norm',
  RESOLVED_TO_FIELD,
] as const;
const ENGINE_TYPES = ['user', 'host', 'service', 'generic'] as const;
const CHUNK_SIZE = 500;

export interface ResolveQuery {
  query: string;
  params: string[];
}

export type ExecuteEsql = (query: ResolveQuery) => Promise<EsqlResult>;

/** Unmapped fields are loaded from `_source`; the risk and criticality fields are often absent. */
export const buildResolveNodesQuery = (indexPattern: string, ids: string[]): ResolveQuery => ({
  query: [
    'SET unmapped_fields="load";',
    `FROM ${indexPattern}`,
    `| WHERE ${ENTITY_ID_FIELD} IN (${ids.map(() => '?').join(', ')})`,
    `| KEEP ${COLUMNS.join(', ')}`,
    `| LIMIT ${ids.length}`,
  ].join('\n'),
  params: ids,
});

const firstString = (value: unknown): string | undefined => {
  const first = Array.isArray(value) ? value[0] : value;
  return typeof first === 'string' && first.length > 0 ? first : undefined;
};

const allStrings = (value: unknown): string[] =>
  (Array.isArray(value) ? value : [value]).filter(
    (v): v is string => typeof v === 'string' && v.length > 0
  );

/**
 * Annotate traversed nodes with what the entity store's latest index knows about them, the
 * same lookup the workflow's resolve step performs. Node ids are entity ids.
 */
export const resolveGraphTraversalNodes = async (
  nodes: GraphTraversalNode[],
  indexPattern: string,
  execute: ExecuteEsql
): Promise<GraphTraversalNode[]> => {
  const ids = Array.from(new Set(nodes.map((node) => node.id)));
  const found = new Map<string, { entity: GraphTraversalEntity; resolvedTo?: string }>();
  for (let start = 0; start < ids.length; start += CHUNK_SIZE) {
    const result = await execute(
      buildResolveNodesQuery(indexPattern, ids.slice(start, start + CHUNK_SIZE))
    );
    const column = (name: string) => result.columns.findIndex((c) => c.name === name);
    const idIndex = column(ENTITY_ID_FIELD);
    if (idIndex < 0) {
      throw new Error(`Resolve query result lacks the ${ENTITY_ID_FIELD} column`);
    }
    const at = (row: unknown[], name: string): unknown => {
      const index = column(name);
      return index >= 0 ? row[index] : undefined;
    };
    for (const row of result.values) {
      const id = firstString(row[idIndex]);
      if (id === undefined || found.has(id)) continue;
      const engineType = firstString(at(row, 'entity.EngineMetadata.Type'));
      const riskScore = at(row, 'entity.risk.calculated_score_norm');
      const sources = allStrings(at(row, 'entity.source'));
      const optional = (key: keyof GraphTraversalEntity, value: string | undefined) =>
        value !== undefined ? { [key]: value } : {};
      const entity: GraphTraversalEntity = {
        ...optional('name', firstString(at(row, 'entity.name'))),
        ...optional('type', firstString(at(row, 'entity.type'))),
        ...optional('sub_type', firstString(at(row, 'entity.sub_type'))),
        ...((ENGINE_TYPES as readonly string[]).includes(engineType ?? '') && {
          engine_type: engineType as GraphTraversalEntity['engine_type'],
        }),
        ...(sources.length > 0 && { sources }),
        ...optional('criticality', firstString(at(row, 'asset.criticality'))),
        ...optional('risk_level', firstString(at(row, 'entity.risk.calculated_level'))),
        ...(typeof riskScore === 'number' &&
          Number.isFinite(riskScore) && { risk_score: riskScore }),
      };
      const resolvedTo = firstString(at(row, RESOLVED_TO_FIELD));
      found.set(id, { entity, ...(resolvedTo !== undefined && { resolvedTo }) });
    }
  }
  return nodes.map((node) => {
    const stored = found.get(node.id);
    if (!stored) return { ...node, euid: node.id, resolved: false };
    return {
      ...node,
      euid: node.id,
      resolved: true,
      ...(stored.resolvedTo !== undefined && { canonical_euid: stored.resolvedTo }),
      entity: stored.entity,
    };
  });
};
