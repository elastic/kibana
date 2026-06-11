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
  EuiBadge,
  EuiBetaBadge,
  EuiToolTip,
  EuiText,
  EuiContextMenuPanel,
  EuiContextMenuItem,
  EuiPopover,
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
  isDraftStream,
} from '@kbn/streams-schema';
import useAsync from 'react-use/lib/useAsync';
import type { WiredStreamsStatus } from '@kbn/streams-plugin/public';
import { useStreamsTour } from '../streams_tour';
import type { TableRow, SortableField } from './utils';
import {
  buildStreamRows,
  asTrees,
  enrichStream,
  shouldComposeTree,
  filterStreamsByQuery,
  filterCollapsedStreamRows,
  getLegacyLogsStatus,
} from './utils';
import { DocumentsColumn } from './documents_column';
import { DataQualityColumn } from './data_quality_column';
import { DestinationActionsIcon } from './destination_actions_icon';
import { DestinationFlyout } from './destination_flyout';
import { StreamsListTableTools } from './streams_list_table_tools';
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
  STORAGE_SIZE_COLUMN_HEADER,
  NEW_DESTINATION_BUTTON_LABEL,
  INTERNAL_BADGE_LABEL,
  EXTERNAL_BADGE_LABEL,
  MANAGED_BADGE_LABEL,
} from './translations';
import {
  DeprecatedLogsBadge,
  DiscoverBadgeButton,
  DraftStreamBadge,
  QueryStreamBadge,
} from '../stream_badges';
import { getDestinationMockMetadata } from './destination_mock_metadata';
import { formatBytes } from '../stream_management/data_management/stream_detail_lifecycle/helpers/format_bytes';

/**
 * Prototype tags row shown under the destination name (internal/external,
 * managed, plus mocked tags). Mirrors the design mockup.
 */
const TAG_BADGE_COLORS: Record<string, string> = {
  tag1: 'accent',
  tag2: 'neutral',
};

const DestinationTags = ({ streamName }: { streamName: string }) => {
  const meta = getDestinationMockMetadata(streamName);
  return (
    <EuiFlexGroup
      gutterSize="xs"
      responsive={false}
      wrap
      alignItems="center"
      className={css`
        height: 20px;
        padding-top: 4px;
        padding-bottom: 4px;
      `}
    >
      <EuiFlexItem grow={false}>
        <EuiBadge color="hollow">
          {meta.isInternal ? INTERNAL_BADGE_LABEL : EXTERNAL_BADGE_LABEL}
        </EuiBadge>
      </EuiFlexItem>
      {meta.isManaged && (
        <EuiFlexItem grow={false}>
          <EuiBadge color="hollow" iconType="logoElastic">
            {MANAGED_BADGE_LABEL}
          </EuiBadge>
        </EuiFlexItem>
      )}
      {meta.tags.map((tag) => (
        <EuiFlexItem grow={false} key={tag}>
          <EuiBadge color={TAG_BADGE_COLORS[tag] ?? 'default'}>{tag}</EuiBadge>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};

/**
 * Row-level actions shown at the end of each destination row, matching the
 * design mockup: the existing Discover action plus an overflow menu.
 */
const RowActions = ({
  streamName,
  manageHref,
  discoverNode,
}: {
  streamName: string;
  manageHref: string;
  discoverNode: React.ReactNode;
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  return (
    <EuiFlexGroup gutterSize="xs" responsive={false} alignItems="center" justifyContent="flexEnd">
      <EuiFlexItem grow={false}>{discoverNode}</EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiPopover
          isOpen={isMenuOpen}
          closePopover={() => setIsMenuOpen(false)}
          anchorPosition="downRight"
          panelPaddingSize="none"
          button={
            <EuiToolTip
              position="top"
              content={i18n.translate(
                'xpack.streams.streamsTreeTable.rowActions.viewOnCanvasTooltip',
                {
                  defaultMessage: 'View on Streams Canvas',
                }
              )}
            >
              <EuiButtonIcon
                iconType={DestinationActionsIcon}
                color="primary"
                onClick={() => setIsMenuOpen((open) => !open)}
                data-test-subj={`destinationActionsButton-${streamName}`}
                aria-label={i18n.translate('xpack.streams.streamsTreeTable.rowActionsAriaLabel', {
                  defaultMessage: 'Actions for {name}',
                  values: { name: streamName },
                })}
              />
            </EuiToolTip>
          }
        >
          <EuiContextMenuPanel
            items={[
              <EuiContextMenuItem
                key="manage"
                icon="gear"
                href={manageHref}
                onClick={() => setIsMenuOpen(false)}
              >
                {i18n.translate('xpack.streams.streamsTreeTable.rowActions.manage', {
                  defaultMessage: 'Manage destination',
                })}
              </EuiContextMenuItem>,
            ]}
          />
        </EuiPopover>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const TechnicalPreviewBadge = () => (
  <EuiBetaBadge
    tooltipContent={i18n.translate('xpack.streams.technicalPreviewTooltip', {
      defaultMessage: 'This feature is in technical preview. We are working on it...',
    })}
    label={i18n.translate('xpack.streams.technicalPreviewLabel', {
      defaultMessage: 'Technical preview',
    })}
    iconType="flask"
    size="s"
    css={{ display: 'block' }}
  />
);

export function StreamsTreeTable({
  loading,
  streams = [],
  wiredStreamsStatus,
  openFlyout,
}: {
  streams?: ListStreamDetail[];
  loading?: boolean;
  wiredStreamsStatus?: WiredStreamsStatus;
  openFlyout?: () => void;
}) {
  const router = useStreamsAppRouter();
  const { dependencies } = useKibana();
  const cpsHasLinkedProjects =
    (dependencies.start.cps?.cpsManager?.getTotalProjectCount() ?? 0) > 1;
  const { rangeFrom, rangeTo } = useTimeRange();
  const { euiTheme } = useEuiTheme();
  const { timeState } = useTimefilter();
  const { getStepPropsByStepId } = useStreamsTour();

  const [selectedDestination, setSelectedDestination] = useState<string | undefined>();
  const [searchQuery, setSearchQuery] = useState<Query | undefined>();
  const [sortField, setSortField] = useState<SortableField>('nameSortKey');
  const [sortDirection, setSortDirection] = useState<Direction>('asc');
  // Collapsed state: Set of collapsed node names
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [pagination, setPagination] = useState<{ pageIndex: number; pageSize: number }>({
    pageIndex: 0,
    pageSize: 25,
  });

  const { privilegeMap, hasFailureStoreAccess } = React.useMemo(() => {
    return streams.reduce(
      (acc, streamDetail) => {
        acc.privilegeMap.set(streamDetail.stream.name, streamDetail.privileges.read_failure_store);
        acc.hasFailureStoreAccess ||= streamDetail.privileges.read_failure_store;
        return acc;
      },
      { privilegeMap: new Map<string, boolean>(), hasFailureStoreAccess: false }
    );
  }, [streams]);

  const { getStreamDocCounts, getStreamHistogram } = useStreamDocCountsFetch({
    groupTotalCountByTimestamp: true,
    getCanReadFailureStore: (streamName: string | undefined) =>
      streamName ? privilegeMap.get(streamName) ?? false : hasFailureStoreAccess,
    numDataPoints: STREAMS_HISTOGRAM_NUM_DATA_POINTS,
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
    <>
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
                  direction="column"
                  gutterSize="xs"
                  responsive={false}
                  className={css`
                    min-width: 0;
                  `}
                >
                  <EuiFlexGroup
                    alignItems="center"
                    gutterSize="s"
                    responsive={false}
                    wrap={false}
                    className={css`
                      min-width: 0;
                    `}
                  >
                    <EuiFlexItem
                      grow={true}
                      className={css`
                        min-width: 0;
                      `}
                    >
                      <EuiToolTip
                        position="top"
                        content={item.stream.name}
                        anchorClassName={css`
                          min-width: 0;
                          display: block;
                        `}
                      >
                        <EuiLink
                          data-test-subj={`streamsNameLink-${item.stream.name}`}
                          href={router.link('/{key}', {
                            path: { key: item.stream.name },
                            query: { rangeFrom, rangeTo },
                          })}
                          onClick={(e: React.MouseEvent) => {
                            e.preventDefault();
                            setSelectedDestination(item.stream.name);
                          }}
                          className={css`
                            display: block;
                            min-width: 0;
                            overflow: hidden;
                            text-overflow: ellipsis;
                            white-space: nowrap;
                          `}
                        >
                          <EuiHighlight
                            search={searchQuery?.text ?? ''}
                            className={css`
                              overflow: hidden;
                              text-overflow: ellipsis;
                              white-space: nowrap;
                              display: block;
                            `}
                          >
                            {item.stream.name}
                          </EuiHighlight>
                        </EuiLink>
                      </EuiToolTip>
                    </EuiFlexItem>
                    {(ROOT_STREAM_NAMES.includes(item.stream.name as RootStreamName) ||
                      Streams.QueryStream.Definition.is(item.stream) ||
                      (Streams.WiredStream.Definition.is(item.stream) &&
                        isDraftStream(item.stream))) && (
                      <EuiFlexItem grow={false}>
                        <TechnicalPreviewBadge />
                      </EuiFlexItem>
                    )}
                    {Streams.QueryStream.Definition.is(item.stream) && (
                      <EuiFlexItem grow={false}>
                        <QueryStreamBadge />
                      </EuiFlexItem>
                    )}
                    {isDraftStream(item.stream) && (
                      <EuiFlexItem grow={false}>
                        <DraftStreamBadge />
                      </EuiFlexItem>
                    )}
                    {item.stream.name === LOGS_ROOT_STREAM_NAME &&
                      !Streams.QueryStream.Definition.is(item.stream) && (
                        <EuiFlexItem grow={false}>
                          <DeprecatedLogsBadge
                            openFlyout={openFlyout}
                            hasNewStreams={getLegacyLogsStatus(wiredStreamsStatus).hasNewStreams}
                          />
                        </EuiFlexItem>
                      )}
                    {isRoot(item.stream.name) &&
                      item.stream.name !== LOGS_ROOT_STREAM_NAME &&
                      !item.data_stream &&
                      !Streams.QueryStream.Definition.is(item.stream) && (
                        <EuiFlexItem grow={false}>
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
                        </EuiFlexItem>
                      )}
                  </EuiFlexGroup>
                  <EuiText
                    size="xs"
                    color="subdued"
                    className={css`
                      overflow: hidden;
                      text-overflow: ellipsis;
                      white-space: nowrap;
                    `}
                  >
                    {getDestinationMockMetadata(item.stream.name).description}
                  </EuiText>
                  <DestinationTags streamName={item.stream.name} />
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
              {!hasFailureStoreAccess && (
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
          width: '130px',
          align: 'right',
          dataType: 'number',
          sortable: (row: TableRow) => getDestinationMockMetadata(row.stream.name).ingestionRate,
          render: (_: unknown, item: TableRow) =>
            item.data_stream ? (
              <EuiText size="s">
                {i18n.translate('xpack.streams.streamsTreeTable.ingestionRateValue', {
                  defaultMessage: '{rate} docs/s',
                  values: {
                    rate: getDestinationMockMetadata(item.stream.name).ingestionRate.toFixed(1),
                  },
                })}
              </EuiText>
            ) : (
              '-'
            ),
        },
        {
          field: 'storageSize',
          name: STORAGE_SIZE_COLUMN_HEADER,
          width: '120px',
          align: 'right',
          dataType: 'number',
          sortable: (row: TableRow) => getDestinationMockMetadata(row.stream.name).storageSizeBytes,
          render: (_: unknown, item: TableRow) =>
            item.data_stream ? (
              <EuiText size="s">
                {formatBytes(getDestinationMockMetadata(item.stream.name).storageSizeBytes)}
              </EuiText>
            ) : (
              '-'
            ),
        },
        {
          field: 'dataQuality',
          name: (
            <EuiFlexGroup alignItems="center" gutterSize="s">
              {DATA_QUALITY_COLUMN_HEADER}
              {!hasFailureStoreAccess && (
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
          width: '120px',
          truncateText: true,
          render: (_: unknown, item: TableRow) => {
            if (isDraftStream(item.stream)) {
              return (
                <span>
                  {i18n.translate('xpack.streams.streamsTreeTable.span.naLabel', {
                    defaultMessage: 'N/A',
                  })}
                </span>
              );
            }
            return (
              <RetentionColumn
                lifecycle={item.effective_lifecycle!}
                streamName={item.stream.name}
                aria-label={i18n.translate(
                  'xpack.streams.streamsTreeTable.retentionCellAriaLabel',
                  {
                    defaultMessage: 'Retention policy for {name}',
                    values: { name: item.stream.name },
                  }
                )}
                dataTestSubj={`retentionColumn-${item.stream.name}`}
              />
            );
          },
        },
        {
          field: 'definition',
          name: '',
          width: '80px',
          align: 'right',
          sortable: false,
          dataType: 'string',
          render: (_: unknown, item: TableRow) => {
            const hasDataStream =
              !!item.data_stream || Streams.QueryStream.Definition.is(item.stream);
            const discoverNode = Streams.QueryStream.Definition.is(item.stream) ? (
              <DiscoverBadgeButton hasDataStream={hasDataStream} stream={item.stream} />
            ) : (
              <DiscoverBadgeButton
                hasDataStream={hasDataStream}
                indexMode={item.data_stream?.index_mode ?? 'standard'}
                stream={item.stream}
              />
            );
            return (
              <RowActions
                streamName={item.stream.name}
                manageHref={router.link('/{key}', {
                  path: { key: item.stream.name },
                  query: { rangeFrom, rangeTo },
                })}
                discoverNode={discoverNode}
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
          compressed: true,
          'aria-label': STREAMS_TABLE_SEARCH_ARIA_LABEL,
        },
        toolsRight: <StreamsListTableTools newButtonLabel={NEW_DESTINATION_BUTTON_LABEL} />,
        filters:
          qualityLoaded && hasFailureStoreAccess
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
    {selectedDestination && (
      <DestinationFlyout
        destinationName={selectedDestination}
        onClose={() => setSelectedDestination(undefined)}
      />
    )}
    </>
  );
}
