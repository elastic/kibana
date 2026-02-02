/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAncestors, getSegments, isRootStreamDefinition, Streams } from '@kbn/streams-schema';
import type { ListStreamDetail } from '@kbn/streams-plugin/server/routes/internal/streams/crud/route';
import { isDslLifecycle, isIlmLifecycle } from '@kbn/streams-schema';
import type { Direction } from '@elastic/eui';
import type { QualityIndicators } from '@kbn/dataset-quality-plugin/common/types';
import { parseDurationInSeconds } from '../data_management/stream_detail_lifecycle/helpers/helpers';

const SORTABLE_FIELDS = ['nameSortKey', 'retentionMs'] as const;

export type SortableField = (typeof SORTABLE_FIELDS)[number];

export interface EnrichedStream extends ListStreamDetail {
  nameSortKey: string;
  documentsCount: number;
  retentionMs: number;
  type: 'wired' | 'root' | 'classic';
  children?: EnrichedStream[];
  /** True for virtual DSNS parent nodes with wildcard patterns */
  isVirtual?: boolean;
}

export type TableRow = EnrichedStream & {
  level: number;
  rootNameSortKey: string;
  rootDocumentsCount: number;
  rootRetentionMs: number;
  dataQuality: QualityIndicators;
};
export interface StreamTree extends ListStreamDetail {
  children: StreamTree[];
}

export function isParentName(parent: string, descendant: string) {
  return parent !== descendant && descendant.startsWith(parent + '.');
}

export function shouldComposeTree(sortField: SortableField) {
  // Always allow tree mode for nameSortKey
  return !sortField || sortField === 'nameSortKey';
}

// Returns all streams that match the query or are ancestors of a match
export function filterStreamsByQuery(
  streams: ListStreamDetail[],
  query: string
): ListStreamDetail[] {
  if (!query) return streams;
  const lowerQuery = query.toLowerCase();
  const nameToStream = new Map<string, ListStreamDetail>();
  streams.forEach((s) => nameToStream.set(s.stream.name, s));

  // Find all streams that match the query
  const matching = streams.filter((s) => s.stream.name.toLowerCase().includes(lowerQuery));
  const resultSet = new Map<string, ListStreamDetail>();
  for (const stream of matching) {
    // Add the match
    resultSet.set(stream.stream.name, stream);
    // Add all ancestors
    const ancestors = getAncestors(stream.stream.name);
    for (let i = 0; i < ancestors.length; ++i) {
      const ancestor = nameToStream.get(ancestors[i]);
      if (ancestor) {
        resultSet.set(ancestors[i], ancestor);
      }
    }
  }
  return Array.from(resultSet.values());
}

// Filters out rows that are children of collapsed streams
export function filterCollapsedStreamRows(
  rows: TableRow[],
  collapsedStreams: Set<string>,
  sortField: SortableField
) {
  if (!shouldComposeTree(sortField)) return rows;
  const result: TableRow[] = [];
  for (const row of rows) {
    // If any ancestor is collapsed, skip this row
    // For wired streams, use dot-separated ancestors
    // For classic/DSNS streams, use DSNS collapse ancestors
    // Virtual DSNS nodes (with * in name) also need DSNS ancestor checking
    const wiredAncestors = getAncestors(row.stream.name);
    const needsDsnsCheck = row.type === 'classic' || isVirtualDsnsName(row.stream.name);
    const dsnsAncestors = needsDsnsCheck ? getDsnsCollapseAncestors(row.stream.name) : [];
    // Filter out the node's own name from ancestors (a node shouldn't filter itself out)
    const allAncestors = [...wiredAncestors, ...dsnsAncestors].filter((a) => a !== row.stream.name);

    let skip = false;
    for (const ancestor of allAncestors) {
      if (collapsedStreams.has(ancestor)) {
        skip = true;
        break;
      }
    }
    if (!skip) result.push(row);
  }
  return result;
}

export function buildStreamRows(
  enrichedStreams: EnrichedStream[],
  sortField: SortableField,
  sortDirection: Direction,
  qualityByStream: Record<string, QualityIndicators>
): TableRow[] {
  const isAscending = sortDirection === 'asc';
  const compare = (a: EnrichedStream, b: EnrichedStream): number => {
    const av = a[sortField];
    const bv = b[sortField];
    if (typeof av === 'string' && typeof bv === 'string') {
      return isAscending ? av.localeCompare(bv) : bv.localeCompare(av);
    }
    if (typeof av === 'number' && typeof bv === 'number') {
      return isAscending ? av - bv : bv - av;
    }
    return 0;
  };

  const result: TableRow[] = [];
  const pushNode = (
    node: EnrichedStream,
    level: number,
    rootMeta: Pick<TableRow, 'rootNameSortKey' | 'rootDocumentsCount' | 'rootRetentionMs'>
  ) => {
    result.push({
      ...node,
      level,
      ...rootMeta,
      dataQuality: qualityByStream[node.stream.name] ?? 'good',
    });
    if (node.children) {
      node.children.sort(compare).forEach((child) => pushNode(child, level + 1, rootMeta));
    }
  };

  [...enrichedStreams].sort(compare).forEach((root) => {
    const rootMeta = {
      rootNameSortKey: root.nameSortKey,
      rootDocumentsCount: root.documentsCount,
      rootRetentionMs: root.retentionMs,
    } as const;
    pushNode(root, 0, rootMeta);
  });

  return result;
}

export function asTrees(streams: ListStreamDetail[]): StreamTree[] {
  const trees: StreamTree[] = [];
  const sortedStreams = streams
    .slice()
    .sort((a, b) => getSegments(a.stream.name).length - getSegments(b.stream.name).length);

  sortedStreams.forEach((streamDetail) => {
    let currentTree = trees;
    let existingNode: StreamTree | undefined;
    while (
      (existingNode = currentTree.find((node) =>
        isParentName(node.stream.name, streamDetail.stream.name)
      ))
    ) {
      currentTree = existingNode.children;
    }

    if (!existingNode) {
      currentTree.push({ ...streamDetail, children: [] });
    }
  });

  return trees;
}

export const enrichStream = (node: StreamTree | ListStreamDetail): EnrichedStream => {
  let retentionMs = 0;
  const lc = node.effective_lifecycle!;
  if (isDslLifecycle(lc)) {
    retentionMs = lc.dsl.data_retention
      ? parseDurationInSeconds(lc.dsl.data_retention) * 1000
      : Number.POSITIVE_INFINITY;
  } else if (isIlmLifecycle(lc)) {
    retentionMs = Number.POSITIVE_INFINITY;
  }
  const nameSortKey =
    'children' in node
      ? `${getSegments(node.stream.name).length}_${node.stream.name.toLowerCase()}`
      : node.stream.name;
  const children = 'children' in node ? node.children.map(enrichStream) : undefined;
  const isVirtual =
    'isVirtual' in node ? (node as StreamTree & { isVirtual?: boolean }).isVirtual : undefined;

  return {
    stream: node.stream,
    effective_lifecycle: node.effective_lifecycle,
    data_stream: node.data_stream,
    nameSortKey,
    documentsCount: 0,
    retentionMs,
    type: Streams.ClassicStream.Definition.is(node.stream)
      ? 'classic'
      : isRootStreamDefinition(node.stream)
      ? 'root'
      : 'wired',
    ...(children && { children }),
    ...(isVirtual && { isVirtual }),
  };
};

// ============================================================================
// DSNS (Data Stream Naming Scheme) Hierarchy Functions
// ============================================================================

/**
 * Parsed DSNS (Data Stream Naming Scheme) parts: {type}-{dataset}-{namespace}
 */
export interface DsnsParts {
  type: string;
  dataset: string;
  namespace: string;
}

/**
 * Parses a DSNS-formatted stream name into its components.
 * Format: {type}-{dataset}-{namespace}
 *
 * Note: The dataset may contain hyphens, so we take the first part as type,
 * the last part as namespace, and everything in between as dataset.
 */
export function parseDsnsName(name: string): DsnsParts | null {
  const parts = name.split('-');
  if (parts.length < 3) {
    return null;
  }
  const type = parts[0];
  const namespace = parts[parts.length - 1];
  const dataset = parts.slice(1, parts.length - 1).join('-');

  return { type, dataset, namespace };
}

/**
 * Gets the base dataset (prefix before the first dot) from a dataset name.
 * Returns null if the dataset has no dot.
 */
export function getBaseDataset(dataset: string): string | null {
  const dotIndex = dataset.indexOf('.');
  if (dotIndex === -1) {
    return null;
  }
  return dataset.substring(0, dotIndex);
}

/**
 * Builds a DSNS name from its parts.
 */
export function buildDsnsName(type: string, dataset: string, namespace: string): string {
  return `${type}-${dataset}-${namespace}`;
}

/**
 * Gets the virtual ancestors for a DSNS stream name.
 * Returns empty array if the stream doesn't have a hierarchical dataset (no dot).
 *
 * For example:
 * - "logs-kubernetes.container_logs-default" returns:
 *   ["logs-kubernetes.*-default"] (sub-dataset parent)
 *
 * - With multiple namespaces, we'd also have:
 *   ["logs-kubernetes.*-*", "logs-kubernetes.container_logs-*"] (combined + namespace)
 */
export function getDsnsAncestors(name: string, hasMultipleNamespaces: boolean): string[] {
  const parsed = parseDsnsName(name);
  if (!parsed) {
    return [];
  }

  const baseDataset = getBaseDataset(parsed.dataset);
  if (!baseDataset) {
    // No dot in dataset - only namespace grouping is possible
    if (hasMultipleNamespaces) {
      return [buildDsnsName(parsed.type, parsed.dataset, '*')];
    }
    return [];
  }

  const ancestors: string[] = [];

  if (hasMultipleNamespaces) {
    // Combined parent: type-baseDataset.*-*
    ancestors.push(buildDsnsName(parsed.type, `${baseDataset}.*`, '*'));
    // Sub-dataset + namespace parent: type-dataset-*
    ancestors.push(buildDsnsName(parsed.type, parsed.dataset, '*'));
  } else {
    // Sub-dataset parent only: type-baseDataset.*-namespace
    ancestors.push(buildDsnsName(parsed.type, `${baseDataset}.*`, parsed.namespace));
  }

  return ancestors;
}

/**
 * Groups classic streams by their DSNS characteristics for hierarchy building.
 */
function groupStreamsByDsnsPattern(streams: ListStreamDetail[]): Map<string, ListStreamDetail[]> {
  const groups = new Map<string, ListStreamDetail[]>();

  for (const stream of streams) {
    const parsed = parseDsnsName(stream.stream.name);
    if (!parsed) {
      // Not a valid DSNS stream, put in its own group
      const key = stream.stream.name;
      groups.set(key, [stream]);
      continue;
    }

    const baseDataset = getBaseDataset(parsed.dataset);
    // Group by type + baseDataset (or full dataset if no dot)
    const groupKey = baseDataset
      ? `${parsed.type}-${baseDataset}`
      : `${parsed.type}-${parsed.dataset}`;

    const existing = groups.get(groupKey) || [];
    existing.push(stream);
    groups.set(groupKey, existing);
  }

  return groups;
}

/**
 * Creates a virtual stream tree node (a "dummy" parent with wildcard pattern).
 */
function createVirtualStreamNode(name: string): StreamTree & { isVirtual: boolean } {
  return {
    stream: { name } as any,
    effective_lifecycle: {} as any,
    data_stream: undefined,
    children: [],
    isVirtual: true,
  };
}

/**
 * Builds a hierarchical tree for DSNS (classic) streams.
 *
 * Hierarchy rules:
 * 1. Only collapse when dataset contains a dot (sub-datasets like kubernetes.container_logs)
 * 2. Sub-datasets collapse into type-baseDataset.*-namespace
 * 3. Different namespaces collapse into type-dataset-*
 * 4. When both apply, create type-baseDataset.*-* as top level
 *
 * Example transformations:
 * - logs-kubernetes.container_logs-default + logs-kubernetes.events-default
 *   → logs-kubernetes.*-default (parent) with both as children
 *
 * - logs-test-xyz + logs-test-abc
 *   → logs-test-* (parent) with both as children
 *
 * - logs-kubernetes.container_logs-default + logs-kubernetes.container_logs-production
 *   + logs-kubernetes.events-default + logs-kubernetes.events-production
 *   → logs-kubernetes.*-* (top parent)
 *     → logs-kubernetes.container_logs-* with namespace children
 *     → logs-kubernetes.events-* with namespace children
 */
export function asDsnsTrees(streams: ListStreamDetail[]): StreamTree[] {
  const groups = groupStreamsByDsnsPattern(streams);
  const result: StreamTree[] = [];

  for (const [_groupKey, groupStreams] of groups) {
    if (groupStreams.length === 1) {
      // Single stream, no grouping needed
      result.push({ ...groupStreams[0], children: [] });
      continue;
    }

    // Parse the first stream to get the type and base dataset
    const firstParsed = parseDsnsName(groupStreams[0].stream.name);
    if (!firstParsed) {
      // Not valid DSNS, just add all streams flat
      for (const stream of groupStreams) {
        result.push({ ...stream, children: [] });
      }
      continue;
    }

    const baseDataset = getBaseDataset(firstParsed.dataset);

    // Check for multiple namespaces across the whole group
    const allNamespaces = new Set<string>();
    const subDatasets = new Set<string>();
    for (const stream of groupStreams) {
      const parsed = parseDsnsName(stream.stream.name);
      if (parsed) {
        allNamespaces.add(parsed.namespace);
        subDatasets.add(parsed.dataset);
      }
    }
    const hasMultipleNamespaces = allNamespaces.size > 1;
    const hasMultipleSubDatasets = baseDataset !== null && subDatasets.size > 1;

    if (!baseDataset) {
      // No dot in dataset - only namespace grouping is possible
      if (hasMultipleNamespaces) {
        // Create type-dataset-* parent
        const parentName = buildDsnsName(firstParsed.type, firstParsed.dataset, '*');
        const parentNode = createVirtualStreamNode(parentName);
        for (const stream of groupStreams) {
          parentNode.children.push({ ...stream, children: [] });
        }
        result.push(parentNode);
      } else {
        // No hierarchy needed, add all flat
        for (const stream of groupStreams) {
          result.push({ ...stream, children: [] });
        }
      }
      continue;
    }

    // Has base dataset (dot in dataset name)
    if (hasMultipleNamespaces && hasMultipleSubDatasets) {
      // Most complex case: type-baseDataset.*-* as top parent
      const topParentName = buildDsnsName(firstParsed.type, `${baseDataset}.*`, '*');
      const topParent = createVirtualStreamNode(topParentName);

      // Group by sub-dataset, then by namespace
      const bySubDataset = new Map<string, ListStreamDetail[]>();
      for (const stream of groupStreams) {
        const parsed = parseDsnsName(stream.stream.name)!;
        const existing = bySubDataset.get(parsed.dataset) || [];
        existing.push(stream);
        bySubDataset.set(parsed.dataset, existing);
      }

      for (const [dataset, datasetStreams] of bySubDataset) {
        if (datasetStreams.length === 1) {
          // Single stream for this sub-dataset, add directly to top parent
          topParent.children.push({ ...datasetStreams[0], children: [] });
        } else {
          // Multiple namespaces for this sub-dataset
          const subDatasetParentName = buildDsnsName(firstParsed.type, dataset, '*');
          const subDatasetParent = createVirtualStreamNode(subDatasetParentName);
          for (const stream of datasetStreams) {
            subDatasetParent.children.push({ ...stream, children: [] });
          }
          topParent.children.push(subDatasetParent);
        }
      }

      result.push(topParent);
    } else if (hasMultipleSubDatasets) {
      // Multiple sub-datasets but single namespace: type-baseDataset.*-namespace
      const namespace = firstParsed.namespace;
      const parentName = buildDsnsName(firstParsed.type, `${baseDataset}.*`, namespace);
      const parentNode = createVirtualStreamNode(parentName);
      for (const stream of groupStreams) {
        parentNode.children.push({ ...stream, children: [] });
      }
      result.push(parentNode);
    } else if (hasMultipleNamespaces) {
      // Single sub-dataset but multiple namespaces: type-dataset-*
      // Group by dataset
      const byDataset = new Map<string, ListStreamDetail[]>();
      for (const stream of groupStreams) {
        const parsed = parseDsnsName(stream.stream.name)!;
        const existing = byDataset.get(parsed.dataset) || [];
        existing.push(stream);
        byDataset.set(parsed.dataset, existing);
      }

      for (const [dataset, datasetStreams] of byDataset) {
        if (datasetStreams.length === 1) {
          result.push({ ...datasetStreams[0], children: [] });
        } else {
          const parentName = buildDsnsName(firstParsed.type, dataset, '*');
          const parentNode = createVirtualStreamNode(parentName);
          for (const stream of datasetStreams) {
            parentNode.children.push({ ...stream, children: [] });
          }
          result.push(parentNode);
        }
      }
    } else {
      // No hierarchy needed, add all flat
      for (const stream of groupStreams) {
        result.push({ ...stream, children: [] });
      }
    }
  }

  return result;
}

/**
 * Gets the virtual ancestors for collapse state checking.
 * Returns the parent patterns that should be checked for collapse state.
 */
export function getDsnsCollapseAncestors(name: string): string[] {
  const parsed = parseDsnsName(name);
  if (!parsed) {
    return [];
  }

  const baseDataset = getBaseDataset(parsed.dataset);
  const ancestors: string[] = [];

  // Check for namespace wildcard parent (type-dataset-*)
  ancestors.push(buildDsnsName(parsed.type, parsed.dataset, '*'));

  if (baseDataset) {
    // Check for sub-dataset wildcard parent (type-baseDataset.*-namespace)
    ancestors.push(buildDsnsName(parsed.type, `${baseDataset}.*`, parsed.namespace));
    // Check for combined wildcard parent (type-baseDataset.*-*)
    ancestors.push(buildDsnsName(parsed.type, `${baseDataset}.*`, '*'));
  }

  return ancestors;
}

/**
 * Checks if a stream name is a virtual DSNS pattern (contains *).
 */
export function isVirtualDsnsName(name: string): boolean {
  return name.includes('*');
}
