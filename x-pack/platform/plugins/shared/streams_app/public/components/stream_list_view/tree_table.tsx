/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useState, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiIcon,
  EuiInMemoryTable,
  Direction,
  Criteria,
  useEuiTheme,
} from '@elastic/eui';

import { css } from '@emotion/css';
import { isRootStreamDefinition, getSegments, Streams } from '@kbn/streams-schema';
import type { ListStreamDetail } from '@kbn/streams-plugin/server/routes/internal/streams/crud/route';
import { isDslLifecycle, isIlmLifecycle } from '@kbn/streams-schema';
import { StreamsAppSearchBar } from '../streams_app_search_bar';
import { DocumentsColumn } from './documents_column';
import { useStreamsAppRouter } from '../../hooks/use_streams_app_router';
import { RetentionColumn } from './retention_column';
import { parseDurationInSeconds } from '../data_management/stream_detail_lifecycle/helpers';
import { useKibana } from '../../hooks/use_kibana';
import { useTimefilter } from '../../hooks/use_timefilter';

export function StreamsTreeTable({
  loading,
  streams,
}: {
  streams: ListStreamDetail[] | undefined;
  loading?: boolean;
}) {
  const router = useStreamsAppRouter();
  const { euiTheme } = useEuiTheme();

  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();

  const { timeState } = useTimefilter();
  const [docCounts, setDocCounts] = useState<Record<string, number>>({});

  const streamNames = React.useMemo(() => (streams ?? []).map((s) => s.stream.name), [streams]);

  useEffect(() => {
    if (streamNames.length === 0) return;

    let cancelled = false;
    const fetchCounts = async () => {
      const counts: Record<string, number> = {};
      await Promise.all(
        streamNames.map(async (name) => {
          try {
            const startStr = String(timeState.start);
            const endStr = String(timeState.end);

            const { details } = await streamsRepositoryClient.fetch(
              'GET /internal/streams/{name}/_details',
              {
                params: {
                  path: { name },
                  query: { start: startStr, end: endStr },
                },
                signal: null,
              }
            );
            counts[name] = details?.count ?? 0;
          } catch {
            counts[name] = 0;
          }
        })
      );
      if (!cancelled) {
        setDocCounts(counts);
      }
    };

    fetchCounts();
    return () => {
      cancelled = true;
    };
  }, [streamNames, timeState, streamsRepositoryClient]);

  type SortableField = 'nameSortKey' | 'documentsCount' | 'retentionMs';
  const [sortField, setSortField] = useState<SortableField>('nameSortKey');
  const [sortDirection, setSortDirection] = useState<Direction>('asc');

  interface EnrichedStreamTree extends Omit<StreamTree, 'children'> {
    children: EnrichedStreamTree[];
    nameSortKey: string;
    documentsCount: number;
    retentionMs: number;
  }
  type TableRow = EnrichedStreamTree & {
    level: number;
    rootNameSortKey: string;
    rootDocumentsCount: number;
    rootRetentionMs: number;
  };

  const sortRootsAndFlatten = useCallback(
    (tree: EnrichedStreamTree[], fieldName: SortableField, sortDir: Direction): TableRow[] => {
      const sortedRoots = [...tree].sort((a, b) => {
        const av = a[fieldName];
        const bv = b[fieldName];
        if (typeof av === 'string' && typeof bv === 'string') {
          return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
        }
        if (typeof av === 'number' && typeof bv === 'number') {
          return sortDir === 'asc' ? av - bv : bv - av;
        }
        return 0;
      });
      const result: TableRow[] = [];
      const walk = (node: EnrichedStreamTree, level: number, rootRow: TableRow) => {
        node.children.forEach((child: EnrichedStreamTree) => {
          const childRow: TableRow = {
            ...child,
            level,
            rootNameSortKey: rootRow.rootNameSortKey,
            rootDocumentsCount: rootRow.rootDocumentsCount,
            rootRetentionMs: rootRow.rootRetentionMs,
          };
          result.push(childRow);
          walk(child, level + 1, rootRow);
        });
      };
      sortedRoots.forEach((root) => {
        const rootRow: TableRow = {
          ...root,
          level: 0,
          rootNameSortKey: root.nameSortKey,
          rootDocumentsCount: root.documentsCount,
          rootRetentionMs: root.retentionMs,
        };
        result.push(rootRow);
        walk(root, 1, rootRow);
      });
      return result;
    },
    []
  );

  const items = React.useMemo(() => {
    const enrich = (node: StreamTree): EnrichedStreamTree => {
      const documentsCount = docCounts[node.name] ?? 0;
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
        documentsCount,
        retentionMs,
        children: node.children.map(enrich),
      } as EnrichedStreamTree;
    };
    const tree = asTrees(streams ?? []).map(enrich);
    return sortRootsAndFlatten(tree, sortField, sortDirection);
  }, [streams, docCounts, sortField, sortDirection, sortRootsAndFlatten]);

  const onTableChange = useCallback(({ sort }: Criteria<any>) => {
    if (sort) {
      setSortField(sort.field as SortableField);
      setSortDirection(sort.direction);
    }
  }, []);

  const sorting = {
    sort: {
      field: sortField,
      direction: sortDirection,
    },
  };

  return (
    <EuiInMemoryTable
      loading={loading}
      columns={[
        {
          field: 'nameSortKey',
          name: i18n.translate('xpack.streams.streamsTreeTable.nameColumnName', {
            defaultMessage: 'Name',
          }),
          sortable: (row: TableRow) => row.rootNameSortKey,
          dataType: 'string',
          render: (_: any, item) => (
            <EuiFlexGroup
              alignItems="center"
              gutterSize="s"
              responsive={false}
              className={css`
                margin-left: ${item.level * parseInt(euiTheme.size.xl, 10)}px;
              `}
            >
              <EuiFlexItem grow={false}>
                {item.children.length > 0 ? (
                  <EuiIcon type="arrowDown" color="black" size="s" />
                ) : (
                  <EuiIcon type="empty" color="black" size="s" />
                )}
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiLink
                  data-test-subj="streamsAppStreamNodeLink"
                  href={router.link('/{key}', { path: { key: item.name } })}
                >
                  {item.name}
                </EuiLink>
              </EuiFlexItem>
            </EuiFlexGroup>
          ),
        },
        {
          field: 'documentsCount',
          name: i18n.translate('xpack.streams.streamsTreeTable.documentsColumnName', {
            defaultMessage: 'Documents',
          }),
          width: '280px',
          sortable: (row: TableRow) => row.rootDocumentsCount,
          dataType: 'number',
          render: (_: any, item: any) =>
            item.data_stream ? (
              <DocumentsColumn indexPattern={item.name} numDataPoints={25} />
            ) : null,
        },
        {
          field: 'retentionMs',
          name: i18n.translate('xpack.streams.streamsTreeTable.retentionColumnName', {
            defaultMessage: 'Retention',
          }),
          width: '160px',
          align: 'left',
          sortable: (row: TableRow) => row.rootRetentionMs,
          dataType: 'number',
          render: (_: any, item: any) => <RetentionColumn lifecycle={item.effective_lifecycle} />,
        },
      ]}
      itemId="name"
      items={items}
      sorting={sorting}
      message={i18n.translate('xpack.streams.streamsTreeTable.noStreamsMessage', {
        defaultMessage: 'Loading streams...',
      })}
      onChange={onTableChange}
      pagination={{
        initialPageSize: 25,
        pageSizeOptions: [25, 50, 100],
      }}
      search={{
        box: {
          incremental: true,
        },
        toolsRight: <StreamsAppSearchBar showDatePicker />,
      }}
    />
  );
}

export interface StreamTree extends ListStreamDetail {
  name: string;
  type: 'wired' | 'root' | 'classic';
  children: StreamTree[];
}

export function asTrees(streams: ListStreamDetail[]) {
  const trees: StreamTree[] = [];
  const sortedStreams = streams
    .slice()
    .sort((a, b) => getSegments(a.stream.name).length - getSegments(b.stream.name).length);

  sortedStreams.forEach((streamDetail) => {
    let currentTree = trees;
    let existingNode: StreamTree | undefined;
    // traverse the tree following the prefix of the current name.
    // once we reach the leaf, the current name is added as child - this works because the ids are sorted by depth
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

function isParentName(parent: string, descendant: string) {
  return parent !== descendant && descendant.startsWith(parent + '.');
}
