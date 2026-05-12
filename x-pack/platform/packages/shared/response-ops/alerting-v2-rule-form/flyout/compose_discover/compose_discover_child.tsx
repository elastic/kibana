/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiTitle,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiLoadingSpinner,
  EuiTab,
  EuiTabs,
  EuiText,
  EuiCallOut,
  EuiEmptyPrompt,
  EuiToolTip,
  EuiSuperDatePicker,
  EuiSelect,
  EuiPanel,
  EuiDataGrid,
  type EuiDataGridColumn,
  type EuiDataGridCellValueElementProps,
} from '@elastic/eui';
import { CodeEditor } from '@kbn/code-editor';
import { ESQL_LANG_ID } from '@kbn/monaco';
import type { RuleFormServices } from '../../form/contexts/rule_form_context';
import { useDataFields } from '../../form/hooks/use_data_fields';
import type { ComposeDiscoverState, ComposeDiscoverAction, SandboxTabConfig } from './types';
import { useQueryExecution } from './use_query_execution';
import { useEsqlAutocomplete } from './use_esql_providers';
import { ComposeDiscoverChart } from './compose_discover_chart';

interface ComposeDiscoverChildProps {
  state: ComposeDiscoverState;
  dispatch: React.Dispatch<ComposeDiscoverAction>;
  services: RuleFormServices;
  /** Always `{ type: 'single' }` for now. */
  tabConfig: SandboxTabConfig;
  onClose: () => void;
}

const CHILD_FLYOUT_TITLE_ID = 'composeDiscoverChildTitle';
const VISIBLE_ROWS = 10;
const INITIAL_EDITOR_HEIGHT = 200;
const MIN_EDITOR_HEIGHT = 80;
const MAX_EDITOR_HEIGHT = 600;

const isMac =
  typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);
const RUN_SHORTCUT_LABEL = isMac ? '⌘⏎' : 'Ctrl+Enter';

export const ComposeDiscoverChild: React.FC<ComposeDiscoverChildProps> = ({
  state,
  dispatch,
  services,
  onClose,
}) => {
  useEsqlAutocomplete(services);

  const [localQuery, setLocalQuery] = useState(state.fullQuery);
  // Date range persists in the reducer so it's remembered across Sandbox open/close.
  // It is intentionally not connected to schedule.lookback in FormValues — it's a
  // preview window for testing the query, not a rule configuration field.
  const dateStart = state.sandboxDateStart;
  const dateEnd = state.sandboxDateEnd;

  const timeRange = useMemo(() => ({ from: dateStart, to: dateEnd }), [dateStart, dateEnd]);

  // Single-editor mode: always use localQuery
  const activeQuery = localQuery;

  // Only fetch fields when the query has a real index pattern after FROM.
  const queryForFields = /^\s*FROM\s+[a-zA-Z0-9_.*-]/i.test(activeQuery) ? activeQuery : '';
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

    if (!dateFields.includes('@timestamp')) {
      dateFields.unshift('@timestamp');
    }

    return dateFields.map((name) => ({ value: name, text: name }));
  }, [fieldMap]);

  const { columns, rows, totalRowCount, isLoading, isError, error, run, hasRun, lastExecutedQuery } =
    useQueryExecution({
      query: activeQuery,
      timeField: state.timeField,
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

  const handleDone = useCallback(() => {
    dispatch({ type: 'COMMIT_CHILD_QUERY', fullQuery: localQuery });
    onClose();
  }, [localQuery, dispatch, onClose]);

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
      resize: 'vertical',
      overflow: 'auto',
      height: INITIAL_EDITOR_HEIGHT,
      minHeight: MIN_EDITOR_HEIGHT,
      maxHeight: MAX_EDITOR_HEIGHT,
    }),
    []
  );

  return (
    <EuiFlyout
      type="overlay"
      size="fill"
      onClose={onClose}
      aria-labelledby={CHILD_FLYOUT_TITLE_ID}
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s" id={CHILD_FLYOUT_TITLE_ID}>
          <h3>{state.queryCommitted ? 'Edit alert query' : 'Define alert query'}</h3>
        </EuiTitle>
        {!state.queryCommitted && (
          <EuiText size="s" color="subdued">
            Write the ES|QL query that defines when this rule should alert. You&apos;ll configure
            the rest of the rule settings next.
          </EuiText>
        )}
      </EuiFlyoutHeader>

      <EuiFlyoutBody paddingSize="none">
        {/* ── 1. Search / date picker / time field row — one line ──────── */}
        <div style={{ padding: '8px 16px' }}>
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap={false}>
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
            <EuiFlexItem grow>
              <EuiSuperDatePicker
                start={dateStart}
                end={dateEnd}
                onTimeChange={({ start, end }) => {
                  dispatch({ type: 'SET_SANDBOX_DATE_RANGE', start, end });
                }}
                showUpdateButton={false}
                compressed
                width="full"
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false} style={{ width: 200, minWidth: 0 }}>
              <EuiSelect
                options={timeFieldOptions}
                value={state.timeField}
                onChange={(e) =>
                  dispatch({ type: 'SET_TIME_FIELD', timeField: e.target.value })
                }
                compressed
                prepend="Time field"
                data-test-subj="composeDiscoverTimeField"
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </div>

        {/* ── 2. Editor — bordered panel ──────────────────────────────── */}
        <EuiPanel hasBorder paddingSize="none" style={{ margin: '0 16px', ...editorPanelStyles }}>
          <CodeEditor
            languageId={ESQL_LANG_ID}
            value={localQuery}
            onChange={setLocalQuery}
            height="100%"
            options={{
              minimap: { enabled: false },
              automaticLayout: true,
              scrollBeyondLastLine: false,
              fontSize: 13,
            }}
          />
        </EuiPanel>

        {/* ── 3. Footer stats ─────────────────────────────────────────── */}
        {hasRun && !isLoading && !isError && (
          <div style={{ padding: '4px 16px' }}>
            <EuiText size="xs" color="subdued">
              {totalRowCount.toLocaleString()} {totalRowCount === 1 ? 'result' : 'results'}
            </EuiText>
          </div>
        )}

        {/* ── 4. Results ──────────────────────────────────────────────── */}
        <div style={{ padding: '0 16px' }}>
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
          <EuiCallOut color="danger" iconType="error" title="Query error">
            <p>{error}</p>
          </EuiCallOut>
        )}

        {hasRun && !isLoading && !isError && rows.length === 0 && activeQuery.trim() && (
          <EuiEmptyPrompt
            iconType="search"
            title={<h4>No results</h4>}
            body={<p>The query returned no results for the current time range.</p>}
          />
        )}

        {hasRun && !isLoading && !isError && rows.length > 0 && (
          <>
            <ComposeDiscoverChart
              query={lastExecutedQuery ?? activeQuery}
              timeField={state.timeField}
              timeRange={timeRange}
              columns={columns}
              lens={services.lens}
              dataViews={services.dataViews}
            />

            <EuiSpacer size="m" />

            <EuiFlexGroup alignItems="baseline" gutterSize="s" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="subdued">
                  {totalRowCount.toLocaleString()} {totalRowCount === 1 ? 'result' : 'results'}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="s" />

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
        </div>
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiButton fill onClick={handleDone} data-test-subj="composeDiscoverChildDone">
              Apply changes
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
