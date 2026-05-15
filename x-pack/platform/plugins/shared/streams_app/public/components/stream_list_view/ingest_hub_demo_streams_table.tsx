/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiBadge,
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
  AWS_MOCK_STREAMS,
  MOCK_AWS_STREAMS_NOW,
  MOCK_AWS_STREAMS_RANGE_MS,
  type AwsMockStreamRow,
} from './ingest_hub_demo_streams_model';
import { filterMockAwsStreamsBySearchQuery } from './ingest_hub_demo_streams_list_search';

const MOCK_STREAMS = AWS_MOCK_STREAMS;
const MOCK_NOW = MOCK_AWS_STREAMS_NOW;
const MOCK_RANGE_MS = MOCK_AWS_STREAMS_RANGE_MS;

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

  const filteredAndFlattened = React.useMemo(
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
    const nameLabel = i18n.translate('xpack.streams.mockStreamsTable.nameColumn', {
      defaultMessage: 'Name',
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
                          aria-label={
                            isCollapsed
                              ? i18n.translate(
                                  'xpack.streams.mockStreamsTable.collapsedNodeAriaLabel',
                                  {
                                    defaultMessage: 'Expand {name}',
                                    values: { name: item.name },
                                  }
                                )
                              : i18n.translate(
                                  'xpack.streams.mockStreamsTable.expandedNodeAriaLabel',
                                  {
                                    defaultMessage: 'Collapse {name}',
                                    values: { name: item.name },
                                  }
                                )
                          }
                          onClick={() => handleToggleCollapse(item.name)}
                          tabIndex={0}
                          role="button"
                          onKeyDown={(e: React.KeyboardEvent) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              handleToggleCollapse(item.name);
                            }
                          }}
                          style={{ cursor: 'pointer' }}
                        />
                      </EuiFlexItem>
                    ) : (
                      <EuiFlexItem grow={false}>
                        <EuiIcon type="empty" color="text" size="m" aria-hidden />
                      </EuiFlexItem>
                    )}
                    <EuiFlexGroup alignItems="center" gutterSize="s" responsive wrap>
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
                    </EuiFlexGroup>
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
                item.isRootStream ? (
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
                    <EuiFlexItem grow={false}>
                      <EuiBadge color="hollow">
                        <EuiText size="s">ILM</EuiText>
                      </EuiBadge>
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
          items={filteredAndFlattened}
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
