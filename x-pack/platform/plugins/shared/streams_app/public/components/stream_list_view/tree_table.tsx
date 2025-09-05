/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import type { Direction, EuiSearchBarProps, CriteriaWithPagination } from '@elastic/eui';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiIcon,
  EuiInMemoryTable,
  useEuiTheme,
  EuiHighlight,
} from '@elastic/eui';
import { css } from '@emotion/css';
import type { ListStreamDetail } from '@kbn/streams-plugin/server/routes/internal/streams/crud/route';
import { Streams } from '@kbn/streams-schema';
import type { TableRow, SortableField } from './utils';
import { buildStreamRows, asTrees, enrichStream, shouldComposeTree } from './utils';
import { StreamsAppSearchBar } from '../streams_app_search_bar';
import { DocumentsColumn } from './documents_column';
import { useStreamsAppRouter } from '../../hooks/use_streams_app_router';
import { RetentionColumn } from './retention_column';
import {
  NAME_COLUMN_HEADER,
  DOCUMENTS_COLUMN_HEADER,
  RETENTION_COLUMN_HEADER,
  STREAMS_TABLE_SEARCH_ARIA_LABEL,
  STREAMS_TABLE_CAPTION_ARIA_LABEL,
  RETENTION_COLUMN_HEADER_ARIA_LABEL,
  NO_STREAMS_MESSAGE,
} from './translations';

export function StreamsTreeTable({
  loading,
  streams = [],
}: {
  streams?: ListStreamDetail[];
  loading?: boolean;
}) {
  const router = useStreamsAppRouter();
  const { euiTheme } = useEuiTheme();

  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortableField>('nameSortKey');
  const [sortDirection, setSortDirection] = useState<Direction>('asc');
  // Collapsed state: Set of collapsed node names
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [pagination, setPagination] = useState<{ pageIndex: number; pageSize: number }>({
    pageIndex: 0,
    pageSize: 5,
  });

  const enrichedStreams = React.useMemo(() => {
    const ingestStreams = streams.filter((stream) =>
      Streams.ingest.all.Definition.is(stream.stream)
    );
    const streamList = shouldComposeTree(sortField, searchQuery)
      ? asTrees(ingestStreams)
      : ingestStreams;
    return streamList.map(enrichStream);
  }, [sortField, searchQuery, streams]);

  // Helper: flatten tree, skipping children of collapsed nodes
  const flattenTreeWithCollapse = React.useCallback(
    (rows: ReturnType<typeof buildStreamRows>) => {
      if (!shouldComposeTree(sortField, searchQuery)) return rows;
      const result: typeof rows = [];
      const collapsedSet = collapsed;
      for (const row of rows) {
        // If any ancestor is collapsed, skip this row
        const segments = row.stream.name.split('.');
        let skip = false;
        for (let i = 1; i < segments.length; ++i) {
          const ancestor = segments.slice(0, i).join('.');
          if (collapsedSet.has(ancestor)) {
            skip = true;
            break;
          }
        }
        if (!skip) result.push(row);
      }
      return result;
    },
    [collapsed, sortField, searchQuery]
  );

  const allRows = React.useMemo(
    () => buildStreamRows(enrichedStreams, sortField, sortDirection),
    [enrichedStreams, sortField, sortDirection]
  );

  // Only pass filtered rows if tree mode is active
  const items = React.useMemo(
    () => (shouldComposeTree(sortField, searchQuery) ? flattenTreeWithCollapse(allRows) : allRows),
    [allRows, flattenTreeWithCollapse, sortField, searchQuery]
  );

  const handleQueryChange: EuiSearchBarProps['onChange'] = ({ query }) => {
    if (query) setSearchQuery(query.text);
  };

  const handleTableChange = ({ sort, page }: CriteriaWithPagination<TableRow>) => {
    if (sort) {
      setSortField(sort.field as SortableField);
      setSortDirection(sort.direction);
    }
    if (page) {
      setPagination({
        pageIndex: page.index,
        pageSize: page.size,
      });
    }
  };

  const handleToggleCollapse = (name: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  const sorting = {
    sort: {
      field: sortField,
      direction: sortDirection,
    },
  };

  // Reset pagination if streams change (e.g., after search/filter)
  React.useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [streams, searchQuery, sortField, sortDirection]);

  return (
    <EuiInMemoryTable<TableRow>
      loading={loading}
      columns={[
        {
          field: 'nameSortKey',
          name: NAME_COLUMN_HEADER,
          sortable: (row: TableRow) => row.rootNameSortKey,
          dataType: 'string',
          render: (_: unknown, item: TableRow) => {
            // Only show expand/collapse if tree mode is active and has children
            const treeMode = shouldComposeTree(sortField, searchQuery);
            const hasChildren = !!item.children && item.children.length > 0;
            const isCollapsed = collapsed.has(item.stream.name);
            return (
              <EuiFlexGroup
                alignItems="center"
                gutterSize="s"
                responsive={false}
                className={css`
                  margin-left: ${item.level * parseInt(euiTheme.size.xl, 10)}px;
                `}
              >
                {treeMode && item.children && hasChildren && (
                  <EuiFlexItem grow={false}>
                    <EuiIcon
                      type={isCollapsed ? 'arrowRight' : 'arrowDown'}
                      color="text"
                      size="m"
                      aria-label={i18n.translate(
                        isCollapsed
                          ? 'xpack.streams.streamsTreeTable.collapsedNodeAriaLabel'
                          : 'xpack.streams.streamsTreeTable.expandedNodeAriaLabel',
                        {
                          defaultMessage: isCollapsed
                            ? 'Collapsed node with {childCount} children'
                            : 'Expanded node with {childCount} children',
                          values: { childCount: item.children.length },
                        }
                      )}
                      onClick={(e: React.MouseEvent) => {
                        e.stopPropagation();
                        handleToggleCollapse(item.stream.name);
                      }}
                      tabIndex={0}
                      role="button"
                      onKeyDown={(e: React.KeyboardEvent) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleToggleCollapse(item.stream.name);
                        }
                      }}
                      data-test-subj="streamsAppStreamNodeToggle"
                      style={{ cursor: 'pointer' }}
                    />
                  </EuiFlexItem>
                )}
                {treeMode && !hasChildren && (
                  <EuiFlexItem grow={false}>
                    <EuiIcon type="empty" color="text" size="m" aria-hidden="true" />
                  </EuiFlexItem>
                )}
                <EuiFlexItem grow={false}>
                  <EuiLink
                    data-test-subj="streamsAppStreamNodeLink"
                    href={router.link('/{key}', { path: { key: item.stream.name } })}
                  >
                    <EuiHighlight search={searchQuery}>{item.stream.name}</EuiHighlight>
                  </EuiLink>
                </EuiFlexItem>
              </EuiFlexGroup>
            );
          },
        },
        {
          field: 'documentsCount',
          name: DOCUMENTS_COLUMN_HEADER,
          width: '280px',
          sortable: false,
          dataType: 'number',
          render: (_: unknown, item: TableRow) =>
            item.data_stream ? (
              <DocumentsColumn indexPattern={item.stream.name} numDataPoints={25} />
            ) : null,
        },
        {
          field: 'retentionMs',
          name: (
            <span aria-label={RETENTION_COLUMN_HEADER_ARIA_LABEL}>{RETENTION_COLUMN_HEADER}</span>
          ),
          width: '160px',
          align: 'left',
          sortable: (row: TableRow) => row.rootRetentionMs,
          dataType: 'number',
          render: (_: unknown, item: TableRow) => (
            <RetentionColumn
              lifecycle={item.effective_lifecycle!}
              aria-label={i18n.translate('xpack.streams.streamsTreeTable.retentionCellAriaLabel', {
                defaultMessage: 'Retention policy for {name}',
                values: { name: item.stream.name },
              })}
            />
          ),
        },
      ]}
      itemId="name"
      items={items}
      sorting={sorting}
      noItemsMessage={NO_STREAMS_MESSAGE}
      onTableChange={handleTableChange}
      pagination={{
        pageIndex: pagination.pageIndex,
        pageSize: pagination.pageSize,
        pageSizeOptions: [5, 50, 100],
        initialPageSize: 5,
      }}
      search={{
        query: searchQuery,
        onChange: handleQueryChange,
        box: {
          incremental: true,
          'aria-label': STREAMS_TABLE_SEARCH_ARIA_LABEL,
        },
        toolsRight: <StreamsAppSearchBar showDatePicker />,
      }}
      tableCaption={STREAMS_TABLE_CAPTION_ARIA_LABEL}
    />
  );
}
