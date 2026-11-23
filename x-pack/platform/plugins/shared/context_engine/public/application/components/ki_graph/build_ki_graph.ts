/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ENTITY_TYPE_PREFIX,
  FACT_TYPE_PREFIX,
  OCCURRENCES_ATTRIBUTE,
  parseRelationshipKey,
  RELATIONSHIP_KEY_ATTRIBUTE,
  RELATIONSHIP_KI_TYPE,
} from '../../../../common/dreaming';
import type { KiGraph, KiGraphEdge, KiGraphNodeData, KiGraphNodeKind } from './types';
import type { EsqlCellRecord } from './esql_rows';
import { getAttribute, getNumber, getString } from './esql_rows';

const nodeKindForType = (type: string): { kind: KiGraphNodeKind; subtype: string } | undefined => {
  if (type.startsWith(FACT_TYPE_PREFIX)) {
    return { kind: 'fact', subtype: type.slice(FACT_TYPE_PREFIX.length) };
  }
  if (type.startsWith(ENTITY_TYPE_PREFIX)) {
    return { kind: 'entity', subtype: type.slice(ENTITY_TYPE_PREFIX.length) };
  }
  return undefined;
};

export const buildKiGraph = (records: readonly EsqlCellRecord[], limit: number): KiGraph => {
  const nodesById = new Map<string, KiGraphNodeData>();
  const edgesById = new Map<string, KiGraphEdge>();

  for (const record of records) {
    const kiId = getString(record.id);
    const index = getString(record._index);
    const type = getString(record.type);
    if (kiId === undefined || index === undefined || type === undefined) {
      continue;
    }

    if (type === RELATIONSHIP_KI_TYPE) {
      if (edgesById.has(kiId)) {
        continue;
      }
      const relationshipKey = getString(
        getAttribute(record.attributes, RELATIONSHIP_KEY_ATTRIBUTE)
      );
      const parsed =
        relationshipKey === undefined ? undefined : parseRelationshipKey(relationshipKey);
      if (parsed === undefined) {
        continue;
      }
      edgesById.set(kiId, {
        id: kiId,
        source: parsed.from,
        target: parsed.to,
        relation: parsed.relation,
      });
      continue;
    }

    if (nodesById.has(kiId)) {
      continue;
    }
    const kindInfo = nodeKindForType(type);
    if (kindInfo === undefined || kindInfo.subtype.length === 0) {
      continue;
    }
    const title = getString(record.title) ?? kiId;
    const occurrences = getNumber(getAttribute(record.attributes, OCCURRENCES_ATTRIBUTE));
    nodesById.set(kiId, {
      kiId,
      index,
      kind: kindInfo.kind,
      subtype: kindInfo.subtype,
      title,
      ...(occurrences !== undefined ? { occurrences } : {}),
    });
  }

  const nodeIds = new Set(nodesById.keys());
  const edges = [...edgesById.values()].filter(
    (edge) => edge.source !== edge.target && nodeIds.has(edge.source) && nodeIds.has(edge.target)
  );

  return {
    nodes: [...nodesById.values()],
    edges,
    truncated: records.length >= limit,
  };
};
