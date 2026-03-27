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
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHighlight,
  EuiIcon,
  EuiI18nNumber,
  EuiInMemoryTable,
  EuiLink,
  EuiText,
  EuiTourStep,
  useEuiTheme,
  type Direction,
  type CriteriaWithPagination,
  type EuiSearchBarProps,
  type Query,
} from '@elastic/eui';
import { css } from '@emotion/css';
import { BarSeries, Chart, ScaleType, Settings, Tooltip } from '@elastic/charts';
import { useElasticChartsTheme } from '@kbn/charts-theme';
import type { DiscoverAppLocatorParams } from '@kbn/discover-plugin/common';
import { DISCOVER_APP_LOCATOR } from '@kbn/discover-plugin/common';
import { StreamsAppSearchBar } from '../streams_app_search_bar';
import { useStreamsTour } from '../streams_tour';
import { useStreamsAppRouter } from '../../hooks/use_streams_app_router';
import { useTimeRange } from '../../hooks/use_time_range';
import { useKibana } from '../../hooks/use_kibana';

interface MockStreamRow {
  name: string;
  parentName: string | null;
  level: number;
  docCount: number;
  quality: 'good' | 'degraded' | 'poor';
  histogramData: Array<{ x: number; y: number }>;
  isRootStream: boolean;
}

const MOCK_NOW = Date.now();
const MOCK_RANGE_MS = 30 * 24 * 60 * 60 * 1000;

const makeSpark = (rate: number, points = 25): Array<{ x: number; y: number }> => {
  const step = MOCK_RANGE_MS / points;
  return Array.from({ length: points }, (_, i) => ({
    x: MOCK_NOW - MOCK_RANGE_MS + i * step,
    y: Math.max(
      0,
      rate * 60 +
        Math.floor((Math.sin(i * 0.7) * 0.4 + (i % 3 === 0 ? 0.3 : 0)) * rate * 60)
    ),
  }));
};

const MOCK_STREAMS: MockStreamRow[] = [
  {
    name: 'logs',
    parentName: null,
    level: 0,
    docCount: 6_964_800,
    quality: 'good',
    histogramData: makeSpark(221),
    isRootStream: true,
  },
  {
    name: 'logs-aws.cloudwatch_logs-default',
    parentName: 'logs',
    level: 1,
    docCount: 2_505_600,
    quality: 'good',
    histogramData: makeSpark(87),
    isRootStream: false,
  },
  {
    name: 'logs-aws.vpcflow-default',
    parentName: 'logs',
    level: 1,
    docCount: 1_612_800,
    quality: 'good',
    histogramData: makeSpark(56),
    isRootStream: false,
  },
  {
    name: 'logs-aws.s3access-default',
    parentName: 'logs',
    level: 1,
    docCount: 979_200,
    quality: 'degraded',
    histogramData: makeSpark(34),
    isRootStream: false,
  },
  {
    name: 'logs-aws.cloudtrail-default',
    parentName: 'logs',
    level: 1,
    docCount: 604_800,
    quality: 'good',
    histogramData: makeSpark(21),
    isRootStream: false,
  },
  {
    name: 'logs-aws.elb_logs-default',
    parentName: 'logs',
    level: 1,
    docCount: 432_000,
    quality: 'good',
    histogramData: makeSpark(15),
    isRootStream: false,
  },
  {
    name: 'logs-aws.guardduty-default',
    parentName: 'logs',
    level: 1,
    docCount: 230_400,
    quality: 'good',
    histogramData: makeSpark(8),
    isRootStream: false,
  },
];

function MockQualityIndicator({ quality }: { quality: 'good' | 'degraded' | 'poor' }) {
  const { euiTheme } = useEuiTheme();

  const bgColor = {
    good: euiTheme.colors.backgroundLightSuccess,
    degraded: euiTheme.colors.backgroundLightWarning,
    poor: euiTheme.colors.backgroundLightDanger,
  }[quality];

  const textColor = {
    good: euiTheme.colors.textSuccess,
    degraded: euiTheme.colors.textWarning,
    poor: euiTheme.colors.textDanger,
  }[quality];

  const iconType = { good: 'checkCircle', degraded: 'warning', poor: 'error' }[quality];
  const label = {
    good: i18n.translate('xpack.streams.mockStreamsTable.qualityGood', {
      defaultMessage: 'Good',
    }),
    degraded: i18n.translate('xpack.streams.mockStreamsTable.qualityDegraded', {
      defaultMessage: 'Degraded',
    }),
    poor: i18n.translate('xpack.streams.mockStreamsTable.qualityPoor', {
      defaultMessage: 'Poor',
    }),
  }[quality];

  const BadgeIcon = () => (
    <EuiIcon size="s" type={iconType} color={textColor} aria-hidden={true} />
  );

  return (
    <EuiBadge color={bgColor} iconType={BadgeIcon}>
      <EuiText
        color={textColor}
        size="xs"
        style={{ marginLeft: '4px' }}
      >
        {label}
      </EuiText>
    </EuiBadge>
  );
}

function SparklineCell({ row }: { row: MockStreamRow }) {
  const { euiTheme } = useEuiTheme();
  const chartBaseTheme = useElasticChartsTheme();

  return (
    <EuiFlexGroup
      alignItems="center"
      gutterSize="m"
      className={css`
        height: ${euiTheme.size.xl};
        white-space: nowrap;
      `}
    >
      <EuiFlexItem
        grow={2}
        className={css`
          text-align: right;
          font-family: 'Roboto mono', sans-serif;
        `}
      >
        <EuiI18nNumber value={row.docCount} />
      </EuiFlexItem>
      <EuiFlexItem
        grow={3}
        className={css`
          border-bottom: 1px solid ${euiTheme.colors.lightShade};
        `}
      >
        <Chart size={{ width: '100%', height: euiTheme.size.l }}>
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

const datePickerStyle = css`
  .euiFormControlLayout,
  .euiSuperDatePicker button,
  .euiButton {
    height: 40px;
  }
`;

function MockDiscoverButton({ streamName }: { streamName: string }) {
  const {
    dependencies: {
      start: { share },
    },
  } = useKibana();

  const discoverLink = share.url.locators.useUrl<DiscoverAppLocatorParams>(
    () => ({
      id: DISCOVER_APP_LOCATOR,
      params: { query: { esql: `FROM ${streamName}` } },
    }),
    [streamName]
  );

  return (
    <EuiButtonIcon
      href={discoverLink}
      iconType="discoverApp"
      aria-label={i18n.translate('xpack.streams.mockStreamsTable.openDiscoverAriaLabel', {
        defaultMessage: 'Open {name} in Discover',
        values: { name: streamName },
      })}
      size="xs"
      color="primary"
    />
  );
}

export function MockAwsStreamsTable() {
  const { euiTheme } = useEuiTheme();
  const { getStepPropsByStepId } = useStreamsTour();
  const router = useStreamsAppRouter();
  const { rangeFrom, rangeTo } = useTimeRange();
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [sortDirection] = useState<Direction>('asc');
  const [searchQuery, setSearchQuery] = useState<Query | undefined>();
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

  const allExpanded = !collapsed.has('logs');

  const handleExpandCollapseAll = () => {
    setCollapsed(allExpanded ? new Set(['logs']) : new Set());
  };

  const handleQueryChange: EuiSearchBarProps['onChange'] = ({ query }) => {
    if (query) {
      setSearchQuery(query);
      setPagination((p) => ({ ...p, pageIndex: 0 }));
    }
  };

  const filteredAndFlattened = React.useMemo(() => {
    const textSearch = searchQuery?.text?.toLowerCase() ?? '';
    const qualityFilters =
      searchQuery?.ast?.clauses?.filter(
        (c) => c.type === 'field' && (c as { field?: string }).field === 'quality'
      ) ?? [];

    const visible: MockStreamRow[] = [];
    for (const row of MOCK_STREAMS) {
      if (textSearch && !row.name.toLowerCase().includes(textSearch)) continue;
      if (row.parentName && collapsed.has(row.parentName)) continue;
      if (
        qualityFilters.length > 0 &&
        !qualityFilters.some(
          (f) => 'value' in f && typeof f.value === 'string' && f.value === row.quality
        )
      )
        continue;
      visible.push(row);
    }
    return visible;
  }, [searchQuery, collapsed]);

  const handleTableChange = ({ page }: CriteriaWithPagination<MockStreamRow>) => {
    if (page) {
      setPagination({ pageIndex: page.index, pageSize: page.size });
    }
  };

  const streamsListStepProps = getStepPropsByStepId('streams_list');

  const nameColumnHeader = (
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiButtonIcon
          size="xs"
          iconType={allExpanded ? 'fold' : 'unfold'}
          color="text"
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation();
            handleExpandCollapseAll();
          }}
          aria-label={
            allExpanded
              ? i18n.translate('xpack.streams.mockStreamsTable.collapseAll', {
                  defaultMessage: 'Collapse all',
                })
              : i18n.translate('xpack.streams.mockStreamsTable.expandAll', {
                  defaultMessage: 'Expand all',
                })
          }
        />
      </EuiFlexItem>
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
            <span>
              {i18n.translate('xpack.streams.mockStreamsTable.nameColumn', {
                defaultMessage: 'Name',
              })}
            </span>
          </EuiTourStep>
        ) : (
          <span>
            {i18n.translate('xpack.streams.mockStreamsTable.nameColumn', {
              defaultMessage: 'Name',
            })}
          </span>
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  return (
    <EuiInMemoryTable<MockStreamRow>
      data-test-subj="streamsTable"
      columns={[
        {
          field: 'name',
          name: nameColumnHeader,
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
                    <EuiHighlight search={searchQuery?.text ?? ''}>
                      {item.name}
                    </EuiHighlight>
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
          width: '180px',
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
          dataType: 'string',
          render: (_: unknown, item: MockStreamRow) => (
            <MockQualityIndicator quality={item.quality} />
          ),
        },
        {
          field: 'name',
          name: i18n.translate('xpack.streams.mockStreamsTable.retentionColumn', {
            defaultMessage: 'Retention',
          }),
          width: '220px',
          sortable: false,
          dataType: 'string',
          render: (_: unknown, item: MockStreamRow) =>
            item.isRootStream ? (
              <EuiFlexGroup alignItems="center" gutterSize="s">
                <EuiLink>logs_policy</EuiLink>
                <EuiBadge color="hollow">
                  <EuiText size="s">ILM</EuiText>
                </EuiBadge>
              </EuiFlexGroup>
            ) : (
              <EuiText color="subdued">—</EuiText>
            ),
        },
        {
          field: 'name',
          name: i18n.translate('xpack.streams.mockStreamsTable.actionsColumn', {
            defaultMessage: 'Actions',
          }),
          width: '60px',
          align: 'left' as const,
          sortable: false,
          dataType: 'string',
          render: (_: unknown, item: MockStreamRow) => (
            <MockDiscoverButton streamName={item.name} />
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
      executeQueryOptions={{ enabled: false }}
      search={{
        query: searchQuery,
        onChange: handleQueryChange,
        box: {
          incremental: true,
          'aria-label': i18n.translate('xpack.streams.mockStreamsTable.searchAriaLabel', {
            defaultMessage: 'Search streams',
          }),
        },
        toolsRight: (
          <div className={datePickerStyle}>
            <StreamsAppSearchBar showDatePicker />
          </div>
        ),
        filters: [
          {
            type: 'field_value_selection' as const,
            name: i18n.translate('xpack.streams.mockStreamsTable.dataQualityFilter.label', {
              defaultMessage: 'Data quality',
            }),
            field: 'quality',
            multiSelect: 'or' as const,
            options: [
              {
                value: 'good',
                name: i18n.translate(
                  'xpack.streams.mockStreamsTable.dataQualityFilter.goodLabel',
                  { defaultMessage: 'Good' }
                ),
              },
              {
                value: 'degraded',
                name: i18n.translate(
                  'xpack.streams.mockStreamsTable.dataQualityFilter.degradedLabel',
                  { defaultMessage: 'Degraded' }
                ),
              },
              {
                value: 'poor',
                name: i18n.translate(
                  'xpack.streams.mockStreamsTable.dataQualityFilter.poorLabel',
                  { defaultMessage: 'Poor' }
                ),
              },
            ],
          },
        ],
      }}
      tableCaption={i18n.translate('xpack.streams.mockStreamsTable.tableCaption', {
        defaultMessage: 'Streams list (simulated AWS data)',
      })}
    />
  );
}

