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

/**
 * Props for the Discover Sandbox flyout — a full-screen ES|QL editor with live
 * query execution, time-range selection, and a results grid.
 *
 * ## Usage modes
 *
 * **Compose Discover flyout (default)** — the parent owns the draft and commits it
 * to RHF on Apply. Pass `draft`, `onDraftChange`, and `onApply`.
 *
 * **Rule Builder preview** — show the committed query read-only so the user can
 * inspect it before closing. Omit `onDraftChange` (makes editors read-only) and
 * omit `onApply` (hides the Apply button; only the close button is shown).
 *
 * **Rule Builder edit** — let the user edit the query but commit on their own
 * terms. Pass `onDraftChange` but omit `onApply` (close-only, no Apply button).
 *
 * ## State ownership
 *
 * `ComposeDiscoverChild` is a **props-only component** — it owns no query state.
 * The parent is responsible for:
 * - Holding `SandboxDraft` (editing buffer) via `useSandboxDraft`
 * - Holding `timeField` in RHF (`ComposeFormValues.timeField`)
 * - Owning `activeTab` in the UI-state reducer
 * - Calling `draftToRuleQuery(draft, tracking)` and writing to RHF on Apply
 *
 * @see useSandboxDraft — editing buffer hook; keeps draft across open/close cycles
 * @see draftToRuleQuery — converts draft + tracking flag to the `RuleQuery` API shape
 */
export interface ComposeDiscoverChildProps {
  /** Editing buffer for all query strings and the preview date range. */
  draft: SandboxDraft;
  /**
   * Called with a partial update on every editor keystroke and date-picker change.
   * When absent, all query editors are read-only (mirrors the uncontrolled-input pattern).
   * The time field selector remains interactive regardless of this prop.
   */
  onDraftChange?: (update: Partial<SandboxDraft>) => void;
  /**
   * The ES|QL field used as the time axis (e.g. `@timestamp`). This is a rule
   * configuration value stored in RHF — kept separate from `draft` so the selector
   * remains interactive even when query editors are read-only.
   */
  timeField: string;
  onTimeFieldChange: (field: string) => void;
  /** Controls whether the Sandbox renders a single editor or a split Base/Alert/Recovery layout. */
  tabConfig: SandboxTabConfig;
  /** Active tab, owned by the parent reducer and passed down as a controlled value. */
  activeTab: QueryTab;
  onTabChange: (tab: QueryTab) => void;
  /**
   * When true, all query editors are locked regardless of `onDraftChange`.
   * Use this for Rule Builder read-only preview mode.
   */
  readOnlyQueries?: boolean;
  /**
   * When provided, an "Apply changes" button is rendered in the flyout footer.
   * Clicking it should commit `draft` to RHF (e.g. via `draftToRuleQuery`) and
   * close the child flyout.
   * When absent, no Apply button is shown — the flyout is close-only.
   */
  onApply?: () => void;
  onClose: () => void;
  /** Flyout header title. Defaults to "Query sandbox". */
  title?: string;
  /** Called with the Monaco editor instance when the alert-block editor mounts.
   *  Use this to register split-query autocomplete providers at the flyout level. */
  onAlertEditorMount?: (editor: monaco.editor.IStandaloneCodeEditor) => void;
  /** Called with the Monaco editor instance when the recovery-block editor mounts. */
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
  title = 'Query sandbox',
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
          <h3>{title}</h3>
        </EuiTitle>
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
