/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState, useMemo } from 'react';
import type { Node } from '@xyflow/react';
import { Handle, Position } from '@xyflow/react';
import {
  EuiCard,
  EuiText,
  EuiSpacer,
  EuiLoadingSpinner,
  EuiCallOut,
  EuiInMemoryTable,
  EuiButtonGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  useEuiTheme,
  type EuiInMemoryTableProps,
} from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { ScratchpadNodeData } from '../../hooks/use_scratchpad_state';
import { useESQLQuery } from '../../hooks/use_esql_query';
import { useScratchpadNodeContext } from '../scratchpad_canvas/node_context';
import { esqlResultsToChartData } from '../../utils/esql_results_to_chart';
import { ESQLChart } from './esql_chart';

interface ESQLQueryNodeData extends ScratchpadNodeData {
  type: 'esql_query';
  query: string;
  results?: {
    columns: Array<{ name: string; type: string }>;
    values: unknown[][];
  };
  viewMode?: 'table' | 'chart';
  chartType?: 'line' | 'bar' | 'area';
}

interface ESQLQueryNodeProps {
  node: Node<ESQLQueryNodeData>;
}

type TableRow = Record<string, unknown>;

export function ESQLQueryNode({ node }: ESQLQueryNodeProps) {
  const nodeData = node.data;
  const { euiTheme } = useEuiTheme();
  const { onUpdateNode, timeRange } = useScratchpadNodeContext();
  const {
    services: { share },
  } = useKibana();
  const isSelected = nodeData.selected || false;

  const [viewMode, setViewMode] = useState<'table' | 'chart'>(nodeData.viewMode || 'table');
  const [chartType, setChartType] = useState<'line' | 'bar' | 'area'>(
    nodeData.chartType || 'line'
  );

  const { loading, error, results, executeQuery } = useESQLQuery();

  // Use stored results if available, otherwise use query results
  const displayResults = nodeData.results || results;

  // Auto-execute query when time range changes or node is created
  useEffect(() => {
    if (!nodeData.query || !timeRange) return;

    let cancelled = false;

    const runQuery = async () => {
      const queryResults = await executeQuery(nodeData.query, timeRange);
      // Save results to node data if update callback is provided and not cancelled
      if (!cancelled && onUpdateNode && queryResults) {
        onUpdateNode(node.id, {
          data: {
            ...nodeData,
            results: queryResults,
          },
        });
      }
    };

    runQuery();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRange?.from, timeRange?.to, nodeData.query, node.id]);

  // Convert results to chart data
  const chartData = useMemo(() => {
    if (!displayResults) return { series: [], canChart: false };
    return esqlResultsToChartData(displayResults);
  }, [displayResults]);

  // Convert results to table format
  const tableItems = useMemo(() => {
    if (!displayResults || !displayResults.columns || !displayResults.values) return [];
    return displayResults.values.map((row) => {
      const item: TableRow = {};
      displayResults.columns.forEach((col, idx) => {
        item[col.name] = row[idx];
      });
      return item;
    });
  }, [displayResults]);

  const tableColumns: EuiInMemoryTableProps<TableRow>['columns'] = useMemo(() => {
    if (!displayResults || !displayResults.columns) return [];
    return displayResults.columns.map((col) => ({
      field: col.name,
      name: col.name,
      sortable: true,
      truncateText: true,
      render: (value: unknown) => {
        if (value === null || value === undefined) return '-';
        if (typeof value === 'object') return JSON.stringify(value);
        return String(value);
      },
    }));
  }, [displayResults]);

  const handleViewModeChange = (mode: 'table' | 'chart') => {
    setViewMode(mode);
    if (onUpdateNode) {
      onUpdateNode(node.id, {
        data: {
          ...nodeData,
          viewMode: mode,
        },
      });
    }
  };

  const handleChartTypeChange = (type: 'line' | 'bar' | 'area') => {
    setChartType(type);
    if (onUpdateNode) {
      onUpdateNode(node.id, {
        data: {
          ...nodeData,
          chartType: type,
        },
      });
    }
  };

  const handleOpenInDiscover = async () => {
    if (!nodeData.query || !share) return;
    const discoverLocator = share.url.locators.get('DISCOVER_APP_LOCATOR');
    if (!discoverLocator) return;

    const params = {
      query: {
        esql: nodeData.query,
      },
      timeRange: timeRange,
    };

    await discoverLocator.navigate(params);
  };

  return (
    <div>
      <Handle type="target" position={Position.Top} />
      <EuiCard
        title={
          <EuiFlexGroup gutterSize="s" alignItems="center" justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>ESQL Query</EuiFlexItem>
            {nodeData.query && (
              <EuiFlexItem grow={false}>
                <EuiButton
                  size="s"
                  iconType="discoverApp"
                  onClick={handleOpenInDiscover}
                  title="Open in Discover"
                >
                  Open in Discover
                </EuiButton>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        }
        style={{
          minWidth: '500px',
          maxWidth: '800px',
          border: isSelected
            ? `2px solid ${euiTheme.colors.primary}`
            : `1px solid ${euiTheme.colors.plainDark}`,
          boxShadow: isSelected
            ? `0 0 0 2px ${euiTheme.colors.primary}20`
            : 'none',
        }}
        textAlign="left"
      >
        <EuiText size="s">
          <pre style={{ fontSize: '12px', overflow: 'auto', margin: 0, whiteSpace: 'pre-wrap' }}>
            {String(nodeData.query || 'No query')}
          </pre>
        </EuiText>

        {loading && (
          <>
            <EuiSpacer size="s" />
            <EuiLoadingSpinner size="m" />
          </>
        )}

        {error && (
          <>
            <EuiSpacer size="s" />
            <EuiCallOut title="Error" color="danger" size="s">
              {error}
            </EuiCallOut>
          </>
        )}

        {displayResults && displayResults.columns && displayResults.columns.length > 0 && (
          <>
            <EuiSpacer size="s" />
            <EuiFlexGroup gutterSize="s" alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiButtonGroup
                  legend="View mode"
                  options={[
                    { id: 'table', label: 'Table' },
                    { id: 'chart', label: 'Chart', isDisabled: !chartData.canChart },
                  ]}
                  idSelected={viewMode}
                  onChange={(id) => handleViewModeChange(id as 'table' | 'chart')}
                  size="compressed"
                />
              </EuiFlexItem>
              {viewMode === 'chart' && chartData.canChart && (
                <EuiFlexItem grow={false}>
                  <EuiButtonGroup
                    legend="Chart type"
                    options={[
                      { id: 'line', label: 'Line' },
                      { id: 'bar', label: 'Bar' },
                      { id: 'area', label: 'Area' },
                    ]}
                    idSelected={chartType}
                    onChange={(id) => handleChartTypeChange(id as 'line' | 'bar' | 'area')}
                    size="compressed"
                  />
                </EuiFlexItem>
              )}
              <EuiFlexItem>
                <EuiText size="xs" color="subdued">
                  {displayResults.values?.length || 0} rows
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>

            <EuiSpacer size="s" />

            {viewMode === 'table' ? (
              <div style={{ maxHeight: '400px', overflow: 'auto' }}>
                <EuiInMemoryTable
                  items={tableItems}
                  columns={tableColumns}
                  pagination={{
                    pageSize: 10,
                    pageSizeOptions: [5, 10, 25, 50],
                  }}
                  sorting={true}
                  compressed
                />
              </div>
            ) : chartData.canChart ? (
              <div style={{ height: '300px' }}>
                <ESQLChart series={chartData.series} chartType={chartType} height={300} />
              </div>
            ) : (
              <EuiCallOut title="Cannot render chart" color="warning" size="s">
                <p>
                  Chart requires at least one time column (timestamp, time) and one numeric column,
                  or at least two numeric columns.
                </p>
              </EuiCallOut>
            )}
          </>
        )}
      </EuiCard>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
