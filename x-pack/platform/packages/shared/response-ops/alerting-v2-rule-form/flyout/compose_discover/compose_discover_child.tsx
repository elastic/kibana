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
import { useRuleFormServices } from '../../form/contexts/rule_form_context';
import { useDataFields } from '../../form/hooks/use_data_fields';
import type { SandboxDraft, SandboxTabConfig, QueryTab } from './types';
import { useQueryExecution } from './use_query_execution';
import { ComposeDiscoverChart } from './compose_discover_chart';
import { ComposeDiscoverTabs, TAB_DEFINITIONS, visibleTabIds } from './compose_discover_tabs';

interface ComposeDiscoverChildProps {
  draft: SandboxDraft;
  /** When absent, all query editors are read-only (same as an uncontrolled input). */
  onDraftChange?: (update: Partial<SandboxDraft>) => void;
  /** Time field for query execution — managed by the parent via RHF. */
  timeField: string;
  onTimeFieldChange: (field: string) => void;
  /** Controls which tab layout the Sandbox renders. */
  tabConfig: SandboxTabConfig;
  /** Active tab within the Sandbox, owned by the parent reducer. */
  activeTab: QueryTab;
  onTabChange: (tab: QueryTab) => void;
  /** When true, all query editors are locked (Rule Builder read-only preview). */
  readOnlyQueries?: boolean;
  /** When provided, renders an "Apply changes" button that calls this on click.
   *  When absent, no Apply button is shown (Rule Builder close-only mode). */
  onApply?: () => void;
  onClose: () => void;
  onAlertEditorMount?: (editor: monaco.editor.IStandaloneCodeEditor) => void;
  onRecoveryEditorMount?: (editor: monaco.editor.IStandaloneCodeEditor) => void;
}

const CHILD_FLYOUT_TITLE_ID = 'composeDiscoverChildTitle';
const VISIBLE_ROWS = 10;
const INITIAL_EDITOR_HEIGHT = 200;
const MIN_EDITOR_HEIGHT = 80;
const MAX_EDITOR_HEIGHT = 600;

const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);
const RUN_SHORTCUT_LABEL = isMac ? '⌘⏎' : 'Ctrl+Enter';

export const ComposeDiscoverChild: React.FC<ComposeDiscoverChildProps> = ({
  draft,
  onDraftChange,
  timeField,
  onTimeFieldChange,
  tabConfig,
  activeTab,
  onTabChange,
  readOnlyQueries = false,
  onApply,
  onClose,
  onAlertEditorMount,
  onRecoveryEditorMount,
}) => {
  const services = useRuleFormServices();
  const isSplit = tabConfig.type !== 'single';
  const isReadOnly = readOnlyQueries || !onDraftChange;

  const timeRange = useMemo(
    () => ({ from: draft.dateStart, to: draft.dateEnd }),
    [draft.dateStart, draft.dateEnd]
  );

  // In split mode the "active" query is the assembled base + breach block.
  const activeQuery = isSplit
    ? [draft.base, draft.breach].filter(Boolean).join('\n')
    : draft.breach;

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
      if (timeField !== '@timestamp') onTimeFieldChange('@timestamp');
    } else if (!dateFieldNames.includes(timeField)) {
      onTimeFieldChange(dateFieldNames[0]);
    }
  }, [fieldMap, timeField, onTimeFieldChange]);

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
    onApply?.();
  }, [onApply]);

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
          <h3>{draft.breach ? 'Edit alert query' : 'Define alert query'}</h3>
        </EuiTitle>
        {!draft.breach && (
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
                  isSelected={activeTab === tab.id}
                  onClick={() => onTabChange(tab.id)}
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
              onChange={(e) => onTimeFieldChange(e.target.value)}
              compressed
              prepend="Time field"
              data-test-subj="composeDiscoverTimeField"
            />
          </EuiFlexItem>
          <EuiFlexItem grow>
            <EuiSuperDatePicker
              start={draft.dateStart}
              end={draft.dateEnd}
              onTimeChange={({ start, end }) => {
                onDraftChange?.({ dateStart: start, dateEnd: end });
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
              baseQuery={draft.base}
              alertBlock={draft.breach}
              recoveryBlock={draft.recover}
              onBaseQueryChange={(v) => onDraftChange?.({ base: v })}
              onAlertBlockChange={(v) => onDraftChange?.({ breach: v })}
              onRecoveryBlockChange={(v) => onDraftChange?.({ recover: v })}
              activeTab={activeTab}
              onTabChange={onTabChange}
              tabConfig={tabConfig}
              onAlertEditorMount={onAlertEditorMount}
              onRecoveryEditorMount={onRecoveryEditorMount}
              readOnly={isReadOnly}
              hideTabBar
            />
          ) : (
            <CodeEditor
              languageId={ESQL_LANG_ID}
              value={draft.breach}
              onChange={(v) => onDraftChange?.({ breach: v })}
              height="100%"
              options={{
                minimap: { enabled: false },
                automaticLayout: true,
                scrollBeyondLastLine: false,
                fontSize: 13,
                readOnly: isReadOnly,
                domReadOnly: isReadOnly,
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

      {onApply && (
        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              <EuiButton fill onClick={handleDone} data-test-subj="composeDiscoverChildDone">
                Apply changes
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      )}
    </EuiFlyout>
  );
};
