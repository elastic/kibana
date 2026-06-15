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
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { CodeEditor, ESQL_LANG_ID, type monaco } from '@kbn/code-editor';
import { CpsPicker } from './cps_picker';
import { useRuleFormServices } from '../../form/contexts/rule_form_context';
import { useDataFields } from '../../form/hooks/use_data_fields';
import type { RuleQuery } from './compose_form_types';
import type { QueryTab } from './types';
import { useQueryExecution } from './use_query_execution';
import { ComposeDiscoverChart } from './compose_discover_chart';
import { ComposeDiscoverTabs, TAB_DEFINITIONS } from './compose_discover_tabs';

/**
 * Props for the Discover Sandbox flyout — a full-screen ES|QL editor with live
 * query execution, time-range selection, and a results grid.
 *
 * ## Usage modes
 *
 * **Compose Discover flyout (editable)** — pass `query`, `onQueryChange`, and `onApply`.
 * The parent holds the editing buffer; Apply commits it to RHF.
 *
 * **Preview / read-only** — omit `onQueryChange` (makes all editors read-only) and
 * omit `onApply` (hides the Apply button). Only the close button is shown.
 *
 * **Edit without Apply** — pass `onQueryChange` but omit `onApply`. The flyout has
 * editors but no Apply button; the caller commits on its own terms.
 *
 * ## State ownership
 *
 * `QuerySandboxFlyout` is a **props-only component** — it owns no query state.
 * The parent holds `query`, `timeField`, and `dateRange` as separate `useState`s and
 * passes them down. `query` and `timeField` reset to committed RHF values on close;
 * `dateRange` persists across open/close cycles.
 */
export interface QuerySandboxFlyoutProps {
  /** The live query being edited. Shape drives the split-editor layout. */
  query: RuleQuery;
  /** Called on every editor change. Absent → all query editors are read-only. */
  onQueryChange?: (q: RuleQuery) => void;
  /**
   * Which tabs to show. Absent or [] → single editor, no tab bar.
   * ['base', 'alert'] → base-alert split; ['recovery'] → recovery tab only.
   */
  tabs?: QueryTab[];
  /** Active tab — ignored when tabs is absent/[]. */
  activeTab?: QueryTab;
  /** Should always be provided when tabs is non-empty — without it tab clicks are no-ops. */
  onTabChange?: (tab: QueryTab) => void;
  timeField: string;
  /** Absent → time field selector is read-only. */
  onTimeFieldChange?: (tf: string) => void;
  /** Preview date range. Never resets on close — caller owns persistence. */
  dateRange: { dateStart: string; dateEnd: string };
  /** Always required — date range is always interactive. */
  onDateRangeChange: (r: { dateStart: string; dateEnd: string }) => void;
  /** When provided an Apply button is shown. No-args: caller already holds current state. */
  onApply?: () => void;
  onClose: () => void;
  title?: string;
  onAlertEditorMount?: (editor: monaco.editor.IStandaloneCodeEditor) => void;
  onRecoveryEditorMount?: (editor: monaco.editor.IStandaloneCodeEditor) => void;
}

const QUERY_SANDBOX_TITLE_ID = 'composeDiscoverChildTitle';
const VISIBLE_ROWS = 10;
const INITIAL_EDITOR_HEIGHT = 200;
const MIN_EDITOR_HEIGHT = 80;
const MAX_EDITOR_HEIGHT = 600;
const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);
const RUN_SHORTCUT_LABEL = isMac ? '⌘⏎' : 'Ctrl+Enter';

export const QuerySandboxFlyout: React.FC<QuerySandboxFlyoutProps> = ({
  query,
  onQueryChange,
  tabs,
  activeTab = 'alert',
  onTabChange,
  timeField,
  onTimeFieldChange,
  dateRange,
  onDateRangeChange,
  onApply,
  onClose,
  onAlertEditorMount,
  onRecoveryEditorMount,
  title = i18n.translate('xpack.alertingV2.composeDiscover.querySandbox.defaultTitle', {
    defaultMessage: 'Query sandbox',
  }),
}) => {
  const services = useRuleFormServices();
  const isReadOnly = !onQueryChange;

  // Normalize query fields once — format check lives only here and in updateQuery.
  const queryFields = useMemo(
    () =>
      query.format === 'composed'
        ? { base: query.base, breach: query.blocks.breach, recover: query.blocks.recover ?? '' }
        : { base: query.no_data ?? '', breach: query.breach, recover: query.recover ?? '' },
    [query]
  );

  const updateQuery = useCallback(
    (patch: { base?: string; breach?: string; recover?: string }) => {
      if (!onQueryChange) return;
      const next = { ...queryFields, ...patch };
      onQueryChange(
        query.format === 'composed'
          ? {
              format: 'composed',
              base: next.base,
              blocks: { breach: next.breach, ...(next.recover ? { recover: next.recover } : {}) },
            }
          : {
              format: 'standalone',
              breach: next.breach,
              ...(next.base ? { no_data: next.base } : {}),
              ...(next.recover ? { recover: next.recover } : {}),
            }
      );
    },
    [query, queryFields, onQueryChange]
  );

  const timeRange = useMemo(
    () => ({ from: dateRange.dateStart, to: dateRange.dateEnd }),
    [dateRange.dateStart, dateRange.dateEnd]
  );

  // For execution and chart: always use base + alert block (composed) or the full
  // breach query (standalone). In YAML mode the format may transiently lead the
  // reducer tracking flag — assembling here keeps execution correct regardless.
  const activeQuery =
    query.format === 'composed'
      ? [query.base, query.blocks.breach].filter(Boolean).join('\n')
      : query.breach;

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
      if (timeField !== '@timestamp') onTimeFieldChange?.('@timestamp');
    } else if (!dateFieldNames.includes(timeField)) {
      onTimeFieldChange?.(dateFieldNames[0]);
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

  // Auto-run the active query when the sandbox opens. No-ops if the query is
  // empty, so a blank editor on first open shows the "Run your query" prompt.
  useEffect(() => {
    run();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  const splitTabs = useMemo(() => {
    if (!tabs?.length) return [];
    return TAB_DEFINITIONS.filter((t) => tabs.includes(t.id));
  }, [tabs]);

  const editorPanelStyles = useMemo(
    () => ({
      resize: 'vertical' as const,
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
      aria-labelledby={QUERY_SANDBOX_TITLE_ID}
      closeButtonProps={{ 'data-test-subj': 'querySandboxClose' }}
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s" id={QUERY_SANDBOX_TITLE_ID}>
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
                  onClick={() => onTabChange?.(tab.id)}
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
          <CpsPicker />
          <EuiFlexItem grow={false} style={{ width: 200, minWidth: 0 }}>
            <EuiSelect
              options={timeFieldOptions}
              value={timeField}
              aria-label={i18n.translate(
                'xpack.alertingV2.composeDiscover.querySandbox.timeFieldAriaLabel',
                { defaultMessage: 'Time field for rule execution' }
              )}
              onChange={(e) => onTimeFieldChange?.(e.target.value)}
              disabled={!onTimeFieldChange}
              compressed
              prepend={i18n.translate(
                'xpack.alertingV2.composeDiscover.querySandbox.timeFieldPrependLabel',
                { defaultMessage: 'Time field' }
              )}
              data-test-subj="composeDiscoverTimeField"
            />
          </EuiFlexItem>
          <EuiFlexItem grow>
            <EuiSuperDatePicker
              start={dateRange.dateStart}
              end={dateRange.dateEnd}
              onTimeChange={({ start, end }) => {
                onDateRangeChange({ dateStart: start, dateEnd: end });
              }}
              showUpdateButton={false}
              compressed
              width="full"
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiToolTip
              content={i18n.translate(
                'xpack.alertingV2.composeDiscover.querySandbox.searchTooltip',
                { defaultMessage: 'Search ({shortcut})', values: { shortcut: RUN_SHORTCUT_LABEL } }
              )}
            >
              <EuiButton
                size="s"
                onClick={run}
                isLoading={isLoading}
                data-test-subj="composeDiscoverRunQuery"
              >
                {i18n.translate('xpack.alertingV2.composeDiscover.querySandbox.searchButtonLabel', {
                  defaultMessage: 'Search',
                })}
              </EuiButton>
            </EuiToolTip>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />

        {/* ── 2. Editor — bordered panel ──────────────────────────────── */}
        <EuiPanel paddingSize="s" style={{ ...editorPanelStyles }}>
          {tabs?.length ? (
            <ComposeDiscoverTabs
              baseQuery={queryFields.base}
              alertBlock={queryFields.breach}
              recoveryBlock={queryFields.recover}
              onBaseQueryChange={(v) => updateQuery({ base: v })}
              onAlertBlockChange={(v) => updateQuery({ breach: v })}
              onRecoveryBlockChange={(v) => updateQuery({ recover: v })}
              activeTab={activeTab}
              onTabChange={onTabChange ?? (() => {})}
              tabs={tabs}
              onAlertEditorMount={onAlertEditorMount}
              onRecoveryEditorMount={onRecoveryEditorMount}
              readOnly={isReadOnly}
              hideTabBar
            />
          ) : (
            <CodeEditor
              languageId={ESQL_LANG_ID}
              value={queryFields.breach}
              onChange={(v) => updateQuery({ breach: v })}
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
            {i18n.translate('xpack.alertingV2.composeDiscover.querySandbox.resultCountLabel', {
              defaultMessage: '{count, plural, one {# result} other {# results}}',
              values: { count: totalRowCount },
            })}
          </EuiText>
        )}

        <EuiSpacer size="s" />

        {/* ── 4. Results ──────────────────────────────────────────────── */}
        <EuiSpacer size="m" />

        {!hasRun && (
          <EuiEmptyPrompt
            iconType="playFilled"
            title={
              <h4>
                <FormattedMessage
                  id="xpack.alertingV2.composeDiscover.querySandbox.runPromptTitle"
                  defaultMessage="Run your query to see results"
                />
              </h4>
            }
            body={
              <p>
                <FormattedMessage
                  id="xpack.alertingV2.composeDiscover.querySandbox.runPromptDescription"
                  defaultMessage="Click <strong>Search</strong> or press <strong>{shortcut}</strong> to execute the query."
                  values={{
                    shortcut: RUN_SHORTCUT_LABEL,
                    strong: (chunks) => <strong>{chunks}</strong>,
                  }}
                />
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
          <EuiCallOut
            announceOnMount
            color="danger"
            iconType="error"
            title={i18n.translate('xpack.alertingV2.composeDiscover.querySandbox.queryErrorTitle', {
              defaultMessage: 'Query error',
            })}
          >
            <p>{error}</p>
          </EuiCallOut>
        )}

        {hasRun && !isLoading && !isError && rows.length === 0 && activeQuery.trim() && (
          <EuiEmptyPrompt
            iconType="search"
            title={
              <h4>
                <FormattedMessage
                  id="xpack.alertingV2.composeDiscover.querySandbox.noResultsTitle"
                  defaultMessage="No results"
                />
              </h4>
            }
            body={
              <p>
                <FormattedMessage
                  id="xpack.alertingV2.composeDiscover.querySandbox.noResultsDescription"
                  defaultMessage="The query returned no results for the current time range."
                />
              </p>
            }
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
              aria-label={i18n.translate(
                'xpack.alertingV2.composeDiscover.querySandbox.queryResultsAriaLabel',
                { defaultMessage: 'Query results' }
              )}
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
              <EuiButton fill onClick={onApply} data-test-subj="querySandboxApply">
                {i18n.translate('xpack.alertingV2.composeDiscover.querySandbox.applyButtonLabel', {
                  defaultMessage: 'Apply changes',
                })}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      )}
    </EuiFlyout>
  );
};
