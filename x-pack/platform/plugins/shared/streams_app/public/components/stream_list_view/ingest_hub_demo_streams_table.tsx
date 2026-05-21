/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiI18nNumber,
  EuiInMemoryTable,
  EuiLink,
  EuiText,
  EuiTourStep,
  useEuiTheme,
  type Direction,
  type CriteriaWithPagination,
} from '@elastic/eui';
import { css } from '@emotion/css';
import { BarSeries, Chart, ScaleType, Settings, Tooltip } from '@elastic/charts';
import { useElasticChartsTheme } from '@kbn/charts-theme';
import { useStreamsTour } from '../streams_tour';
import { useStreamsAppRouter } from '../../hooks/use_streams_app_router';
import { useTimeRange } from '../../hooks/use_time_range';
import { MockAwsStreamsDiscoverButton } from './ingest_hub_demo_streams_discover_button';
import {
  DOCUMENTS_CELL_CHART_WIDTH_PX,
  DOCUMENTS_CELL_COUNT_SLOT_REM,
} from './documents_cell_layout';
import { MockAwsStreamQualityBadge } from './ingest_hub_demo_stream_quality_badge';
import {
  MOCK_AWS_STREAMS_NOW,
  MOCK_AWS_STREAMS_RANGE_MS,
  type AwsMockStreamRow,
} from './ingest_hub_demo_streams_model';
import { AWS_LOGS_MOCK_STREAMS } from '../ingest_hub_aws_logs_demo_data';
import { filterMockAwsStreamsBySearchQuery } from './ingest_hub_demo_streams_list_search';
import {
  toggleStarredStreamName,
  useStarredStreamNames,
} from '../../../common/ingest_hub_starred_streams';

const MOCK_STREAMS = AWS_LOGS_MOCK_STREAMS;
const MOCK_NOW = MOCK_AWS_STREAMS_NOW;
const MOCK_RANGE_MS = MOCK_AWS_STREAMS_RANGE_MS;

const streamsTableRowStarCss = css`
  [data-test-subj='streamsTable'] tbody tr [data-test-subj^='streamsStarStreamButton'] {
    visibility: hidden;
  }

  [data-test-subj='streamsTable'] tbody tr:hover [data-test-subj^='streamsStarStreamButton'] {
    visibility: visible;
  }
`;

type MockStreamRow = AwsMockStreamRow;

function SparklineCell({ row }: { row: MockStreamRow }) {
  const { euiTheme } = useEuiTheme();
  const chartBaseTheme = useElasticChartsTheme();

  return (
    <EuiFlexGroup
      alignItems="center"
      gutterSize="s"
      responsive={false}
      justifyContent="flexEnd"
      wrap={false}
      className={css`
        height: ${euiTheme.size.xl};
        white-space: nowrap;
        width: 100%;
      `}
    >
      <EuiFlexItem
        grow={false}
        className={css`
          flex: 0 0 ${DOCUMENTS_CELL_COUNT_SLOT_REM}rem;
          max-width: ${DOCUMENTS_CELL_COUNT_SLOT_REM}rem;
          display: flex;
          align-items: center;
          justify-content: flex-end;
        `}
      >
        <EuiText
          size="s"
          textAlign="right"
          className={css`
            font-variant-numeric: tabular-nums;
            font-family: ${euiTheme.font.familyCode};
          `}
        >
          <EuiI18nNumber value={row.docCount} />
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem
        grow={false}
        className={css`
          flex: 0 0 ${DOCUMENTS_CELL_CHART_WIDTH_PX}px;
          width: ${DOCUMENTS_CELL_CHART_WIDTH_PX}px;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          border-bottom: 1px solid ${euiTheme.colors.lightShade};
        `}
      >
        <Chart size={{ width: DOCUMENTS_CELL_CHART_WIDTH_PX, height: euiTheme.size.l }}>
          <Settings
            locale={i18n.getLocale()}
            baseTheme={chartBaseTheme}
            theme={{ background: { color: 'transparent' } }}
            xDomain={{ min: MOCK_NOW - MOCK_RANGE_MS, max: MOCK_NOW }}
            noResults={<div />}
          />
          <Tooltip />
          <BarSeries
            id={`spark-${row.name}`}
            xScaleType={ScaleType.Time}
            yScaleType={ScaleType.Linear}
            xAccessor="x"
            yAccessors={['y']}
            data={row.histogramData}
          />
        </Chart>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

export function MockAwsStreamsTable() {
  const { euiTheme } = useEuiTheme();
  const { getStepPropsByStepId } = useStreamsTour();
  const router = useStreamsAppRouter();
  const { rangeFrom, rangeTo } = useTimeRange();
  const starredStreamNames = useStarredStreamNames();
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [sortDirection] = useState<Direction>('asc');
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 25 });

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

  const filteredStreams = React.useMemo(
    () => filterMockAwsStreamsBySearchQuery(MOCK_STREAMS, undefined, collapsed),
    [collapsed]
  );

  const handleTableChange = ({ page }: CriteriaWithPagination<MockStreamRow>) => {
    if (page) {
      setPagination({ pageIndex: page.index, pageSize: page.size });
    }
  };

  const streamsListStepProps = getStepPropsByStepId('streams_list');

  const renderNameColumnHeader = () => {
    const nameLabel = i18n.translate('xpack.streams.mockStreamsTable.streamColumn', {
      defaultMessage: 'Stream',
    });
    const labelNode = streamsListStepProps ? (
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
        <EuiText size="s">{nameLabel}</EuiText>
      </EuiTourStep>
    ) : (
      <EuiText size="s">{nameLabel}</EuiText>
    );
    return (
      <div key="streamsMockAwsStreamsNameHeader" data-test-subj="streamsMockAwsStreamsNameHeader">
        {labelNode}
      </div>
    );
  };

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="s"
      alignItems="stretch"
      responsive={false}
      data-test-subj="streamsMockAwsStreamsTable"
      className={streamsTableRowStarCss}
    >
      <EuiFlexItem grow style={{ minHeight: 0 }}>
        <EuiInMemoryTable<MockStreamRow>
          data-test-subj="streamsTable"
          columns={[
            {
              field: 'name',
              name: renderNameColumnHeader(),
              sortable: true,
              dataType: 'string',
              render: (_: unknown, item: MockStreamRow) => {
                const hasChildren = MOCK_STREAMS.some((s) => s.parentName === item.name);
                const isCollapsed = collapsed.has(item.name);
                const isStarred = starredStreamNames.includes(item.name);
                const starLabel = isStarred
                  ? i18n.translate('xpack.streams.mockStreamsTable.unstarStream', {
                      defaultMessage: 'Remove from starred',
                    })
                  : i18n.translate('xpack.streams.mockStreamsTable.starStream', {
                      defaultMessage: 'Add to starred',
                    });
                return (
                  <EuiFlexGroup
                    alignItems="center"
                    gutterSize="s"
                    responsive={false}
                    className={css`
                      margin-left: ${item.level * parseInt(euiTheme.size.xl, 10)}px;
                    `}
                  >
                    {hasChildren ? (
                      <EuiFlexItem grow={false}>
                        <EuiIcon
                          type={isCollapsed ? 'arrowRight' : 'arrowDown'}
                          color="text"
                          size="m"
                          onClick={() => handleToggleCollapse(item.name)}
                          style={{ cursor: 'pointer' }}
                        />
                      </EuiFlexItem>
                    ) : (
                      <EuiFlexItem grow={false}>
                        <EuiIcon type="empty" color="text" size="m" aria-hidden />
                      </EuiFlexItem>
                    )}
                    <EuiFlexItem
                      grow={false}
                      className={css`
                        flex: 0 0 ${euiTheme.size.l};
                        width: ${euiTheme.size.l};
                      `}
                    >
                      <EuiButtonIcon
                        data-test-subj={`streamsStarStreamButton-${item.name}`}
                        iconType={isStarred ? 'starFilled' : 'starEmpty'}
                        color={isStarred ? 'warning' : 'text'}
                        aria-label={starLabel}
                        onClick={(event: React.MouseEvent) => {
                          event.preventDefault();
                          event.stopPropagation();
                          toggleStarredStreamName(item.name);
                        }}
                      />
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiLink
                        data-test-subj={`streamsNameLink-${item.name}`}
                        href={router.link('/{key}', {
                          path: { key: item.name },
                          query: { rangeFrom, rangeTo },
                        })}
                        onClick={(e: React.MouseEvent) => {
                          e.preventDefault();
                          router.push('/{key}', {
                            path: { key: item.name },
                            query: { rangeFrom, rangeTo },
                          });
                        }}
                      >
                        {item.name}
                      </EuiLink>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                );
              },
            },
            {
              field: 'docCount',
              name: i18n.translate('xpack.streams.mockStreamsTable.documentsColumn', {
                defaultMessage: 'Documents',
              }),
              width: '220px',
              sortable: true,
              align: 'right' as const,
              dataType: 'number',
              render: (_: unknown, item: MockStreamRow) => <SparklineCell row={item} />,
            },
            {
              field: 'quality',
              name: i18n.translate('xpack.streams.mockStreamsTable.dataQualityColumn', {
                defaultMessage: 'Data quality',
              }),
              width: '150px',
              sortable: true,
              align: 'right' as const,
              dataType: 'string',
              render: (_: unknown, item: MockStreamRow) => (
                <EuiFlexGroup
                  responsive={false}
                  alignItems="center"
                  justifyContent="flexEnd"
                  gutterSize="none"
                >
                  <EuiFlexItem grow={false}>
                    <MockAwsStreamQualityBadge quality={item.quality} />
                  </EuiFlexItem>
                </EuiFlexGroup>
              ),
            },
            {
              field: 'name',
              name: i18n.translate('xpack.streams.mockStreamsTable.retentionColumn', {
                defaultMessage: 'Retention',
              }),
              width: '220px',
              sortable: false,
              align: 'right' as const,
              dataType: 'string',
              render: (_: unknown, item: MockStreamRow) =>
                item.isWiredRoot ? (
                  <EuiFlexGroup
                    alignItems="center"
                    justifyContent="flexEnd"
                    gutterSize="s"
                    wrap
                    responsive={false}
                  >
                    <EuiFlexItem grow={false}>
                      <EuiLink>logs_policy</EuiLink>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                ) : (
                  <EuiFlexGroup responsive={false} justifyContent="flexEnd" alignItems="center">
                    <EuiFlexItem grow={false}>
                      <EuiText color="subdued">—</EuiText>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                ),
            },
            {
              field: 'name',
              name: i18n.translate('xpack.streams.mockStreamsTable.actionsColumn', {
                defaultMessage: 'Actions',
              }),
              width: '60px',
              align: 'right' as const,
              sortable: false,
              dataType: 'string',
              render: (_: unknown, item: MockStreamRow) => (
                <EuiFlexGroup responsive={false} justifyContent="flexEnd" alignItems="center">
                  <EuiFlexItem grow={false}>
                    <MockAwsStreamsDiscoverButton streamName={item.name} />
                  </EuiFlexItem>
                </EuiFlexGroup>
              ),
            },
          ]}
          itemId="name"
          items={filteredStreams}
          sorting={{ sort: { field: 'name', direction: sortDirection } }}
          noItemsMessage={i18n.translate('xpack.streams.mockStreamsTable.noItems', {
            defaultMessage: 'No streams match your search.',
          })}
          onTableChange={handleTableChange}
          pagination={{
            initialPageSize: 25,
            pageSizeOptions: [25, 50, 100],
            pageIndex: pagination.pageIndex,
            pageSize: pagination.pageSize,
          }}
          tableCaption={i18n.translate('xpack.streams.mockStreamsTable.tableCaption', {
            defaultMessage: 'Streams list (simulated AWS data)',
          })}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
