/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ENTITY_TYPE_PREFIX,
  FACT_TYPE_PREFIX,
  LAST_SEEN_AT_ATTRIBUTE,
  OCCURRENCES_ATTRIBUTE,
  parseRelationshipKey,
  RELATIONSHIP_KEY_ATTRIBUTE,
  RELATIONSHIP_KI_TYPE,
} from '../../../../common/dreaming';
import type { KiGraph, KiGraphEdge, KiGraphNodeData, KiGraphNodeKind } from './types';
import { CREATED_BY_RELATION } from './types';
import type { EsqlCellRecord } from './esql_rows';
import { getAttribute, getNumber, getString, getStrings } from './esql_rows';

const KI_URI_PREFIX = 'ki://';
const WORKFLOW_URI_PREFIX = 'workflow://';
const CRAWLER_URI_PREFIX = 'crawler://';
const MEMORY_TYPE_PREFIX = 'memory.';
const DELETED_LIFECYCLE_STATUS = 'deleted';

const REFERENCE_URI_FIELD = 'references.uri';
const REFERENCE_RELATION_FIELD = 'references.relation';
const LIFECYCLE_STATUS_FIELD = 'governance.lifecycle.status';
const CREATED_BY_URI_FIELD = 'governance.provenance.created_by.uri';

const HASH_SUFFIX_PATTERN = /-[a-f0-9]{8,}$/i;

export const classifyKiType = (
  type: string
): { kind: KiGraphNodeKind; subtype: string } | undefined => {
  if (type === RELATIONSHIP_KI_TYPE) {
    return undefined;
  }
  if (type.startsWith(FACT_TYPE_PREFIX)) {
    const subtype = type.slice(FACT_TYPE_PREFIX.length);
    if (subtype.length === 0) {
      return undefined;
    }
    return { kind: 'fact', subtype };
  }
  if (type.startsWith(ENTITY_TYPE_PREFIX)) {
    const subtype = type.slice(ENTITY_TYPE_PREFIX.length);
    if (subtype.length === 0) {
      return undefined;
    }
    return { kind: 'entity', subtype };
  }
  if (type.startsWith(MEMORY_TYPE_PREFIX)) {
    return { kind: 'memory', subtype: type.slice(MEMORY_TYPE_PREFIX.length) };
  }
  if (type === 'workflow') {
    return { kind: 'workflow', subtype: '' };
  }
  return { kind: 'document', subtype: type };
};

export const parseKiIdFromUri = (uri: string): string | undefined => {
  if (!uri.startsWith(KI_URI_PREFIX)) {
    return undefined;
  }
  const kiId = uri.slice(KI_URI_PREFIX.length);
  return kiId.length > 0 ? kiId : undefined;
};

export const parseWorkflowIdFromUri = (uri: string): string | undefined => {
  if (!uri.startsWith(WORKFLOW_URI_PREFIX)) {
    return undefined;
  }
  const workflowId = uri.slice(WORKFLOW_URI_PREFIX.length);
  return workflowId.length > 0 ? workflowId : undefined;
};

export const parseCrawlerNameFromUri = (uri: string): string | undefined => {
  if (!uri.startsWith(CRAWLER_URI_PREFIX)) {
    return undefined;
  }
  const name = uri.slice(CRAWLER_URI_PREFIX.length);
  return name.length > 0 ? name : undefined;
};

type ProvenanceTarget =
  | { kind: 'workflow'; workflowId: string }
  | { kind: 'crawler'; crawlerName: string };

const parseProvenanceTargetFromUri = (uri: string): ProvenanceTarget | undefined => {
  const workflowId = parseWorkflowIdFromUri(uri);
  if (workflowId !== undefined) {
    return { kind: 'workflow', workflowId };
  }
  const crawlerName = parseCrawlerNameFromUri(uri);
  if (crawlerName !== undefined) {
    return { kind: 'crawler', crawlerName };
  }
  return undefined;
};

export const readableWorkflowTitle = (workflowId: string): string => {
  let title = workflowId;
  if (title.startsWith('system-')) {
    title = title.slice('system-'.length);
  }
  const hashMatch = title.match(HASH_SUFFIX_PATTERN);
  if (hashMatch !== null) {
    title = title.slice(0, -hashMatch[0].length);
  }
  if (title.length === 0) {
    return workflowId;
  }
  return title;
};

export const relationLabelForReferences = (relations: readonly string[]): string => {
  const distinct = [...new Set(relations.filter((relation) => relation.length > 0))];
  if (distinct.length === 1) {
    return distinct[0];
  }
  return 'references';
};

const workflowNodeId = (workflowId: string): string => `workflow:${workflowId}`;
const crawlerNodeId = (crawlerName: string): string => `crawler:${crawlerName}`;

const referenceEdgeId = (source: string, target: string): string => `${source}->${target}:ref`;

const createdByEdgeId = (source: string, target: string): string =>
  `${source}->${target}:created_by`;

const lifecycleStatusOf = (record: EsqlCellRecord): string | undefined =>
  getString(record[LIFECYCLE_STATUS_FIELD]);

const isLatestRevisionTombstone = (
  record: EsqlCellRecord,
  seenKiIds: Set<string>
): 'skip_older' | 'skip_deleted' | 'use' => {
  const kiId = getString(record.id);
  if (kiId === undefined) {
    return 'skip_older';
  }
  if (seenKiIds.has(kiId)) {
    return 'skip_older';
  }
  seenKiIds.add(kiId);
  if (lifecycleStatusOf(record) === DELETED_LIFECYCLE_STATUS) {
    return 'skip_deleted';
  }
  return 'use';
};

const addRelationshipEdge = (
  edgesById: Map<string, KiGraphEdge>,
  record: EsqlCellRecord,
  kiId: string
): void => {
  if (edgesById.has(kiId)) {
    return;
  }
  const relationshipKey = getString(getAttribute(record.attributes, RELATIONSHIP_KEY_ATTRIBUTE));
  const parsed = relationshipKey === undefined ? undefined : parseRelationshipKey(relationshipKey);
  if (parsed === undefined) {
    return;
  }
  edgesById.set(kiId, {
    id: kiId,
    source: parsed.from,
    target: parsed.to,
    relation: parsed.relation,
  });
};

const addKiNode = (
  nodesById: Map<string, KiGraphNodeData>,
  record: EsqlCellRecord,
  kiId: string,
  type: string,
  index: string
): void => {
  const kindInfo = classifyKiType(type);
  if (kindInfo === undefined) {
    return;
  }
  if (nodesById.has(kiId)) {
    return;
  }
  const title = getString(record.title) ?? kiId;
  const occurrences = getNumber(getAttribute(record.attributes, OCCURRENCES_ATTRIBUTE));
  const lastSeenAt = getString(getAttribute(record.attributes, LAST_SEEN_AT_ATTRIBUTE));
  nodesById.set(kiId, {
    kiId,
    index,
    kind: kindInfo.kind,
    subtype: kindInfo.subtype,
    title,
    ...(occurrences !== undefined ? { occurrences } : {}),
    ...(lastSeenAt !== undefined ? { lastSeenAt } : {}),
  });
};

const addReferenceEdges = (
  edgesById: Map<string, KiGraphEdge>,
  sourceKiId: string,
  record: EsqlCellRecord
): void => {
  const uris = getStrings(record[REFERENCE_URI_FIELD]);
  const relations = getStrings(record[REFERENCE_RELATION_FIELD]);
  const relation = relationLabelForReferences(relations);
  for (const uri of uris) {
    const targetKiId = parseKiIdFromUri(uri);
    if (targetKiId === undefined) {
      continue;
    }
    const edgeId = referenceEdgeId(sourceKiId, targetKiId);
    if (edgesById.has(edgeId)) {
      continue;
    }
    edgesById.set(edgeId, {
      id: edgeId,
      source: sourceKiId,
      target: targetKiId,
      relation,
    });
  }
};

const ensureProvenanceNode = (
  provenanceNodesById: Map<string, KiGraphNodeData>,
  target: ProvenanceTarget,
  index: string
): string => {
  if (target.kind === 'workflow') {
    const nodeKiId = workflowNodeId(target.workflowId);
    if (!provenanceNodesById.has(nodeKiId)) {
      provenanceNodesById.set(nodeKiId, {
        kiId: nodeKiId,
        index,
        kind: 'workflow',
        subtype: '',
        title: readableWorkflowTitle(target.workflowId),
      });
    }
    return nodeKiId;
  }
  const nodeKiId = crawlerNodeId(target.crawlerName);
  if (!provenanceNodesById.has(nodeKiId)) {
    provenanceNodesById.set(nodeKiId, {
      kiId: nodeKiId,
      index,
      kind: 'crawler',
      subtype: '',
      title: target.crawlerName,
    });
  }
  return nodeKiId;
};

const addCreatedByEdges = (
  edgesById: Map<string, KiGraphEdge>,
  provenanceNodesById: Map<string, KiGraphNodeData>,
  sourceKiId: string,
  index: string,
  record: EsqlCellRecord
): void => {
  for (const uri of getStrings(record[CREATED_BY_URI_FIELD])) {
    const target = parseProvenanceTargetFromUri(uri);
    if (target === undefined) {
      continue;
    }
    const targetKiId = ensureProvenanceNode(provenanceNodesById, target, index);
    const edgeId = createdByEdgeId(sourceKiId, targetKiId);
    if (edgesById.has(edgeId)) {
      continue;
    }
    edgesById.set(edgeId, {
      id: edgeId,
      source: sourceKiId,
      target: targetKiId,
      relation: CREATED_BY_RELATION,
    });
  }
};

export const buildKiGraph = (records: readonly EsqlCellRecord[], limit: number): KiGraph => {
  const seenKiIds = new Set<string>();
  const nodesById = new Map<string, KiGraphNodeData>();
  const provenanceNodesById = new Map<string, KiGraphNodeData>();
  const edgesById = new Map<string, KiGraphEdge>();

  for (const record of records) {
    const revision = isLatestRevisionTombstone(record, seenKiIds);
    if (revision !== 'use') {
      continue;
    }

    const kiId = getString(record.id);
    const index = getString(record._index);
    const type = getString(record.type);
    if (kiId === undefined || index === undefined || type === undefined) {
      continue;
    }

    if (type === RELATIONSHIP_KI_TYPE) {
      addRelationshipEdge(edgesById, record, kiId);
      continue;
    }

    addKiNode(nodesById, record, kiId, type, index);
    addReferenceEdges(edgesById, kiId, record);
    addCreatedByEdges(edgesById, provenanceNodesById, kiId, index, record);
  }

  for (const provenanceNode of provenanceNodesById.values()) {
    if (!nodesById.has(provenanceNode.kiId)) {
      nodesById.set(provenanceNode.kiId, provenanceNode);
    }
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
