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
import { getSegments } from '@kbn/streams-schema';
import { isDslLifecycle, isIlmLifecycle } from '@kbn/streams-schema';
import type { ListStreamDetail } from '@kbn/streams-plugin/server/routes/internal/streams/crud/route';
import { StreamTree, asTrees } from './utils';
import { StreamsAppSearchBar } from '../streams_app_search_bar';
import { DocumentsColumn } from './documents_column';
import { useStreamsAppRouter } from '../../hooks/use_streams_app_router';
import { RetentionColumn } from './retention_column';
import { parseDurationInSeconds } from '../data_management/stream_detail_lifecycle/helpers';
import { useKibana } from '../../hooks/use_kibana';
import { useTimefilter } from '../../hooks/use_timefilter';

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

export function StreamsTreeTable({
  loading,
  streams,
}: {
  streams: ListStreamDetail[] | undefined;
  loading?: boolean;
}) {
  const router = useStreamsAppRouter();
  const { euiTheme } = useEuiTheme();

  const toggleRowCollapsed = React.useCallback((name: string) => {
    setCollapsedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  }, []);

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

    const controller = new AbortController();
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
                signal: controller.signal,
              }
            );
            counts[name] = details?.count ?? 0;
          } catch (e) {
            if (!controller.signal.aborted) {
              counts[name] = 0;
            }
          }
        })
      );
      if (!controller.signal.aborted) {
        setDocCounts(counts);
      }
    };

    fetchCounts();

    return () => {
      controller.abort();
    };
  }, [streamNames, timeState, streamsRepositoryClient]);

  type SortableField = 'nameSortKey' | 'documentsCount' | 'retentionMs';
  const [sortField, setSortField] = useState<SortableField>('nameSortKey');
  const [sortDirection, setSortDirection] = useState<Direction>('asc');

  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());
  const enrichedTree = React.useMemo(() => {
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

    return asTrees(streams ?? []).map(enrich);
  }, [streams, docCounts]);

  const rootNames = React.useMemo(() => enrichedTree.map((t) => t.name), [enrichedTree]);

  const areAllRootsCollapsed = React.useMemo(
    () => rootNames.length > 0 && rootNames.every((n) => collapsedNodes.has(n)),
    [rootNames, collapsedNodes]
  );

  useEffect(() => {
    if (rootNames.length === 0) return;
    setCollapsedNodes((prev) => {
      const next = new Set<string>();
      prev.forEach((n) => {
        if (rootNames.includes(n)) next.add(n);
      });
      return next;
    });
  }, [rootNames]);

  const flattenTree = useCallback(
    (roots: EnrichedStreamTree[], collapsed: Set<string>): TableRow[] => {
      const result: TableRow[] = [];

      const walk = (node: EnrichedStreamTree, level: number, rootRow: TableRow) => {
        node.children.forEach((child) => {
          const childRow: TableRow = {
            ...child,
            level,
            rootNameSortKey: rootRow.rootNameSortKey,
            rootDocumentsCount: rootRow.rootDocumentsCount,
            rootRetentionMs: rootRow.rootRetentionMs,
          };
          result.push(childRow);
          if (!collapsed.has(child.name)) {
            walk(child, level + 1, rootRow);
          }
        });
      };

      roots.forEach((root) => {
        const rootRow: TableRow = {
          ...root,
          level: 0,
          rootNameSortKey: root.nameSortKey,
          rootDocumentsCount: root.documentsCount,
          rootRetentionMs: root.retentionMs,
        };
        result.push(rootRow);
        if (!collapsed.has(root.name)) {
          walk(root, 1, rootRow);
        }
      });

      return result;
    },
    []
  );

  const sortedRoots = React.useMemo(() => {
    return [...enrichedTree].sort((a, b) => {
      const av = a[sortField];
      const bv = b[sortField];
      if (typeof av === 'string' && typeof bv === 'string') {
        return sortDirection === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortDirection === 'asc' ? av - bv : bv - av;
      }
      return 0;
    });
  }, [enrichedTree, sortField, sortDirection]);

  const items = React.useMemo(() => {
    return flattenTree(sortedRoots, collapsedNodes);
  }, [sortedRoots, collapsedNodes, flattenTree]);

  const onTableChange = useCallback(({ sort }: Criteria<TableRow>) => {
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
    <EuiInMemoryTable<TableRow>
      loading={loading}
      columns={[
        {
          field: 'nameSortKey',
          name: (
            <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false} component="span">
              <EuiFlexItem grow={false}>
                <EuiIcon
                  type={areAllRootsCollapsed ? 'unfold' : 'fold'}
                  size="m"
                  color="text"
                  display="base"
                  aria-label={i18n.translate('xpack.streams.streamsTreeTable.toggleFold', {
                    defaultMessage: 'Toggle fold',
                  })}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (areAllRootsCollapsed) {
                      setCollapsedNodes(new Set());
                    } else {
                      setCollapsedNodes(new Set(rootNames));
                    }
                  }}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false} css={{ width: 4 }} />
              <EuiFlexItem grow={false}>
                {i18n.translate('xpack.streams.streamsTreeTable.nameColumnName', {
                  defaultMessage: 'Name',
                })}
              </EuiFlexItem>
            </EuiFlexGroup>
          ),
          sortable: (row: TableRow) => row.rootNameSortKey,
          dataType: 'string',
          render: (_: unknown, item: TableRow) => (
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
                  <EuiIcon
                    type={collapsedNodes.has(item.name) ? 'arrowRight' : 'arrowDown'}
                    color="text"
                    size="m"
                    aria-label={i18n.translate('xpack.streams.streamsTreeTable.toggleRowFold', {
                      defaultMessage: 'Toggle fold for {name}',
                      values: { name: item.name },
                    })}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleRowCollapsed(item.name);
                    }}
                  />
                ) : (
                  <EuiIcon type="empty" color="text" size="m" />
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
          render: (_: unknown, item: TableRow) =>
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
          render: (_: unknown, item: TableRow) => (
            <RetentionColumn lifecycle={item.effective_lifecycle} />
          ),
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
