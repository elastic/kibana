/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiModalFooter,
  EuiButton,
  EuiButtonEmpty,
  EuiForm,
  EuiFormRow,
  EuiTextArea,
  EuiFieldText,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonGroup,
  EuiCallOut,
  EuiLoadingSpinner,
} from '@elastic/eui';
import { ESQLLangEditor } from '@kbn/esql/public';
import type { AggregateQuery, TimeRange } from '@kbn/es-query';
import type { EuiInMemoryTableProps } from '@elastic/eui';
import { EuiInMemoryTable } from '@elastic/eui';
import type { ScratchpadNode } from '../../hooks/use_scratchpad_state';
import { useESQLQuery } from '../../hooks/use_esql_query';
import { esqlResultsToChartData } from '../../utils/esql_results_to_chart';
import { ESQLChart } from '../nodes/esql_chart';

interface NodeEditModalProps {
  node: ScratchpadNode | null;
  onClose: () => void;
  onSave: (nodeId: string, updates: Partial<ScratchpadNode>) => void;
  timeRange?: TimeRange;
}

type TableRow = Record<string, unknown>;

export function NodeEditModal({ node, onClose, onSave, timeRange }: NodeEditModalProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [query, setQuery] = useState('');
  const [url, setUrl] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'chart'>('table');
  const [chartType, setChartType] = useState<'line' | 'bar' | 'area'>('line');

  const { loading, error, results, executeQuery } = useESQLQuery();

  useEffect(() => {
    if (node) {
      setTitle(String(node.data.title || ''));
      setContent(String(node.data.content || ''));
      setQuery(String(node.data.query || ''));
      setUrl(String(node.data.url || ''));
      setViewMode((node.data as any).viewMode || 'table');
      setChartType((node.data as any).chartType || 'line');
    }
  }, [node]);

  const handleRunQuery = useCallback(async () => {
    if (!query || !timeRange) return;
    await executeQuery(query, timeRange);
    // Results are stored in the hook state and will be displayed via the `results` variable
  }, [query, timeRange, executeQuery]);

  // Auto-execute query when time range changes (but not on initial load or query change)
  useEffect(() => {
    if (node?.data.type === 'esql_query' && query && timeRange && node.data.query === query) {
      let cancelled = false;
      const runQuery = async () => {
        await executeQuery(query, timeRange);
        if (!cancelled && node) {
          // Results are stored in the hook state, will be displayed
        }
      };
      runQuery();
      return () => {
        cancelled = true;
      };
    }
  }, [
    timeRange?.from,
    timeRange?.to,
    executeQuery,
    node?.data.type,
    node?.data.query,
    query,
    node,
    timeRange,
  ]);

  // Prioritize hook results (from manual execution) over saved node results
  const displayResults =
    node?.data.type === 'esql_query' ? results || (node.data as any).results : null;

  // Convert results to chart data
  const chartData = useMemo(() => {
    if (!displayResults) return { series: [], canChart: false };
    return esqlResultsToChartData(displayResults);
  }, [displayResults]);

  // Convert results to table format
  const tableItems = useMemo(() => {
    if (!displayResults || !displayResults.columns || !displayResults.values) return [];
    return displayResults.values.map((row: unknown[]) => {
      const item: TableRow = {};
      displayResults.columns.forEach((col: { name: string }, idx: number) => {
        item[col.name] = row[idx];
      });
      return item;
    });
  }, [displayResults]);

  const tableColumns: EuiInMemoryTableProps<TableRow>['columns'] = useMemo(() => {
    if (!displayResults || !displayResults.columns) return [];
    return displayResults.columns.map((col: { name: string }) => ({
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

  if (!node) {
    return null;
  }

  const handleSave = () => {
    const updates: Partial<ScratchpadNode> = {
      data: {
        ...node.data,
        ...(node.data.type === 'text_note' && { title, content }),
        ...(node.data.type === 'esql_query' && {
          query,
          viewMode,
          chartType,
          results: displayResults, // Use the latest results (from hook or saved)
        }),
        ...(node.data.type === 'kibana_link' && { url, title }),
      },
    };
    onSave(node.id, updates);
    onClose();
  };

  const isESQLNode = node.data.type === 'esql_query';

  return (
    <EuiModal
      onClose={onClose}
      aria-label={`Edit ${node.data.type.replace('_', ' ')}`}
      maxWidth={isESQLNode ? '90vw' : undefined}
      style={isESQLNode ? { width: '90vw', maxWidth: '1400px', height: '90vh' } : undefined}
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle>Edit {node.data.type.replace('_', ' ')}</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody
        style={isESQLNode ? { height: 'calc(90vh - 120px)', overflow: 'auto' } : undefined}
      >
        <EuiForm>
          {node.data.type === 'text_note' && (
            <>
              <EuiFormRow label="Title">
                <EuiFieldText value={title} onChange={(e) => setTitle(e.target.value)} />
              </EuiFormRow>
              <EuiFormRow label="Content">
                <EuiTextArea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={6}
                />
              </EuiFormRow>
            </>
          )}
          {node.data.type === 'esql_query' && (
            <>
              <EuiFormRow
                label="ESQL Query"
                fullWidth
                labelAppend={
                  <EuiButton
                    size="s"
                    iconType="play"
                    onClick={handleRunQuery}
                    isLoading={loading}
                    isDisabled={!query || !query.trim() || loading}
                    fill
                  >
                    Run Query
                  </EuiButton>
                }
              >
                <div style={{ minHeight: '200px' }}>
                  <ESQLLangEditor
                    query={{ esql: query } as AggregateQuery}
                    onTextLangQueryChange={(q) => {
                      if ('esql' in q) {
                        setQuery(q.esql);
                      }
                    }}
                    onTextLangQuerySubmit={handleRunQuery}
                    editorIsInline
                    hideRunQueryText
                    hasOutline
                    hideRunQueryButton
                    hideQueryHistory
                    hideTimeFilterInfo
                    disableAutoFocus
                    initialState={{
                      editorHeight: 200,
                    }}
                    errors={error ? [{ message: error, name: 'QueryError' }] : []}
                  />
                </div>
              </EuiFormRow>

              {loading && (
                <>
                  <EuiSpacer size="s" />
                  <EuiCallOut title="Executing query..." iconType="iInCircle" size="s">
                    <EuiLoadingSpinner size="m" />
                  </EuiCallOut>
                </>
              )}

              {error && !loading && (
                <>
                  <EuiSpacer size="s" />
                  <EuiCallOut title="Query Error" color="danger" iconType="alert" size="s">
                    <p>{error}</p>
                  </EuiCallOut>
                </>
              )}

              {displayResults && displayResults.columns && displayResults.columns.length > 0 && (
                <>
                  <EuiSpacer size="m" />
                  <EuiFlexGroup gutterSize="s" alignItems="center">
                    <EuiFlexItem grow={false}>
                      <EuiButtonGroup
                        legend="View mode"
                        options={[
                          { id: 'table', label: 'Table' },
                          { id: 'chart', label: 'Chart', isDisabled: !chartData.canChart },
                        ]}
                        idSelected={viewMode}
                        onChange={(id) => setViewMode(id as 'table' | 'chart')}
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
                          onChange={(id) => setChartType(id as 'line' | 'bar' | 'area')}
                        />
                      </EuiFlexItem>
                    )}
                    <EuiFlexItem>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        {displayResults.values?.length || 0} rows
                      </div>
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
                    <div style={{ height: '400px' }}>
                      <ESQLChart series={chartData.series} chartType={chartType} height={400} />
                    </div>
                  ) : (
                    <div style={{ padding: '16px', background: '#f5f5f5', borderRadius: '4px' }}>
                      Chart requires at least one time column (timestamp, time) and one numeric
                      column, or at least two numeric columns.
                    </div>
                  )}
                </>
              )}
            </>
          )}
          {node.data.type === 'kibana_link' && (
            <>
              <EuiFormRow label="Title">
                <EuiFieldText value={title} onChange={(e) => setTitle(e.target.value)} />
              </EuiFormRow>
              <EuiFormRow label="URL">
                <EuiFieldText value={url} onChange={(e) => setUrl(e.target.value)} fullWidth />
              </EuiFormRow>
            </>
          )}
        </EuiForm>
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty onClick={onClose}>Cancel</EuiButtonEmpty>
        <EuiButton onClick={handleSave} fill>
          Save
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
}
