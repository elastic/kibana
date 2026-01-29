/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
  EuiCallOut,
  EuiLoadingSpinner,
  EuiFieldSearch,
  EuiText,
  type EuiBasicTableColumn,
  type CriteriaWithPagination,
} from '@elastic/eui';
import { Axis, BarSeries, Chart, ScaleType, Settings, Tooltip } from '@elastic/charts';
import { useElasticChartsTheme } from '@kbn/charts-theme';
import { i18n } from '@kbn/i18n';
import type { Streams } from '@kbn/streams-schema';
import { useFieldStatistics, type AggregatedFieldStats } from './hooks/use_field_statistics';

/**
 * Formats bytes into a human-readable string (B, KB, MB, GB, TB).
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const base = 1024;
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(base)), units.length - 1);
  const value = bytes / Math.pow(base, exponent);
  // Use 2 decimal places for larger units, 0 for bytes
  const decimals = exponent === 0 ? 0 : 2;
  return `${value.toFixed(decimals)} ${units[exponent]}`;
}

interface StreamDetailFieldStatisticsProps {
  definition: Streams.WiredStream.GetResponse;
}

export function StreamDetailFieldStatistics({ definition }: StreamDetailFieldStatisticsProps) {
  const { data, isLoading, error } = useFieldStatistics({ streamName: definition.stream.name });

  const [searchQuery, setSearchQuery] = useState('');
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [sortField, setSortField] = useState<keyof AggregatedFieldStats>('total_in_bytes');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const chartBaseTheme = useElasticChartsTheme();

  const filteredFields = useMemo(() => {
    if (!data?.fields) return [];
    if (!searchQuery.trim()) return data.fields;

    const lowerQuery = searchQuery.toLowerCase();
    return data.fields.filter((field) => field.name.toLowerCase().includes(lowerQuery));
  }, [data?.fields, searchQuery]);

  const sortedFields = useMemo(() => {
    return [...filteredFields].sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return 0;
    });
  }, [filteredFields, sortField, sortDirection]);

  const chartData = useMemo(() => {
    // Show all fields by disk usage for the chart
    return sortedFields.map((field) => ({
      field: field.name,
      diskUsage: field.total_in_bytes,
    }));
  }, [sortedFields]);

  const handleTableChange = ({
    page,
    sort,
  }: CriteriaWithPagination<AggregatedFieldStats> & {
    sort?: { field: keyof AggregatedFieldStats; direction: 'asc' | 'desc' };
  }) => {
    if (page) {
      setPagination({ pageIndex: page.index, pageSize: page.size });
    }
    if (sort) {
      setSortField(sort.field);
      setSortDirection(sort.direction);
    }
  };

  const columns: Array<EuiBasicTableColumn<AggregatedFieldStats>> = useMemo(
    () => [
      {
        field: 'name',
        name: i18n.translate('xpack.streams.fieldStatistics.columns.name', {
          defaultMessage: 'Field name',
        }),
        sortable: true,
        truncateText: true,
        width: '30%',
      },
      {
        field: 'total_in_bytes',
        name: i18n.translate('xpack.streams.fieldStatistics.columns.totalDiskUsage', {
          defaultMessage: 'Total disk usage',
        }),
        sortable: true,
        render: (value: number) => formatBytes(value),
        width: '15%',
      },
      {
        field: 'doc_values_in_bytes',
        name: i18n.translate('xpack.streams.fieldStatistics.columns.docValues', {
          defaultMessage: 'Doc values',
        }),
        sortable: true,
        render: (value: number) => formatBytes(value),
        width: '12%',
      },
      {
        field: 'stored_fields_in_bytes',
        name: i18n.translate('xpack.streams.fieldStatistics.columns.storedFields', {
          defaultMessage: 'Stored fields',
        }),
        sortable: true,
        render: (value: number) => formatBytes(value),
        width: '12%',
      },
      {
        field: 'points_in_bytes',
        name: i18n.translate('xpack.streams.fieldStatistics.columns.points', {
          defaultMessage: 'Points',
        }),
        sortable: true,
        render: (value: number) => formatBytes(value),
        width: '10%',
      },
      {
        field: 'norms_in_bytes',
        name: i18n.translate('xpack.streams.fieldStatistics.columns.norms', {
          defaultMessage: 'Norms',
        }),
        sortable: true,
        render: (value: number) => formatBytes(value),
        width: '10%',
      },
      {
        field: 'knn_vectors_in_bytes',
        name: i18n.translate('xpack.streams.fieldStatistics.columns.knnVectors', {
          defaultMessage: 'KNN vectors',
        }),
        sortable: true,
        render: (value: number) => formatBytes(value),
        width: '11%',
      },
    ],
    []
  );

  if (isLoading) {
    return (
      <EuiFlexGroup justifyContent="center" alignItems="center" style={{ minHeight: 200 }}>
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="xl" />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  if (error) {
    return (
      <EuiCallOut
        title={i18n.translate('xpack.streams.fieldStatistics.errorTitle', {
          defaultMessage: 'Error loading field statistics',
        })}
        color="danger"
        iconType="error"
      >
        <p>
          {error.message ||
            i18n.translate('xpack.streams.fieldStatistics.errorDescription', {
              defaultMessage: 'An unexpected error occurred while loading field statistics.',
            })}
        </p>
      </EuiCallOut>
    );
  }

  if (data && !data.isSupported) {
    return (
      <EuiCallOut
        title={i18n.translate('xpack.streams.fieldStatistics.unsupportedTitle', {
          defaultMessage: 'Field disk usage not available',
        })}
        color="warning"
        iconType="iInCircle"
      >
        <p>
          {i18n.translate('xpack.streams.fieldStatistics.unsupportedDescription', {
            defaultMessage:
              'Field disk usage statistics are not available in this environment. This feature requires a self-managed Elasticsearch deployment.',
          })}
        </p>
      </EuiCallOut>
    );
  }

  if (!data?.fields?.length) {
    return (
      <EuiCallOut
        title={i18n.translate('xpack.streams.fieldStatistics.noDataTitle', {
          defaultMessage: 'No field disk usage available',
        })}
        color="primary"
        iconType="iInCircle"
      >
        <p>
          {i18n.translate('xpack.streams.fieldStatistics.noDataDescription', {
            defaultMessage:
              'No field disk usage data is available for this stream. This may happen if the stream has no data yet.',
          })}
        </p>
      </EuiCallOut>
    );
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="l">
      <EuiFlexItem>
        <EuiPanel hasShadow={false} hasBorder paddingSize="l">
          <EuiTitle size="xs">
            <h3>
              {i18n.translate('xpack.streams.fieldStatistics.chartTitle', {
                defaultMessage: 'Field disk usage overview',
              })}
            </h3>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiText size="xs" color="subdued">
            {i18n.translate('xpack.streams.fieldStatistics.chartDescription', {
              defaultMessage: 'Disk usage by field (sorted by total size)',
            })}
          </EuiText>
          <EuiSpacer size="m" />
          {chartData.length > 0 ? (
            <Chart size={{ width: '100%', height: 300 }}>
              <Settings
                baseTheme={chartBaseTheme}
                locale={i18n.getLocale()}
                theme={{ background: { color: 'transparent' } }}
              />
              <Tooltip headerFormatter={({ value }) => String(value)} />
              <Axis
                id="bottom"
                position="bottom"
                tickFormat={(d) => (d.length > 20 ? `${d.substring(0, 20)}...` : d)}
              />
              <Axis
                id="left"
                position="left"
                title={i18n.translate('xpack.streams.fieldStatistics.chartYAxisTitle', {
                  defaultMessage: 'Disk usage',
                })}
                tickFormat={(d) => formatBytes(d)}
              />
              <BarSeries
                id="fieldDiskUsage"
                name={i18n.translate('xpack.streams.fieldStatistics.chartSeriesName', {
                  defaultMessage: 'Disk usage',
                })}
                xScaleType={ScaleType.Ordinal}
                yScaleType={ScaleType.Linear}
                xAccessor="field"
                yAccessors={['diskUsage']}
                data={chartData}
              />
            </Chart>
          ) : (
            <EuiText size="s" color="subdued">
              {i18n.translate('xpack.streams.fieldStatistics.noChartData', {
                defaultMessage: 'No data to display in chart',
              })}
            </EuiText>
          )}
        </EuiPanel>
      </EuiFlexItem>

      <EuiFlexItem>
        <EuiPanel hasShadow={false} hasBorder paddingSize="l">
          <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiTitle size="xs">
                <h3>
                  {i18n.translate('xpack.streams.fieldStatistics.tableTitle', {
                    defaultMessage: 'Field statistics',
                  })}
                </h3>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false} style={{ width: 300 }}>
              <EuiFieldSearch
                placeholder={i18n.translate('xpack.streams.fieldStatistics.searchPlaceholder', {
                  defaultMessage: 'Search fields...',
                })}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPagination({ ...pagination, pageIndex: 0 });
                }}
                isClearable
                aria-label={i18n.translate('xpack.streams.fieldStatistics.searchAriaLabel', {
                  defaultMessage: 'Search fields',
                })}
                data-test-subj="fieldStatisticsSearch"
              />
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="s" />
          <EuiText size="xs" color="subdued">
            {i18n.translate('xpack.streams.fieldStatistics.tableDescription', {
              defaultMessage: '{count} fields total',
              values: { count: data.totalFields },
            })}
          </EuiText>
          <EuiSpacer size="m" />
          <EuiInMemoryTable<AggregatedFieldStats>
            items={sortedFields}
            columns={columns}
            pagination={{
              pageIndex: pagination.pageIndex,
              pageSize: pagination.pageSize,
              pageSizeOptions: [10, 25, 50],
            }}
            sorting={{
              sort: {
                field: sortField,
                direction: sortDirection,
              },
            }}
            onTableChange={handleTableChange}
            tableCaption={i18n.translate('xpack.streams.fieldStatistics.tableCaption', {
              defaultMessage: 'Field disk usage statistics table',
            })}
            data-test-subj="fieldStatisticsTable"
          />
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
