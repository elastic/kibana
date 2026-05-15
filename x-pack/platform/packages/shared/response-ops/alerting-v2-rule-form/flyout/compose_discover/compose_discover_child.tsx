/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFormContext } from 'react-hook-form';
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
  EuiText,
  EuiCallOut,
  EuiEmptyPrompt,
  EuiToolTip,
  EuiSuperDatePicker,
  EuiSelect,
  EuiPanel,
  EuiTabs,
  EuiTab,
  EuiDataGrid,
  type EuiDataGridColumn,
  type EuiDataGridCellValueElementProps,
} from '@elastic/eui';
import { CodeEditor, ESQL_LANG_ID, type monaco } from '@kbn/code-editor';
import type { FormValues } from '../../form/types';
import { useRuleFormServices } from '../../form/contexts/rule_form_context';
import { useDataFields } from '../../form/hooks/use_data_fields';
import type {
  ComposeDiscoverState,
  ComposeDiscoverAction,
  SandboxTabConfig,
  SandboxApplyData,
} from './types';
import { useQueryExecution } from './use_query_execution';
import { ComposeDiscoverChart } from './compose_discover_chart';
import { ComposeDiscoverTabs, TAB_DEFINITIONS, visibleTabIds } from './compose_discover_tabs';

interface ComposeDiscoverChildProps {
  state: ComposeDiscoverState;
  dispatch: React.Dispatch<ComposeDiscoverAction>;
  /** Controls whether the Sandbox renders a single editor or a Base/Alert/Recovery tab layout. */
  tabConfig: SandboxTabConfig;
  onAlertEditorMount?: (editor: monaco.editor.IStandaloneCodeEditor) => void;
  onRecoveryEditorMount?: (editor: monaco.editor.IStandaloneCodeEditor) => void;
  onClose: () => void;
  /** Called when the user clicks "Apply changes". The parent writes the query
   *  into RHF (the source of truth) and updates the reducer cache. */
  onApply: (data: SandboxApplyData) => void;
}

const CHILD_FLYOUT_TITLE_ID = 'composeDiscoverChildTitle';
const VISIBLE_ROWS = 10;
const INITIAL_EDITOR_HEIGHT = 200;
const MIN_EDITOR_HEIGHT = 80;
const MAX_EDITOR_HEIGHT = 600;

const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);
const RUN_SHORTCUT_LABEL = isMac ? '⌘⏎' : 'Ctrl+Enter';

export const ComposeDiscoverChild: React.FC<ComposeDiscoverChildProps> = ({
  state,
  dispatch,
  tabConfig,
  onAlertEditorMount,
  onRecoveryEditorMount,
  onClose,
  onApply,
}) => {
  const services = useRuleFormServices();
  const isSplit = tabConfig.type !== 'single';
  const [localQuery, setLocalQuery] = useState(state.fullQuery);
  const [localBaseQuery, setLocalBaseQuery] = useState(state.baseQuery);
  const [localAlertBlock, setLocalAlertBlock] = useState(state.alertBlock);
  const [localRecoveryBlock, setLocalRecoveryBlock] = useState(state.recoveryBlock);

  // Read timeField and the base query from RHF
  const { setValue: setFormValue, watch: watchForm } = useFormContext<FormValues>();
  const timeField = watchForm('timeField') ?? '@timestamp';
  const formQuery = watchForm('evaluation.query.base') ?? '';

  // In single mode, sync localQuery when RHF's query changes externally
  // (e.g. from YAML edits that debounce into RHF). When the change comes
  // from this Sandbox's own "Apply changes", formQuery equals localQuery
  // so the setState is a no-op.
  useEffect(() => {
    if (!isSplit) {
      setLocalQuery(formQuery);
    }
  }, [formQuery, isSplit]);

  // Date range persists in the reducer so it's remembered across Sandbox open/close.
  // It is intentionally not connected to schedule.lookback in FormValues — it's a
  // preview window for testing the query, not a rule configuration field.
  const dateStart = state.sandboxDateStart;
  const dateEnd = state.sandboxDateEnd;

  const timeRange = useMemo(() => ({ from: dateStart, to: dateEnd }), [dateStart, dateEnd]);

  // In split mode the "active" query for execution and field-detection is the full assembled
  // query (base + alert block). In single mode it is the local editor content.
  const activeQuery = isSplit
    ? [localBaseQuery, localAlertBlock].filter(Boolean).join('\n')
    : localQuery;

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

    // No index queried yet (or index has no date fields) — show @timestamp as the
    // conventional default. Never inject it alongside real fields so the selector
    // only shows fields that actually exist in the index.
    if (dateFields.length === 0) {
      return [{ value: '@timestamp', text: '@timestamp' }];
    }

    return dateFields.map((name) => ({ value: name, text: name }));
  }, [fieldMap]);

  // Keep the selected time field in sync with what the index actually has.
  useEffect(() => {
    const dateFieldNames = Object.values(fieldMap)
      .filter((f) => f.type === 'date')
      .map((f) => f.name);

    if (dateFieldNames.length === 0) {
      // Editor cleared or no date fields — reset to @timestamp convention.
      if (timeField !== '@timestamp') setFormValue('timeField', '@timestamp');
    } else if (!dateFieldNames.includes(timeField)) {
      // Index changed and selected field isn't present — pick the first real one.
      setFormValue('timeField', dateFieldNames[0]);
    }
  }, [fieldMap, timeField, setFormValue]);

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
    query: activeQuery,
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

  const handleDone = useCallback(() => {
    onApply({
      isSplit,
      fullQuery: localQuery,
      baseQuery: localBaseQuery,
      alertBlock: localAlertBlock,
      recoveryBlock: localRecoveryBlock,
    });
  }, [isSplit, localQuery, localBaseQuery, localAlertBlock, localRecoveryBlock, onApply]);

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

  const splitTabs = useMemo(() => {
    if (!isSplit) return [];
    const tabIds = visibleTabIds(tabConfig);
    return TAB_DEFINITIONS.filter((t) => tabIds.includes(t.id));
  }, [isSplit, tabConfig]);

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
    <EuiFlyout type="overlay" size="fill" onClose={onClose} aria-labelledby={CHILD_FLYOUT_TITLE_ID}>
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

      <EuiFlyoutBody>
        {/* ── 0. Tab bar (split mode only) ─────────────────────────────── */}
        {splitTabs.length > 0 && (
          <>
            <EuiTabs>
              {splitTabs.map((tab) => (
                <EuiTab
                  key={tab.id}
                  isSelected={state.activeTab === tab.id}
                  onClick={() => dispatch({ type: 'SET_TAB', tab: tab.id })}
                  data-test-subj={`composeDiscoverTab-${tab.id}`}
                >
                  {tab.label}
                </EuiTab>
              ))}
            </EuiTabs>
            <EuiSpacer size="s" />
          </>
        )}

        {/* ── 1. Time field / date picker / Search row — one line ──────── */}
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap={false}>
          <EuiFlexItem grow={false} style={{ width: 200, minWidth: 0 }}>
            <EuiSelect
              options={timeFieldOptions}
              value={timeField}
              aria-label="Time field for rule execution"
              onChange={(e) => setFormValue('timeField', e.target.value)}
              compressed
              prepend="Time field"
              data-test-subj="composeDiscoverTimeField"
            />
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

        {/* ── 2. Editor — bordered panel ──────────────────────────────── */}
        <EuiPanel hasBorder paddingSize="s" style={{ ...editorPanelStyles }}>
          {isSplit ? (
            <ComposeDiscoverTabs
              baseQuery={localBaseQuery}
              alertBlock={localAlertBlock}
              recoveryBlock={localRecoveryBlock}
              onBaseQueryChange={setLocalBaseQuery}
              onAlertBlockChange={setLocalAlertBlock}
              onRecoveryBlockChange={setLocalRecoveryBlock}
              activeTab={state.activeTab}
              onTabChange={(tab) => dispatch({ type: 'SET_TAB', tab })}
              tabConfig={tabConfig}
              onAlertEditorMount={onAlertEditorMount}
              onRecoveryEditorMount={onRecoveryEditorMount}
              hideTabBar
            />
          ) : (
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
          )}
        </EuiPanel>
        <EuiSpacer size="s" />

        {/* ── 3. Footer stats ─────────────────────────────────────────── */}
        {hasRun && !isLoading && !isError && (
          <EuiText size="xs" color="subdued">
            {totalRowCount.toLocaleString()} {totalRowCount === 1 ? 'result' : 'results'}
          </EuiText>
        )}

        <EuiSpacer size="s" />

        {/* ── 4. Results ──────────────────────────────────────────────── */}
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
