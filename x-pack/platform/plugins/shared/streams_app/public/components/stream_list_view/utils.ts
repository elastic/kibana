/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getAncestors,
  getSegments,
  isDescendantOf,
  isRootStreamDefinition,
  LOGS_ECS_STREAM_NAME,
  LOGS_OTEL_STREAM_NAME,
  Streams,
} from '@kbn/streams-schema';
import type { ListStreamDetail } from '@kbn/streams-plugin/server/routes/internal/streams/crud/route';
import type { WiredStreamsStatus } from '@kbn/streams-plugin/public';
import { isDslLifecycle, isIlmLifecycle } from '@kbn/streams-schema';
import type { Direction } from '@elastic/eui';
import type { QualityIndicators } from '@kbn/dataset-quality-plugin/common/types';
import { parseDurationInSeconds } from '../stream_management/data_management/stream_detail_lifecycle/helpers/helpers';

const SORTABLE_FIELDS = [
  'nameSortKey',
  'retentionMs',
  'documentsCount',
  'dataQuality',
  'ingestionRate',
  'storageBytes',
] as const;

export type SortableField = (typeof SORTABLE_FIELDS)[number];

export type StreamType = 'wired' | 'root' | 'classic' | 'query';

export interface EnrichedStream extends ListStreamDetail {
  nameSortKey: string;
  documentsCount: number;
  retentionMs: number;
  ingestionRate: number;
  storageBytes: number | undefined;
  type: StreamType;
  isDraft: boolean;
  children?: EnrichedStream[];
}

export type TableRow = EnrichedStream & {
  level: number;
  rootNameSortKey: string;
  rootDocumentsCount: number;
  rootRetentionMs: number;
  rootIngestionRate: number;
  rootStorageBytes: number | undefined;
  dataQuality: QualityIndicators;
};
export interface StreamTree extends ListStreamDetail {
  children: StreamTree[];
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
  sortDirection: Direction,
  qualityByStream: Record<string, QualityIndicators>
): TableRow[] {
  const isAscending = sortDirection === 'asc';
  const getSortValue = (node: EnrichedStream): string | number | undefined => {
    switch (sortField) {
      case 'nameSortKey':
        return node.nameSortKey;
      case 'retentionMs':
        return node.retentionMs;
      case 'documentsCount':
        return node.documentsCount;
      case 'ingestionRate':
        return node.ingestionRate;
      case 'storageBytes':
        return node.storageBytes ?? -1;
      default:
        return undefined;
    }
  };
  const compare = (a: EnrichedStream, b: EnrichedStream): number => {
    const av = getSortValue(a);
    const bv = getSortValue(b);
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
    rootMeta: Pick<
      TableRow,
      | 'rootNameSortKey'
      | 'rootDocumentsCount'
      | 'rootRetentionMs'
      | 'rootIngestionRate'
      | 'rootStorageBytes'
    >
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
      rootIngestionRate: root.ingestionRate,
      rootStorageBytes: root.storageBytes,
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

// =============================================================================
// STREAMS LIST — DUMMY / DEMO DATA ONLY
// -----------------------------------------------------------------------------
// Hardcoded row presentation for local UI work. Search: STREAMS_LIST_DUMMY
// Remove this block when real query/draft APIs drive the table.
// =============================================================================

/** Stream names forced to `type: 'query'` for list UI (badge, filters, hidden quality/retention). */
const STREAMS_LIST_DUMMY_QUERY_STREAM_NAMES = new Set<string>([LOGS_ECS_STREAM_NAME]);

/** Stream names shown with Draft badge + `isDraft` row flags. */
const STREAMS_LIST_DUMMY_DRAFT_STREAM_NAMES = new Set<string>(['logs.otel.child']);

/** Demo document count, ingestion (docs/s), and optional storage (bytes) for list cells + sorting. */
export interface StreamsListDummyStreamMetrics {
  documents: number;
  /** Ingestion rate in documents per second (displayed as docs/s in the list). */
  ingestionRateDps: number;
  /** Omit to show no storage in the list (em dash), overriding API stats when this stream is in the map. */
  storageBytes?: number;
}

export const STREAMS_LIST_DUMMY_STREAM_METRICS: Record<string, StreamsListDummyStreamMetrics> = {
  [LOGS_ECS_STREAM_NAME]: {
    documents: 1_250_000,
    ingestionRateDps: 420.5,
  },
  // Root wired stream: demo volume for list / sorting (overrides API counts when present).
  'logs.otel': {
    documents: 190_000,
    ingestionRateDps: 27.2,
    storageBytes: 900 * 1024 ** 2,
  },
  'logs.otel.child': {
    documents: 88_200,
    ingestionRateDps: 12.3,
  },
  'logs-synth-default': {
    documents: 502_000,
    ingestionRateDps: 98.7,
    storageBytes: 3_758_096_384, // 3.5 GiB (1024-based)
  },
};

// =============================================================================
// end STREAMS_LIST_DUMMY
// =============================================================================

const getStreamType = (stream: ListStreamDetail['stream']): StreamType => {
  if (Streams.QueryStream.Definition.is(stream)) return 'query';
  if (Streams.ClassicStream.Definition.is(stream)) return 'classic';
  if (isRootStreamDefinition(stream)) return 'root';
  return 'wired';
};

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
  let type = getStreamType(node.stream);
  if (STREAMS_LIST_DUMMY_QUERY_STREAM_NAMES.has(node.stream.name)) {
    type = 'query';
  }

  const dummyMetrics = STREAMS_LIST_DUMMY_STREAM_METRICS[node.stream.name];

  return {
    stream: node.stream,
    effective_lifecycle: node.effective_lifecycle,
    data_stream: node.data_stream,
    nameSortKey,
    documentsCount: dummyMetrics?.documents ?? 0,
    ingestionRate: dummyMetrics?.ingestionRateDps ?? 0,
    storageBytes: dummyMetrics === undefined ? 0 : dummyMetrics.storageBytes,
    retentionMs,
    type,
    isDraft: STREAMS_LIST_DUMMY_DRAFT_STREAM_NAMES.has(node.stream.name),
    ...(children && { children }),
  };
};

export const getLegacyLogsStatus = (
  streamsStatus: WiredStreamsStatus | undefined
): { hasLegacyLogs: boolean; hasNewStreams: boolean } => {
  if (!streamsStatus) {
    return { hasLegacyLogs: false, hasNewStreams: false };
  }

  const hasLegacyLogs = streamsStatus.logs === true;
  const hasNewStreams =
    streamsStatus[LOGS_OTEL_STREAM_NAME] === true && streamsStatus[LOGS_ECS_STREAM_NAME] === true;

  return { hasLegacyLogs, hasNewStreams };
};
