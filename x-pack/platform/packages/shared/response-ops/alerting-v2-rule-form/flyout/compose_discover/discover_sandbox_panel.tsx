/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  EuiButton,
  EuiCallOut,
  EuiDataGrid,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSelect,
  EuiSpacer,
  EuiSuperDatePicker,
  EuiText,
  EuiToolTip,
  type EuiDataGridColumn,
  type EuiDataGridCellValueElementProps,
} from '@elastic/eui';
import { CodeEditor, ESQL_LANG_ID } from '@kbn/code-editor';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { HttpStart } from '@kbn/core/public';
import { useQueryExecution } from './use_query_execution';
import { ComposeDiscoverChart } from './compose_discover_chart';
import { useDataFields } from '../../form/hooks/use_data_fields';

export interface DiscoverSandboxServices {
  http: HttpStart;
  data: DataPublicPluginStart;
  dataViews: DataViewsPublicPluginStart;
}

export interface DiscoverSandboxPanelProps {
  query: string;
  timeField: string;
  dateStart: string;
  dateEnd: string;
  onDateRangeChange: (start: string, end: string) => void;
  onTimeFieldChange?: (field: string) => void;
  onQueryChange?: (query: string) => void;
  readOnly?: boolean;
  services: DiscoverSandboxServices;
  /**
   * When provided, replaces the default CodeEditor panel entirely.
   * Used by the form wrapper to render split-mode tab editors.
   */
  editorSlot?: React.ReactNode;
}

const VISIBLE_ROWS = 10;
const INITIAL_EDITOR_HEIGHT = 200;
const MIN_EDITOR_HEIGHT = 80;
const MAX_EDITOR_HEIGHT = 600;

const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);
const RUN_SHORTCUT_LABEL = isMac ? '⌘⏎' : 'Ctrl+Enter';

export const DiscoverSandboxPanel: React.FC<DiscoverSandboxPanelProps> = ({
  query,
  timeField,
  dateStart,
  dateEnd,
  onDateRangeChange,
  onTimeFieldChange,
  onQueryChange,
  readOnly = false,
  services,
  editorSlot,
}) => {
  const timeRange = useMemo(() => ({ from: dateStart, to: dateEnd }), [dateStart, dateEnd]);

  const queryForFields = /^\s*FROM\s+[a-zA-Z0-9_.*-]/i.test(query) ? query : '';
  const { data: fieldMap } = useDataFields({
    query: queryForFields,
    http: services.http,
    dataViews: services.dataViews,
  });

  const timeFieldOptions = useMemo(() => {
    const dateFields = Object.values(fieldMap)
      .filter((f) => f.type === 'date')
      .map((f) => f.name)
      .sort();

    if (dateFields.length === 0) {
      return [{ value: timeField, text: timeField }];
    }

    return dateFields.map((name) => ({ value: name, text: name }));
  }, [fieldMap, timeField]);

  const {
    columns,
    rows,
    totalRowCount,
    isLoading,
    isError,
    error,
    run,
    hasRun,
    lastExecutedQuery,
  } = useQueryExecution({
    query,
    timeField,
    timeRange,
    data: services.data,
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        run();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [run]);

  const gridColumns: EuiDataGridColumn[] = useMemo(
    () =>
      columns.map((col) => ({
        id: col.id,
        displayAsText: col.displayAsText,
        schema: col.esType,
      })),
    [columns]
  );

  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);

  const prevColumnIdsRef = useRef('');
  useEffect(() => {
    const ids = columns.map((c) => c.id).join(',');
    if (ids !== prevColumnIdsRef.current) {
      prevColumnIdsRef.current = ids;
      setVisibleColumns(columns.map((c) => c.id));
    }
  }, [columns]);

  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: VISIBLE_ROWS });
  const onChangePage = useCallback((pageIndex: number) => {
    setPagination((prev) => ({ ...prev, pageIndex }));
  }, []);
  const onChangeItemsPerPage = useCallback((pageSize: number) => {
    setPagination({ pageIndex: 0, pageSize });
  }, []);

  const renderCellValue = useCallback(
    ({ rowIndex, columnId }: EuiDataGridCellValueElementProps) => {
      const row = rows[rowIndex];
      if (!row) return null;
      const value = row[columnId];
      return <>{value ?? '—'}</>;
    },
    [rows]
  );

  const editorPanelStyles: React.CSSProperties = useMemo(
    () => ({
      resize: readOnly ? undefined : ('vertical' as const),
      overflow: 'auto',
      height: INITIAL_EDITOR_HEIGHT,
      minHeight: MIN_EDITOR_HEIGHT,
      maxHeight: MAX_EDITOR_HEIGHT,
    }),
    [readOnly]
  );

  return (
    <>
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap={false}>
        <EuiFlexItem grow={false} style={{ width: 200, minWidth: 0 }}>
          <EuiSelect
            options={timeFieldOptions}
            value={timeField}
            aria-label="Time field for rule execution"
            onChange={(e) => onTimeFieldChange?.(e.target.value)}
            compressed
            prepend="Time field"
            disabled={readOnly}
            data-test-subj="composeDiscoverTimeField"
          />
        </EuiFlexItem>
        <EuiFlexItem grow>
          <EuiSuperDatePicker
            start={dateStart}
            end={dateEnd}
            onTimeChange={({ start, end }) => onDateRangeChange(start, end)}
            showUpdateButton={false}
            compressed
            width="full"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiToolTip content={`Search (${RUN_SHORTCUT_LABEL})`}>
            <EuiButton
              size="s"
              onClick={run}
              isLoading={isLoading}
              data-test-subj="composeDiscoverRunQuery"
            >
              Search
            </EuiButton>
          </EuiToolTip>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />

      {editorSlot ?? (
        <EuiPanel hasBorder paddingSize="s" style={editorPanelStyles}>
          <CodeEditor
            languageId={ESQL_LANG_ID}
            value={query}
            onChange={(val) => onQueryChange?.(val)}
            height="100%"
            options={{
              minimap: { enabled: false },
              automaticLayout: true,
              scrollBeyondLastLine: false,
              fontSize: 13,
              readOnly,
              domReadOnly: readOnly,
            }}
          />
        </EuiPanel>
      )}
      <EuiSpacer size="s" />

      {hasRun && !isLoading && !isError && (
        <EuiText size="xs" color="subdued">
          {totalRowCount.toLocaleString()} {totalRowCount === 1 ? 'result' : 'results'}
        </EuiText>
      )}

      <EuiSpacer size="s" />
      <EuiSpacer size="m" />

      {!hasRun && (
        <EuiEmptyPrompt
          iconType="playFilled"
          title={<h4>Run your query to see results</h4>}
          body={
            <p>
              Click <strong>Search</strong> or press <strong>{RUN_SHORTCUT_LABEL}</strong> to
              execute the query.
            </p>
          }
        />
      )}

      {hasRun && isLoading && (
        <EuiFlexGroup justifyContent="center" alignItems="center" style={{ minHeight: 200 }}>
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="l" />
          </EuiFlexItem>
        </EuiFlexGroup>
      )}

      {hasRun && isError && (
        <EuiCallOut announceOnMount color="danger" iconType="error" title="Query error">
          <p>{error}</p>
        </EuiCallOut>
      )}

      {hasRun && !isLoading && !isError && rows.length === 0 && query.trim() && (
        <EuiEmptyPrompt
          iconType="search"
          title={<h4>No results</h4>}
          body={<p>The query returned no results for the current time range.</p>}
        />
      )}

      {hasRun && !isLoading && !isError && rows.length > 0 && (
        <>
          <ComposeDiscoverChart
            query={lastExecutedQuery ?? query}
            timeField={timeField}
            timeRange={timeRange}
            columns={columns}
          />

          <EuiSpacer size="m" />

          <EuiDataGrid
            aria-label="Query results"
            columns={gridColumns}
            columnVisibility={{ visibleColumns, setVisibleColumns }}
            rowCount={rows.length}
            renderCellValue={renderCellValue}
            pagination={{
              ...pagination,
              pageSizeOptions: [10, 25, 50],
              onChangePage,
              onChangeItemsPerPage,
            }}
            gridStyle={{ border: 'all', header: 'shade', fontSize: 's', cellPadding: 's' }}
            toolbarVisibility={{
              showColumnSelector: true,
              showSortSelector: true,
              showFullScreenSelector: false,
            }}
          />
        </>
      )}
    </>
  );
};
