/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSegments, isRootStreamDefinition, Streams } from '@kbn/streams-schema';
import type { ListStreamDetail } from '@kbn/streams-plugin/server/routes/internal/streams/crud/route';
import { isDslLifecycle, isIlmLifecycle } from '@kbn/streams-schema';
import { Direction } from '@elastic/eui';
import { parseDurationInSeconds } from '../data_management/stream_detail_lifecycle/helpers';

export type SortableField = 'nameSortKey' | 'retentionMs';

export interface EnrichedStreamTree extends Omit<StreamTree, 'children'> {
  nameSortKey: string;
  documentsCount: number;
  retentionMs: number;
  children: EnrichedStreamTree[];
}

export type TableRow = EnrichedStreamTree & {
  level: number;
  rootNameSortKey: string;
  rootDocumentsCount: number;
  rootRetentionMs: number;
};
export interface StreamTree extends ListStreamDetail {
  name: string;
  type: 'wired' | 'root' | 'classic';
  children: StreamTree[];
}

export function isParentName(parent: string, descendant: string) {
  return parent !== descendant && descendant.startsWith(parent + '.');
}

export function buildStreamRows(
  streams: ListStreamDetail[],
  sortField: SortableField,
  sortDirection: Direction
): TableRow[] {
  const enrich = (node: StreamTree): EnrichedStreamTree => {
    let retentionMs = 0;
    const lc = node.effective_lifecycle;
    if (isDslLifecycle(lc)) {
      retentionMs = parseDurationInSeconds(lc.dsl.data_retention ?? '') * 1000;
    } else if (isIlmLifecycle(lc)) {
      retentionMs = Number.POSITIVE_INFINITY;
    }
    const nameSortKey = `${getSegments(node.name).length}_${node.name.toLowerCase()}`;
    return {
      ...node,
      nameSortKey,
      documentsCount: 0,
      retentionMs,
      children: node.children.map(enrich),
    } as EnrichedStreamTree;
  };

  const enrichedTrees: EnrichedStreamTree[] = asTrees(streams).map(enrich);

  const compare = (a: EnrichedStreamTree, b: EnrichedStreamTree): number => {
    const av = a[sortField];
    const bv = b[sortField];
    if (typeof av === 'string' && typeof bv === 'string') {
      return sortDirection === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    }
    if (typeof av === 'number' && typeof bv === 'number') {
      return sortDirection === 'asc' ? av - bv : bv - av;
    }
    return 0;
  };

  const shouldSortChildren = sortField === 'nameSortKey' || sortField === 'retentionMs';
  const result: TableRow[] = [];

  const pushNode = (
    node: EnrichedStreamTree,
    level: number,
    rootMeta: Pick<TableRow, 'rootNameSortKey' | 'rootDocumentsCount' | 'rootRetentionMs'>
  ) => {
    result.push({ ...node, level, ...rootMeta });
    const children = shouldSortChildren ? [...node.children].sort(compare) : node.children;
    children.forEach((child) => pushNode(child, level + 1, rootMeta));
  };

  [...enrichedTrees].sort(compare).forEach((root) => {
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
      (existingNode = currentTree.find((node) => isParentName(node.name, streamDetail.stream.name)))
    ) {
      currentTree = existingNode.children;
    }

    if (!existingNode) {
      const newNode: StreamTree = {
        ...streamDetail,
        name: streamDetail.stream.name,
        children: [],
        type: Streams.UnwiredStream.Definition.is(streamDetail.stream)
          ? 'classic'
          : isRootStreamDefinition(streamDetail.stream)
          ? 'root'
          : 'wired',
      };
      currentTree.push(newNode);
    }
  });

  return trees;
}
