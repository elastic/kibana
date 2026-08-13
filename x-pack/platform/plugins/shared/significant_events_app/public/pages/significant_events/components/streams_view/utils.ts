/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Direction } from '@elastic/eui';
import { Ast, Query } from '@elastic/eui';
import type { ListStreamDetail } from '@kbn/streams-plugin/server/routes/internal/streams/crud/route';
import {
  getAncestors,
  getSegments,
  isDescendantOf,
  isRootStreamDefinition,
  Streams,
} from '@kbn/streams-schema';

const SORTABLE_FIELDS = ['nameSortKey'] as const;

export type SortableField = (typeof SORTABLE_FIELDS)[number];

export interface EnrichedStream extends ListStreamDetail {
  nameSortKey: string;
  type: 'wired' | 'root' | 'classic' | 'query';
  children?: EnrichedStream[];
}

export type TableRow = EnrichedStream & {
  level: number;
  rootNameSortKey: string;
};

export interface StreamTree extends ListStreamDetail {
  children: StreamTree[];
}

// Builds an EUI Query from the free-text search bar input. The search bar runs in
// `text` mode and accepts arbitrary input, but `Query.parse` only understands EUI
// query syntax and throws on characters such as a leading comma. When parsing fails
// we keep the raw input as a plain-text filter with no clauses, so the table still
// filters by name instead of the page crashing.
export function parseSearchQuery(searchText: string): Query {
  try {
    return Query.parse(searchText);
  } catch {
    return new Query(Ast.create([]), undefined, searchText);
  }
}

/** Returns all streams that match the query or are ancestors of a match. */
export function filterStreamsByQuery(
  streams: ListStreamDetail[],
  query: string
): ListStreamDetail[] {
  if (!query) return streams;
  const lowerQuery = query.toLowerCase();
  const nameToStream = new Map<string, ListStreamDetail>();
  streams.forEach((s) => nameToStream.set(s.stream.name, s));

  const matching = streams.filter((s) => s.stream.name.toLowerCase().includes(lowerQuery));
  const resultSet = new Map<string, ListStreamDetail>();
  for (const stream of matching) {
    resultSet.set(stream.stream.name, stream);
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

/** Filters out rows that are children of collapsed streams. */
export function filterCollapsedStreamRows(rows: TableRow[], collapsedStreams: Set<string>) {
  const result: TableRow[] = [];
  for (const row of rows) {
    const ancestors = getAncestors(row.stream.name);
    let skip = false;
    for (let i = 0; i < ancestors.length; ++i) {
      if (collapsedStreams.has(ancestors[i])) {
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
  sortDirection: Direction
): TableRow[] {
  const isAscending = sortDirection === 'asc';
  const compare = (a: EnrichedStream, b: EnrichedStream): number => {
    const av = a[sortField];
    const bv = b[sortField];
    if (typeof av === 'string' && typeof bv === 'string') {
      return isAscending ? av.localeCompare(bv) : bv.localeCompare(av);
    }
    return 0;
  };

  const result: TableRow[] = [];
  const pushNode = (node: EnrichedStream, level: number, rootNameSortKey: string) => {
    result.push({
      ...node,
      level,
      rootNameSortKey,
    });
    if (node.children) {
      node.children.sort(compare).forEach((child) => pushNode(child, level + 1, rootNameSortKey));
    }
  };

  [...enrichedStreams].sort(compare).forEach((root) => {
    pushNode(root, 0, root.nameSortKey);
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
        isDescendantOf(node.stream.name, streamDetail.stream.name)
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
  const nameSortKey =
    'children' in node
      ? `${getSegments(node.stream.name).length}_${node.stream.name.toLowerCase()}`
      : node.stream.name;
  const children = 'children' in node ? node.children.map(enrichStream) : undefined;

  return {
    stream: node.stream,
    effective_lifecycle: node.effective_lifecycle,
    data_stream: node.data_stream,
    privileges: node.privileges,
    nameSortKey,
    type: Streams.ClassicStream.Definition.is(node.stream)
      ? 'classic'
      : Streams.QueryStream.Definition.is(node.stream)
      ? 'query'
      : isRootStreamDefinition(node.stream)
      ? 'root'
      : 'wired',
    ...(children && { children }),
  };
};
