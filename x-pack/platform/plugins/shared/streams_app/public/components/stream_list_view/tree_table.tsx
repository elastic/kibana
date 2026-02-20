/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import type { Direction, EuiSearchBarProps, CriteriaWithPagination, Query } from '@elastic/eui';
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
  EuiTourStep,
} from '@elastic/eui';
import { css } from '@emotion/css';
import type { ListStreamDetail } from '@kbn/streams-plugin/server/routes/internal/streams/crud/route';
import type { QualityIndicators } from '@kbn/dataset-quality-plugin/common';
import { Streams } from '@kbn/streams-schema';
import useAsync from 'react-use/lib/useAsync';
import { useStreamsTour } from '../streams_tour';
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
import { useTimeRange } from '../../hooks/use_time_range';
import { RetentionColumn } from './retention_column';
import { calculateDataQuality } from '../../util/calculate_data_quality';
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
import { DiscoverBadgeButton, QueryStreamBadge } from '../stream_badges';

const datePickerStyle = css`
  .euiFormControlLayout,
  .euiSuperDatePicker button,
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
  const { rangeFrom, rangeTo } = useTimeRange();
  const { euiTheme } = useEuiTheme();
  const { timeState } = useTimefilter();
  const { getStepPropsByStepId } = useStreamsTour();

  const [searchQuery, setSearchQuery] = useState<Query | undefined>();
  const [sortField, setSortField] = useState<SortableField>('nameSortKey');
  const [sortDirection, setSortDirection] = useState<Direction>('asc');
  // Collapsed state: Set of collapsed node names
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [pagination, setPagination] = useState<{ pageIndex: number; pageSize: number }>({
    pageIndex: 0,
    pageSize: 25,
  });

  const numDataPoints = 25;

  const { getStreamDocCounts, getStreamHistogram } = useStreamDocCountsFetch({
    groupTotalCountByTimestamp: true,
    canReadFailureStore,
    numDataPoints,
  });

  const docCountsFetch = getStreamDocCounts();

  const totalDocsResult = useAsync(() => docCountsFetch.docCount, [docCountsFetch]);
  const failedDocsResult = useAsync(() => docCountsFetch.failedDocCount, [docCountsFetch]);
  const degradedDocsResult = useAsync(() => docCountsFetch.degradedDocCount, [docCountsFetch]);

  const docsByStream = React.useMemo(() => {
    if (!totalDocsResult.value) {
      return {} as Record<string, number>;
    }
    return totalDocsResult.value.reduce((acc, { stream, count }) => {
      acc[stream] = count;
      return acc;
    }, {} as Record<string, number>);
  }, [totalDocsResult.value]);

  const failedByStream = React.useMemo(() => {
    if (!failedDocsResult.value) {
      return {} as Record<string, number>;
    }
    return failedDocsResult.value.reduce((acc, { stream, count }) => {
      acc[stream] = count;
      return acc;
    }, {} as Record<string, number>);
  }, [failedDocsResult.value]);

  const degradedByStream = React.useMemo(() => {
    if (!degradedDocsResult.value) {
      return {} as Record<string, number>;
    }
    return degradedDocsResult.value.reduce((acc, { stream, count }) => {
      acc[stream] = count;
      return acc;
    }, {} as Record<string, number>);
  }, [degradedDocsResult.value]);

  const qualityByStream = React.useMemo(() => {
    const qualities: Record<string, QualityIndicators> = {};
    const datasets = new Set([
      ...Object.keys(docsByStream),
      ...Object.keys(degradedByStream),
      ...Object.keys(failedByStream),
    ]);

    datasets.forEach((dataset) => {
      const totalDocs = docsByStream[dataset] ?? 0;
      const degradedDocs = degradedByStream[dataset] ?? 0;
      const failedDocs = failedByStream[dataset] ?? 0;

      qualities[dataset] = calculateDataQuality({
        totalDocs,
        degradedDocs,
        failedDocs,
      });
    });

    return qualities;
  }, [docsByStream, degradedByStream, failedByStream]);

  const docCountsLoaded = !!totalDocsResult.value;
  const qualityLoaded =
    !!totalDocsResult.value && !!degradedDocsResult.value && !!failedDocsResult.value;

  // Sort order for data quality
  const qualityRank: Record<QualityIndicators, number> = {
    poor: 0,
    degraded: 1,
    good: 2,
  };

  // Filter streams by query, including ancestors of matches
  const filteredStreams = React.useMemo(() => {
    const dataQualityPattern = /dataQuality:\((.*)\)/;
    const freeText = searchQuery?.text?.replace(dataQualityPattern, '').trim() ?? '';
    return filterStreamsByQuery(streams, freeText);
  }, [streams, searchQuery]);

  const enrichedStreams = React.useMemo(() => {
    const streamList = shouldComposeTree(sortField) ? asTrees(filteredStreams) : filteredStreams;
    return streamList.map(enrichStream);
  }, [sortField, filteredStreams]);

  const flattenTreeWithCollapse = React.useCallback(
    (rows: TableRow[]) => filterCollapsedStreamRows(rows, collapsed, sortField),
    [collapsed, sortField]
  );

  const allRows = React.useMemo(() => {
    const rows = buildStreamRows(enrichedStreams, sortField, sortDirection, qualityByStream);
    const qualityFiters =
      searchQuery?.ast?.clauses.filter(
        (clause) => clause.type === 'field' && clause.field === 'dataQuality'
      ) ?? [];
    return qualityFiters.length > 0
      ? rows.filter((row) =>
          qualityFiters.some(
            (filter) =>
              'value' in filter &&
              typeof filter.value === 'string' &&
              filter.value.includes(row.dataQuality)
          )
        )
      : rows;
  }, [enrichedStreams, sortField, sortDirection, qualityByStream, searchQuery?.ast?.clauses]);

  // Only pass filtered rows if tree mode is active
  const items = React.useMemo(
    () => (shouldComposeTree(sortField) ? flattenTreeWithCollapse(allRows) : allRows),
    [allRows, flattenTreeWithCollapse, sortField]
  );

  const handleQueryChange: EuiSearchBarProps['onChange'] = ({ query }) => {
    if (query) setSearchQuery(query);
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

  const streamsListStepProps = getStepPropsByStepId('streams_list');

  const nameColumnHeader = (
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
      {shouldComposeTree(sortField) && hasExpandable && (
        <EuiFlexItem grow={false}>{expandCollapseAllButton}</EuiFlexItem>
      )}
      <EuiFlexItem>
        {streamsListStepProps ? (
          <EuiTourStep
            step={streamsListStepProps.step}
            stepsTotal={streamsListStepProps.stepsTotal}
            title={streamsListStepProps.title}
            subtitle={streamsListStepProps.subtitle}
            content={streamsListStepProps.content}
            anchorPosition={streamsListStepProps.anchorPosition}
            offset={streamsListStepProps.offset}
            maxWidth={streamsListStepProps.maxWidth}
            isStepOpen={streamsListStepProps.isStepOpen}
            footerAction={streamsListStepProps.footerAction}
            onFinish={streamsListStepProps.onFinish}
          >
            <span>{NAME_COLUMN_HEADER}</span>
          </EuiTourStep>
        ) : (
          <span>{NAME_COLUMN_HEADER}</span>
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  return (
    <EuiInMemoryTable<TableRow>
      loading={loading}
      data-test-subj="streamsTable"
      columns={[
        {
          field: 'nameSortKey',
          name: nameColumnHeader,
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
                      aria-label={
                        isCollapsed
                          ? i18n.translate(
                              'xpack.streams.streamsTreeTable.collapsedNodeAriaLabel',
                              {
                                defaultMessage: 'Collapsed node with {childCount} children',
                                values: { childCount: item.children.length },
                              }
                            )
                          : i18n.translate('xpack.streams.streamsTreeTable.expandedNodeAriaLabel', {
                              defaultMessage: 'Expanded node with {childCount} children',
                              values: { childCount: item.children.length },
                            })
                      }
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
                <EuiFlexGroup alignItems="center" gutterSize="s" responsive wrap>
                  <EuiLink
                    data-test-subj={`streamsNameLink-${item.stream.name}`}
                    href={router.link('/{key}', {
                      path: { key: item.stream.name },
                      query: { rangeFrom, rangeTo },
                    })}
                    onClick={(e: React.MouseEvent) => {
                      e.preventDefault();
                      router.push('/{key}', {
                        path: { key: item.stream.name },
                        query: { rangeFrom, rangeTo },
                      });
                    }}
                  >
                    <EuiHighlight search={searchQuery?.text ?? ''}>{item.stream.name}</EuiHighlight>
                  </EuiLink>
                  {Streams.QueryStream.Definition.is(item.stream) && <QueryStreamBadge />}
                </EuiFlexGroup>
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
          sortable: docCountsLoaded ? (row: TableRow) => docsByStream[row.stream.name] ?? 0 : false,
          align: 'right',
          dataType: 'number',
          render: (_: unknown, item: TableRow) =>
            item.data_stream ? (
              <DocumentsColumn
                indexPattern={item.stream.name}
                histogramQueryFetch={getStreamHistogram(item.stream.name)}
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
          sortable: qualityLoaded
            ? (item: TableRow) => qualityRank[item.dataQuality as QualityIndicators]
            : false,
          dataType: 'string',
          render: (_: unknown, item: TableRow) =>
            item.data_stream ? (
              <DataQualityColumn
                streamName={item.stream.name}
                quality={item.dataQuality as QualityIndicators}
                isLoading={
                  totalDocsResult.loading || failedDocsResult.loading || degradedDocsResult.loading
                }
              />
            ) : (
              '-'
            ),
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
              dataTestSubj={`retentionColumn-${item.stream.name}`}
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
              hasDataStream={!!item.data_stream || Streams.QueryStream.Definition.is(item.stream)}
              indexMode={item.data_stream?.index_mode}
              stream={item.stream}
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
        filters:
          qualityLoaded && canReadFailureStore
            ? [
                {
                  type: 'field_value_selection',
                  name: i18n.translate('xpack.streams.streamsTreeTable.dataQualityFilter.label', {
                    defaultMessage: 'Data quality',
                  }),
                  field: 'dataQuality',
                  multiSelect: 'or',
                  options: [
                    {
                      value: 'good',
                      name: i18n.translate(
                        'xpack.streams.streamsTreeTable.dataQualityFilter.goodLabel',
                        { defaultMessage: 'Good' }
                      ),
                    },
                    {
                      value: 'degraded',
                      name: i18n.translate(
                        'xpack.streams.streamsTreeTable.dataQualityFilter.degradedLabel',
                        { defaultMessage: 'Degraded' }
                      ),
                    },
                    {
                      value: 'poor',
                      name: i18n.translate(
                        'xpack.streams.streamsTreeTable.dataQualityFilter.poorLabel',
                        { defaultMessage: 'Poor' }
                      ),
                    },
                  ],
                },
              ]
            : [],
      }}
      tableCaption={STREAMS_TABLE_CAPTION_ARIA_LABEL}
    />
  );
}
