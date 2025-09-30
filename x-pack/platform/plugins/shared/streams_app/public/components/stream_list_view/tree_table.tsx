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
  EuiIconTip,
  EuiButtonIcon,
} from '@elastic/eui';
import { css } from '@emotion/css';
import type { ListStreamDetail } from '@kbn/streams-plugin/server/routes/internal/streams/crud/route';
import { Streams } from '@kbn/streams-schema';
import type { TableRow, SortableField } from './utils';
import {
  buildStreamRows,
  asTrees,
  enrichStream,
  shouldComposeTree,
  filterStreamsByQuery,
  filterCollapsedStreamRows,
} from './utils';
import { StreamsAppSearchBar } from '../streams_app_search_bar';
import { DocumentsColumn } from './documents_column';
import { DataQualityColumn } from './data_quality_column';
import { useStreamsAppRouter } from '../../hooks/use_streams_app_router';
import { useStreamDocCountsFetch } from '../../hooks/use_streams_doc_counts_fetch';
import { useTimefilter } from '../../hooks/use_timefilter';
import { RetentionColumn } from './retention_column';
import {
  NAME_COLUMN_HEADER,
  RETENTION_COLUMN_HEADER,
  STREAMS_TABLE_SEARCH_ARIA_LABEL,
  STREAMS_TABLE_CAPTION_ARIA_LABEL,
  RETENTION_COLUMN_HEADER_ARIA_LABEL,
  NO_STREAMS_MESSAGE,
  DATA_QUALITY_COLUMN_HEADER,
  DOCUMENTS_COLUMN_HEADER,
  FAILURE_STORE_PERMISSIONS_ERROR,
} from './translations';
import { DiscoverBadgeButton } from '../stream_badges';

const datePickerStyle = css`
  .euiFormControlLayout {
    height: 40px;
  }
  .euiButton {
    height: 40px;
  }
`;

export function StreamsTreeTable({
  loading,
  streams = [],
  canReadFailureStore = false,
}: {
  streams?: ListStreamDetail[];
  canReadFailureStore?: boolean;
  loading?: boolean;
}) {
  const router = useStreamsAppRouter();
  const { euiTheme } = useEuiTheme();
  const { timeState } = useTimefilter();

  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortableField>('nameSortKey');
  const [sortDirection, setSortDirection] = useState<Direction>('asc');
  // Collapsed state: Set of collapsed node names
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [pagination, setPagination] = useState<{ pageIndex: number; pageSize: number }>({
    pageIndex: 0,
    pageSize: 25,
  });

  // Filter streams by query, including ancestors of matches
  const filteredStreams = React.useMemo(
    () =>
      filterStreamsByQuery(
        streams.filter((stream) => Streams.ingest.all.Definition.is(stream.stream)),
        searchQuery
      ),
    [streams, searchQuery]
  );

  const enrichedStreams = React.useMemo(() => {
    const streamList = shouldComposeTree(sortField) ? asTrees(filteredStreams) : filteredStreams;
    return streamList.map(enrichStream);
  }, [sortField, filteredStreams]);

  const flattenTreeWithCollapse = React.useCallback(
    (rows: TableRow[]) => filterCollapsedStreamRows(rows, collapsed, sortField),
    [collapsed, sortField]
  );

  const allRows = React.useMemo(
    () => buildStreamRows(enrichedStreams, sortField, sortDirection),
    [enrichedStreams, sortField, sortDirection]
  );

  // Only pass filtered rows if tree mode is active
  const items = React.useMemo(
    () => (shouldComposeTree(sortField) ? flattenTreeWithCollapse(allRows) : allRows),
    [allRows, flattenTreeWithCollapse, sortField]
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

  // Compute all expandable node names for expand/collapse all
  const allExpandableNodeNames = React.useMemo(() => {
    const names: string[] = [];
    const collect = (rows: TableRow[]) => {
      for (const row of rows) {
        if (row.children && row.children.length > 0) {
          names.push(row.stream.name);
        }
      }
    };
    collect(allRows);
    return names;
  }, [allRows]);

  // Determine if all are expanded or not
  const allExpanded = allExpandableNodeNames.every((name) => !collapsed.has(name));
  const hasExpandable = allExpandableNodeNames.length > 0;

  const handleExpandCollapseAll = () => {
    setCollapsed((prev) => {
      if (allExpanded) {
        // Collapse all
        return new Set(allExpandableNodeNames);
      } else {
        // Expand all
        return new Set();
      }
    });
  };

  const numDataPoints = 25;

  const { getStreamDocCounts } = useStreamDocCountsFetch({
    groupTotalCountByTimestamp: true,
    numDataPoints,
    canReadFailureStore,
  });

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

  // Expand/Collapse all button for the name column header
  const expandCollapseAllButton = (
    <EuiButtonIcon
      size="xs"
      iconType={allExpanded ? 'fold' : 'unfold'}
      color="text"
      onClick={(e: React.MouseEvent) => {
        e.stopPropagation();
        handleExpandCollapseAll();
      }}
      data-test-subj={`streams${allExpanded ? 'Collapse' : 'Expand'}AllButton`}
      aria-label={
        allExpanded
          ? i18n.translate('xpack.streams.streamsTreeTable.collapseAll', {
              defaultMessage: 'Collapse all',
            })
          : i18n.translate('xpack.streams.streamsTreeTable.expandAll', {
              defaultMessage: 'Expand all',
            })
      }
    />
  );

  return (
    <EuiInMemoryTable<TableRow>
      loading={loading}
      data-test-subj="streamsTable"
      columns={[
        {
          field: 'nameSortKey',
          name: (
            <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
              {shouldComposeTree(sortField) && hasExpandable && (
                <EuiFlexItem grow={false}>{expandCollapseAllButton}</EuiFlexItem>
              )}
              <EuiFlexItem>{NAME_COLUMN_HEADER}</EuiFlexItem>
            </EuiFlexGroup>
          ),
          sortable: (row: TableRow) => row.rootNameSortKey,
          dataType: 'string',
          render: (_: unknown, item: TableRow) => {
            // Only show expand/collapse if tree mode is active and has children
            const treeMode = shouldComposeTree(sortField);
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
                      data-test-subj={`${isCollapsed ? 'expand' : 'collapse'}Button-${
                        item.stream.name
                      }`}
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
                    data-test-subj={`streamsNameLink-${item.stream.name}`}
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
          name: (
            <EuiFlexGroup alignItems="center" gutterSize="s">
              {DOCUMENTS_COLUMN_HEADER}
              {!canReadFailureStore && (
                <EuiIconTip
                  content={FAILURE_STORE_PERMISSIONS_ERROR}
                  type="warning"
                  color="warning"
                  size="s"
                />
              )}
            </EuiFlexGroup>
          ),
          width: '180px',
          sortable: false,
          align: 'right',
          dataType: 'number',
          render: (_: unknown, item: TableRow) =>
            item.data_stream ? (
              <DocumentsColumn
                indexPattern={item.stream.name}
                histogramQueryFetch={getStreamDocCounts(item.stream.name)}
                timeState={timeState}
                numDataPoints={numDataPoints}
              />
            ) : null,
        },
        {
          field: 'dataQuality',
          name: (
            <EuiFlexGroup alignItems="center" gutterSize="s">
              {DATA_QUALITY_COLUMN_HEADER}
              {!canReadFailureStore && (
                <EuiIconTip
                  content={FAILURE_STORE_PERMISSIONS_ERROR}
                  type="warning"
                  color="warning"
                  size="s"
                />
              )}
            </EuiFlexGroup>
          ),
          width: '150px',
          sortable: false,
          dataType: 'number',
          render: (_: unknown, item: TableRow) =>
            item.data_stream ? (
              <DataQualityColumn histogramQueryFetch={getStreamDocCounts(item.stream.name)} />
            ) : null,
        },
        {
          field: 'retentionMs',
          name: (
            <span aria-label={RETENTION_COLUMN_HEADER_ARIA_LABEL}>{RETENTION_COLUMN_HEADER}</span>
          ),
          align: 'left',
          sortable: (row: TableRow) => row.rootRetentionMs,
          dataType: 'number',
          width: '220px',
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
        {
          field: 'definition',
          name: 'Actions',
          width: '60px',
          align: 'left',
          sortable: false,
          dataType: 'string',
          render: (_: unknown, item: TableRow) => (
            <DiscoverBadgeButton
              definition={
                {
                  stream: item.stream,
                  data_stream_exists: !!item.data_stream,
                } as Streams.ingest.all.GetResponse
              }
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
        initialPageSize: 25,
        pageSizeOptions: [25, 50, 100],
        pageIndex: pagination.pageIndex,
        pageSize: pagination.pageSize,
      }}
      executeQueryOptions={{ enabled: false }}
      search={{
        query: searchQuery,
        onChange: handleQueryChange,
        box: {
          incremental: true,
          'aria-label': STREAMS_TABLE_SEARCH_ARIA_LABEL,
        },
        toolsRight: (
          <div className={datePickerStyle}>
            <StreamsAppSearchBar showDatePicker />
          </div>
        ),
      }}
      tableCaption={STREAMS_TABLE_CAPTION_ARIA_LABEL}
    />
  );
}
