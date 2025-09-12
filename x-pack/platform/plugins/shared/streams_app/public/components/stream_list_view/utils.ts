/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSegments, isRootStreamDefinition, Streams } from '@kbn/streams-schema';
import type { ListStreamDetail } from '@kbn/streams-plugin/server/routes/internal/streams/crud/route';
import { isDslLifecycle, isIlmLifecycle } from '@kbn/streams-schema';
import type { Direction } from '@elastic/eui';
import { parseDurationInSeconds } from '../data_management/stream_detail_lifecycle/helpers/helpers';

const SORTABLE_FIELDS = ['nameSortKey', 'retentionMs'] as const;

export type SortableField = (typeof SORTABLE_FIELDS)[number];

export interface EnrichedStream extends ListStreamDetail {
  nameSortKey: string;
  documentsCount: number;
  retentionMs: number;
  type: 'wired' | 'root' | 'classic';
  children?: EnrichedStream[];
}

export type TableRow = EnrichedStream & {
  level: number;
  rootNameSortKey: string;
  rootDocumentsCount: number;
  rootRetentionMs: number;
};
export interface StreamTree extends ListStreamDetail {
  children: StreamTree[];
}

export function isParentName(parent: string, descendant: string) {
  return parent !== descendant && descendant.startsWith(parent + '.');
}

export function shouldComposeTree(sortField: SortableField, query: string) {
  return (!sortField || sortField === 'nameSortKey') && !query;
}

export function buildStreamRows(
  enrichedStreams: EnrichedStream[],
  sortField: SortableField,
  sortDirection: Direction
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
    result.push({ ...node, level, ...rootMeta });
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

  return {
    stream: node.stream,
    effective_lifecycle: node.effective_lifecycle,
    data_stream: node.data_stream,
    can_read_failure_store: node.can_read_failure_store,
    nameSortKey,
    documentsCount: 0,
    retentionMs,
    type: Streams.ClassicStream.Definition.is(node.stream)
      ? 'classic'
      : isRootStreamDefinition(node.stream)
      ? 'root'
      : 'wired',
    ...(children && { children }),
  };
};
