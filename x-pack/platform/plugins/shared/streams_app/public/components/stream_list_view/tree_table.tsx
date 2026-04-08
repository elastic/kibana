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
  EuiBadge,
  EuiFilterButton,
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiIcon,
  EuiInMemoryTable,
  EuiPopover,
  EuiSelectable,
  useEuiTheme,
  EuiHighlight,
  EuiIconTip,
  EuiButtonIcon,
  EuiTourStep,
  EuiBetaBadge,
  EuiToolTip,
} from '@elastic/eui';
import { css } from '@emotion/css';
import type { ListStreamDetail } from '@kbn/streams-plugin/server/routes/internal/streams/crud/route';
import type { QualityIndicators } from '@kbn/dataset-quality-plugin/common';
import {
  Streams,
  type RootStreamName,
  LOGS_ROOT_STREAM_NAME,
  ROOT_STREAM_NAMES,
  isRoot,
} from '@kbn/streams-schema';
import useAsync from 'react-use/lib/useAsync';
import type { WiredStreamsStatus } from '@kbn/streams-plugin/public';
import { useStreamsTour } from '../streams_tour';
import type { TableRow, SortableField, StreamType } from './utils';
import {
  buildStreamRows,
  asTrees,
  enrichStream,
  shouldComposeTree,
  filterStreamsByQuery,
  filterCollapsedStreamRows,
  getLegacyLogsStatus,
} from './utils';
import { StreamsAppSearchBar } from '../streams_app_search_bar';
import { DocumentsColumn } from './documents_column';
import { IngestionColumn } from './ingestion_column';
import { StorageColumn } from './storage_column';
import { DataQualityColumn } from './data_quality_column';
import { useKibana } from '../../hooks/use_kibana';
import { useStreamsAppRouter } from '../../hooks/use_streams_app_router';
import {
  STREAMS_HISTOGRAM_NUM_DATA_POINTS,
  useStreamDocCountsFetch,
} from '../../hooks/use_streams_doc_counts_fetch';
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
  CPS_DOCUMENTS_WARNING,
  DOCUMENTS_COLUMN_HEADER,
  FAILURE_STORE_PERMISSIONS_ERROR,
  INGESTION_COLUMN_HEADER,
  STORAGE_COLUMN_HEADER,
  DEGRADED_QUALITY_FILTER,
  POOR_QUALITY_FILTER,
  TYPE_FILTER,
  QUERY_BADGE_LABEL,
  DRAFT_BADGE_LABEL,
} from './translations';
import { DeprecatedLogsBadge, DiscoverBadgeButton, QueryStreamBadge } from '../stream_badges';
import { useStreamsAppFetch } from '../../hooks/use_streams_app_fetch';

const datePickerStyle = css`
  .euiFormControlLayout,
  .euiSuperDatePicker button,
  .euiButton {
    height: 40px;
  }
`;

const nameTextTruncationStyle = css`
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
  min-width: 0;
`;

export function StreamsTreeTable({
  loading,
  streams = [],
  canReadFailureStore = false,
  wiredStreamsStatus,
  openFlyout,
}: {
  streams?: ListStreamDetail[];
  canReadFailureStore?: boolean;
  loading?: boolean;
  wiredStreamsStatus?: WiredStreamsStatus;
  openFlyout?: () => void;
}) {
  const router = useStreamsAppRouter();
  const {
    dependencies,
    services: { dataStreamsClient },
  } = useKibana();
  const cpsHasLinkedProjects =
    (dependencies.start.cps?.cpsManager?.getTotalProjectCount() ?? 0) > 1;
  const { rangeFrom, rangeTo } = useTimeRange();
  const { euiTheme } = useEuiTheme();
  const { timeState } = useTimefilter();
  const { getStepPropsByStepId } = useStreamsTour();

  const [searchQuery, setSearchQuery] = useState<Query | undefined>();
  const [sortField, setSortField] = useState<SortableField>('nameSortKey');
  const [sortDirection, setSortDirection] = useState<Direction>('asc');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [pagination, setPagination] = useState<{ pageIndex: number; pageSize: number }>({
    pageIndex: 0,
    pageSize: 25,
  });

  // Filter state
  const [qualityFilters, setQualityFilters] = useState<Set<'degraded' | 'poor'>>(new Set());
  const [typeFilters, setTypeFilters] = useState<Set<StreamType>>(new Set());
  const [isTypePopoverOpen, setIsTypePopoverOpen] = useState(false);

  const { getStreamDocCounts, getStreamHistogram } = useStreamDocCountsFetch({
    groupTotalCountByTimestamp: true,
    canReadFailureStore,
    numDataPoints: STREAMS_HISTOGRAM_NUM_DATA_POINTS,
  });

  const docCountsFetch = getStreamDocCounts();

  const totalDocsResult = useAsync(() => docCountsFetch.docCount, [docCountsFetch]);
  const failedDocsResult = useAsync(() => docCountsFetch.failedDocCount, [docCountsFetch]);
  const degradedDocsResult = useAsync(() => docCountsFetch.degradedDocCount, [docCountsFetch]);

  // Fetch data stream stats for ingestion rate and storage
  const dataStreamStatsFetch = useStreamsAppFetch(
    async ({ signal }) => {
      const client = await dataStreamsClient;
      const { dataStreamsStats } = await client.getDataStreamsStats({
        datasetQuery: '',
        includeCreationDate: true,
      });
      return dataStreamsStats;
    },
    [dataStreamsClient]
  );

  const ingestionByStream = React.useMemo(() => {
    if (!dataStreamStatsFetch.value) return {} as Record<string, number>;
    const now = Date.now();
    return dataStreamStatsFetch.value.reduce((acc, stat) => {
      if (stat.totalDocs && stat.creationDate) {
        const ageSeconds = Math.max(1, (now - stat.creationDate) / 1000);
        acc[stat.name] = stat.totalDocs / ageSeconds;
      }
      return acc;
    }, {} as Record<string, number>);
  }, [dataStreamStatsFetch.value]);

  const storageByStream = React.useMemo(() => {
    if (!dataStreamStatsFetch.value) return {} as Record<string, number>;
    return dataStreamStatsFetch.value.reduce((acc, stat) => {
      if (stat.sizeBytes !== undefined && stat.sizeBytes !== null) {
        acc[stat.name] = stat.sizeBytes;
      }
      return acc;
    }, {} as Record<string, number>);
  }, [dataStreamStatsFetch.value]);

  const statsLoaded = !!dataStreamStatsFetch.value;

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

  const qualityRank: Record<QualityIndicators, number> = {
    poor: 0,
    degraded: 1,
    good: 2,
  };

  const filteredStreams = React.useMemo(() => {
    const freeText = searchQuery?.text?.trim() ?? '';
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

  const allRows = React.useMemo(
    () => buildStreamRows(enrichedStreams, sortField, sortDirection, qualityByStream),
    [enrichedStreams, sortField, sortDirection, qualityByStream]
  );

  // Compute filter counts from allRows
  const degradedCount = React.useMemo(
    () => allRows.filter((r) => r.dataQuality === 'degraded').length,
    [allRows]
  );
  const poorCount = React.useMemo(
    () => allRows.filter((r) => r.dataQuality === 'poor').length,
    [allRows]
  );

  // Apply external filters (quality + type)
  const filteredRows = React.useMemo(() => {
    let rows = allRows;
    if (qualityFilters.size > 0) {
      rows = rows.filter((row) => qualityFilters.has(row.dataQuality as 'degraded' | 'poor'));
    }
    if (typeFilters.size > 0) {
      rows = rows.filter((row) => typeFilters.has(row.type));
    }
    return rows;
  }, [allRows, qualityFilters, typeFilters]);

  const items = React.useMemo(
    () => (shouldComposeTree(sortField) ? flattenTreeWithCollapse(filteredRows) : filteredRows),
    [filteredRows, flattenTreeWithCollapse, sortField]
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

  const toggleQualityFilter = (value: 'degraded' | 'poor') => {
    setQualityFilters((prev) => {
      const next = new Set(prev);
      if (next.has(value)) {
        next.delete(value);
      } else {
        next.add(value);
      }
      return next;
    });
  };

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

  const allExpanded = allExpandableNodeNames.every((name) => !collapsed.has(name));
  const hasExpandable = allExpandableNodeNames.length > 0;

  const handleExpandCollapseAll = () => {
    setCollapsed(() => {
      if (allExpanded) {
        return new Set(allExpandableNodeNames);
      } else {
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

  React.useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [streams, searchQuery, sortField, sortDirection, qualityFilters, typeFilters]);

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

  const isQueryOrDraft = (item: TableRow) => item.type === 'query' || item.isDraft;

  const typeSelectableOptions: Array<{
    label: string;
    key: StreamType;
    checked?: 'on' | undefined;
  }> = [
    { label: 'Classic', key: 'classic', checked: typeFilters.has('classic') ? 'on' : undefined },
    { label: 'Wired', key: 'wired', checked: typeFilters.has('wired') ? 'on' : undefined },
    { label: 'Query', key: 'query', checked: typeFilters.has('query') ? 'on' : undefined },
  ];

  const filterBar = (
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
      {qualityLoaded && canReadFailureStore && (
        <EuiFlexItem grow={false}>
          <EuiFilterGroup>
            <EuiFilterButton
              hasActiveFilters={qualityFilters.has('degraded')}
              numFilters={degradedCount}
              onClick={() => toggleQualityFilter('degraded')}
              data-test-subj="streamsQualityFilterDegraded"
            >
              {DEGRADED_QUALITY_FILTER}
            </EuiFilterButton>
            <EuiFilterButton
              hasActiveFilters={qualityFilters.has('poor')}
              numFilters={poorCount}
              onClick={() => toggleQualityFilter('poor')}
              data-test-subj="streamsQualityFilterPoor"
            >
              {POOR_QUALITY_FILTER}
            </EuiFilterButton>
          </EuiFilterGroup>
        </EuiFlexItem>
      )}
      <EuiFlexItem grow={false}>
        <EuiFilterGroup>
          <EuiPopover
            aria-label={TYPE_FILTER}
            button={
              <EuiFilterButton
                iconType="arrowDown"
                hasActiveFilters={typeFilters.size > 0}
                numActiveFilters={typeFilters.size}
                onClick={() => setIsTypePopoverOpen((open) => !open)}
                data-test-subj="streamsTypeFilter"
              >
                {TYPE_FILTER}
              </EuiFilterButton>
            }
            isOpen={isTypePopoverOpen}
            closePopover={() => setIsTypePopoverOpen(false)}
            panelPaddingSize="none"
          >
            <EuiSelectable
              options={typeSelectableOptions}
              onChange={(newOptions) => {
                const selected = new Set<StreamType>();
                for (const opt of newOptions) {
                  if (opt.checked === 'on') {
                    selected.add(opt.key as StreamType);
                  }
                }
                setTypeFilters(selected);
              }}
            >
              {(list) => <div style={{ width: 200 }}>{list}</div>}
            </EuiSelectable>
          </EuiPopover>
        </EuiFilterGroup>
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
                      type={isCollapsed ? 'chevronSingleRight' : 'chevronSingleDown'}
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
                <EuiFlexGroup
                  alignItems="center"
                  gutterSize="s"
                  responsive
                  wrap
                  className={nameTextTruncationStyle}
                >
                  {item.type === 'query' && (
                    <EuiFlexItem grow={false}>
                      <EuiBadge iconType="code" color="accent">
                        {QUERY_BADGE_LABEL}
                      </EuiBadge>
                    </EuiFlexItem>
                  )}
                  {item.isDraft && (
                    <EuiFlexItem grow={false}>
                      <EuiBadge iconType="dashedCircle" color="default">
                        {DRAFT_BADGE_LABEL}
                      </EuiBadge>
                    </EuiFlexItem>
                  )}
                  <EuiFlexItem grow={false} className={nameTextTruncationStyle}>
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
                      className={nameTextTruncationStyle}
                    >
                      <EuiHighlight search={searchQuery?.text ?? ''}>
                        {item.stream.name}
                      </EuiHighlight>
                    </EuiLink>
                  </EuiFlexItem>
                  {item.stream.name === LOGS_ROOT_STREAM_NAME && (
                    <EuiFlexItem grow={false}>
                      <DeprecatedLogsBadge
                        openFlyout={openFlyout}
                        hasNewStreams={getLegacyLogsStatus(wiredStreamsStatus).hasNewStreams}
                      />
                    </EuiFlexItem>
                  )}
                  {Streams.QueryStream.Definition.is(item.stream) && <QueryStreamBadge />}
                  {ROOT_STREAM_NAMES.includes(item.stream.name as RootStreamName) && (
                    <EuiBetaBadge
                      tooltipContent={i18n.translate('xpack.streams.technicalPreviewTooltip', {
                        defaultMessage:
                          'This feature is in technical preview. We are working on it...',
                      })}
                      label={i18n.translate('xpack.streams.technicalPreviewLabel', {
                        defaultMessage: 'Technical preview',
                      })}
                      iconType="flask"
                      size="s"
                      css={{ display: 'block' }}
                    />
                  )}
                  {isRoot(item.stream.name) &&
                    item.stream.name !== LOGS_ROOT_STREAM_NAME &&
                    !item.data_stream && (
                      <EuiToolTip
                        position="right"
                        content={i18n.translate(
                          'xpack.streams.streamsTable.pendingDataStream.tooltip',
                          {
                            defaultMessage:
                              'This stream is configured but has no backing data stream yet. Start sending data and the data stream will be created automatically on first ingest.',
                          }
                        )}
                      >
                        <EuiBadge color="default">
                          {i18n.translate('xpack.streams.streamsTable.pendingDataStream.label', {
                            defaultMessage: 'Pending',
                          })}
                        </EuiBadge>
                      </EuiToolTip>
                    )}
                </EuiFlexGroup>
              </EuiFlexGroup>
            );
          },
        },
        {
          field: 'documentsCount',
          name: (
            <EuiFlexGroup alignItems="center" gutterSize="m">
              {cpsHasLinkedProjects && (
                <EuiIconTip
                  content={CPS_DOCUMENTS_WARNING}
                  type="info"
                  size="s"
                  data-test-subj="cpsDocumentsWarningTip"
                />
              )}
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
                numDataPoints={STREAMS_HISTOGRAM_NUM_DATA_POINTS}
              />
            ) : null,
        },
        {
          field: 'ingestionRate',
          name: INGESTION_COLUMN_HEADER,
          width: '112px',
          sortable: statsLoaded
            ? (row: TableRow) => ingestionByStream[row.stream.name] ?? 0
            : false,
          align: 'right',
          dataType: 'number',
          render: (_: unknown, item: TableRow) => (
            <IngestionColumn
              ingestionRate={
                ingestionByStream[item.stream.name] !== undefined
                  ? Math.round(ingestionByStream[item.stream.name] * 10) / 10
                  : undefined
              }
              isLoading={dataStreamStatsFetch.loading}
            />
          ),
        },
        {
          field: 'storageBytes',
          name: STORAGE_COLUMN_HEADER,
          width: '120px',
          sortable: statsLoaded ? (row: TableRow) => storageByStream[row.stream.name] ?? 0 : false,
          align: 'right',
          dataType: 'number',
          render: (_: unknown, item: TableRow) => (
            <StorageColumn
              storageBytes={storageByStream[item.stream.name]}
              isLoading={dataStreamStatsFetch.loading}
            />
          ),
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
          width: '112px',
          align: 'left',
          sortable: qualityLoaded
            ? (item: TableRow) => qualityRank[item.dataQuality as QualityIndicators]
            : false,
          dataType: 'string',
          render: (_: unknown, item: TableRow) => {
            if (isQueryOrDraft(item)) return null;
            return item.data_stream ? (
              <DataQualityColumn
                streamName={item.stream.name}
                quality={item.dataQuality as QualityIndicators}
                isLoading={
                  totalDocsResult.loading || failedDocsResult.loading || degradedDocsResult.loading
                }
              />
            ) : (
              '-'
            );
          },
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
          render: (_: unknown, item: TableRow) => {
            if (isQueryOrDraft(item)) return null;
            return (
              <RetentionColumn
                lifecycle={item.effective_lifecycle!}
                streamName={item.stream.name}
                dataTestSubj={`retentionColumn-${item.stream.name}`}
              />
            );
          },
        },
        {
          field: 'definition',
          name: 'Actions',
          width: '60px',
          align: 'left',
          sortable: false,
          dataType: 'string',
          render: (_: unknown, item: TableRow) => {
            const hasDataStream =
              !!item.data_stream || Streams.QueryStream.Definition.is(item.stream);
            if (Streams.QueryStream.Definition.is(item.stream)) {
              return <DiscoverBadgeButton hasDataStream={hasDataStream} stream={item.stream} />;
            }
            return (
              <DiscoverBadgeButton
                hasDataStream={hasDataStream}
                indexMode={item.data_stream?.index_mode ?? 'standard'}
                stream={item.stream}
              />
            );
          },
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
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive wrap>
            <EuiFlexItem grow={false}>{filterBar}</EuiFlexItem>
            <EuiFlexItem grow={false}>
              <div className={datePickerStyle}>
                <StreamsAppSearchBar showDatePicker />
              </div>
            </EuiFlexItem>
          </EuiFlexGroup>
        ),
      }}
      tableCaption={STREAMS_TABLE_CAPTION_ARIA_LABEL}
    />
  );
}
