/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  EuiTab,
  EuiTabs,
  EuiText,
  EuiTitle,
  EuiToolTip,
  type EuiDataGridColumn,
  type EuiDataGridCellValueElementProps,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { CodeEditor, ESQL_LANG_ID, type monaco } from '@kbn/code-editor';
import { useRuleFormServices } from '../../form/contexts/rule_form_context';
import { useDataFields } from '../../form/hooks/use_data_fields';
import { useQueryExecution } from './use_query_execution';
import { ComposeDiscoverChart } from './compose_discover_chart';
import { ComposeDiscoverTabs, TAB_DEFINITIONS } from './compose_discover_tabs';
import type { QueryTab } from './types';
import { CpsPicker } from './cps_picker';

/**
 * Self-contained ES|QL sandbox that handles data fetching and renders the full
 * query preview UI: code editor (or multi-tab editors), date picker, search
 * button, chart, and results grid.
 *
 * ## Editor modes
 *
 * - **Single editor** (default) — when `tabs` is absent or empty, renders a
 *   plain `CodeEditor`. Pass `onQueryChange` to make it editable.
 * - **Multi-tab editors** — when `tabs` is non-empty (e.g. `['base', 'alert']`),
 *   renders `ComposeDiscoverTabs` with a tab bar. The `tabProps` fields drive
 *   the split query blocks.
 *
 * Requires `RuleFormProvider` and `QueryClientProvider` in the ancestor tree.
 */
export interface QuerySandboxProps {
  query: string;
  onQueryChange?: (query: string) => void;
  timeField: string;
  onTimeFieldChange?: (timeField: string) => void;
  dateRange: { dateStart: string; dateEnd: string };
  onDateRangeChange: (range: { dateStart: string; dateEnd: string }) => void;
  /** Execute the query on mount. */
  autoRun?: boolean;
  /**
   * When provided, the editor panel renders `ComposeDiscoverTabs` with a tab
   * bar instead of a single `CodeEditor`. Absent or `[]` → single editor.
   */
  tabProps?: {
    tabs: QueryTab[];
    activeTab: QueryTab;
    onTabChange: (tab: QueryTab) => void;
    baseQuery: string;
    alertBlock: string;
    recoveryBlock: string;
    onBaseQueryChange: (v: string) => void;
    onAlertBlockChange: (v: string) => void;
    onRecoveryBlockChange: (v: string) => void;
    onAlertEditorMount?: (editor: monaco.editor.IStandaloneCodeEditor) => void;
    onRecoveryEditorMount?: (editor: monaco.editor.IStandaloneCodeEditor) => void;
    readOnly?: boolean;
  };
  /** Unified mode — opt into base/alert split editors via helper link. */
  onEditManually?: () => void;
  /** Split mode — return to a single editor via helper link. */
  onUseSingleEditor?: () => void;
  /** Show ES|QL title and helper text in unified alert mode (before first apply). */
  showUnifiedQueryHeader?: boolean;
  /** YAML mode — title, manual-split helper, and tabs (no unified/split toggle icons). */
  showYamlQueryHeader?: boolean;
  /** Recovery step — title and helper; single editor for the recovery block (no tab bar). */
  showRecoveryQueryHeader?: boolean;
  /** Signal rules — title and helper on the condition step (single editor, no split copy). */
  showSignalQueryHeader?: boolean;
  /** Query executed for Search/preview when it differs from the editor value (recovery step). */
  previewQuery?: string;
  onEditorMount?: (editor: monaco.editor.IStandaloneCodeEditor) => void;
}

const VISIBLE_ROWS = 10;
const INITIAL_EDITOR_HEIGHT = 200;
const MIN_EDITOR_HEIGHT = 80;
const MAX_EDITOR_HEIGHT = 600;

const ESQL_QUERY_TITLE = i18n.translate(
  'xpack.alertingV2.composeDiscover.querySandbox.esqlQueryTitle',
  { defaultMessage: 'ES|QL query' }
);

const SPLIT_BASE_AND_ALERT_LABEL = i18n.translate(
  'xpack.alertingV2.composeDiscover.querySandbox.splitBaseAndAlertButton',
  { defaultMessage: 'Split base and alert' }
);

const SPLIT_BASE_AND_ALERT_TOOLTIP = i18n.translate(
  'xpack.alertingV2.composeDiscover.querySandbox.splitBaseAndAlertTooltip',
  {
    defaultMessage:
      'Open separate editors for the base query and alert condition. Automatic splitting is disabled in this mode.',
  }
);

const USE_SINGLE_EDITOR_LABEL = i18n.translate(
  'xpack.alertingV2.composeDiscover.querySandbox.useSingleEditorButton',
  { defaultMessage: 'Use single editor' }
);

const USE_SINGLE_EDITOR_TOOLTIP = i18n.translate(
  'xpack.alertingV2.composeDiscover.querySandbox.useSingleEditorTooltip',
  {
    defaultMessage:
      'Combine the base query and alert condition in one editor. When you apply, we automatically split them again.',
  }
);

const UNIFIED_QUERY_HELPER_TEXT = i18n.translate(
  'xpack.alertingV2.composeDiscover.querySandbox.unifiedQueryHelperText',
  {
    defaultMessage:
      "We'll automatically identify the base query and alert condition when you apply changes.",
  }
);

const MANUAL_SPLIT_QUERY_HELPER_TEXT = i18n.translate(
  'xpack.alertingV2.composeDiscover.querySandbox.manualSplitQueryHelperText',
  {
    defaultMessage:
      'Define the base query and alert condition separately. Automatic query splitting is disabled in this mode.',
  }
);

const YAML_QUERY_HELPER_TEXT = i18n.translate(
  'xpack.alertingV2.composeDiscover.querySandbox.yamlQueryHelperText',
  {
    defaultMessage:
      'Edit in YAML view or in this query sandbox. Apply changes to update the YAML. Each query block is on its own tab.',
  }
);

const RECOVERY_QUERY_TITLE = i18n.translate(
  'xpack.alertingV2.composeDiscover.querySandbox.recoveryQueryTitle',
  { defaultMessage: 'Recovery condition' }
);

const RECOVERY_QUERY_HELPER_TEXT = i18n.translate(
  'xpack.alertingV2.composeDiscover.querySandbox.recoveryQueryHelperText',
  {
    defaultMessage:
      'Define when the alert should recover. This ES|QL block is evaluated against the base query.',
  }
);

const SIGNAL_QUERY_HELPER_TEXT = i18n.translate(
  'xpack.alertingV2.composeDiscover.querySandbox.signalQueryHelperText',
  {
    defaultMessage:
      'Define what to detect with ES|QL. Each match is recorded as a signal for querying and investigation, without alert lifecycle or notifications.',
  }
);

const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);
const RUN_SHORTCUT_LABEL = isMac ? '⌘⏎' : 'Ctrl+Enter';

export const QuerySandbox: React.FC<QuerySandboxProps> = ({
  query,
  onQueryChange,
  timeField,
  onTimeFieldChange,
  dateRange,
  onDateRangeChange,
  autoRun = false,
  tabProps,
  onEditManually,
  onUseSingleEditor,
  showUnifiedQueryHeader = false,
  showYamlQueryHeader = false,
  showRecoveryQueryHeader = false,
  showSignalQueryHeader = false,
  previewQuery,
  onEditorMount,
}) => {
  const services = useRuleFormServices();
  const isReadOnly = !onQueryChange;
  const hasTabs = Boolean(tabProps?.tabs?.length);

  const splitTabs = useMemo(() => {
    if (!tabProps?.tabs?.length) return [];
    return TAB_DEFINITIONS.filter((t) => tabProps.tabs.includes(t.id));
  }, [tabProps?.tabs]);

  const showEsqlQueryHeader = Boolean(
    showUnifiedQueryHeader ||
      showYamlQueryHeader ||
      showRecoveryQueryHeader ||
      showSignalQueryHeader ||
      onEditManually ||
      onUseSingleEditor
  );
  const showTabsBelowHeader =
    splitTabs.length > 0 &&
    Boolean(tabProps) &&
    showEsqlQueryHeader &&
    !showRecoveryQueryHeader;
  const showTabsWithoutHeader =
    splitTabs.length > 0 && Boolean(tabProps) && !showEsqlQueryHeader && !showRecoveryQueryHeader;
  const showEditorChrome =
    showEsqlQueryHeader || showTabsBelowHeader || showTabsWithoutHeader;
  const querySectionTitle = showRecoveryQueryHeader ? RECOVERY_QUERY_TITLE : ESQL_QUERY_TITLE;

  const queryHelperContent = useMemo(() => {
    if (showRecoveryQueryHeader) {
      return RECOVERY_QUERY_HELPER_TEXT;
    }

    if (showSignalQueryHeader) {
      return SIGNAL_QUERY_HELPER_TEXT;
    }

    if (showYamlQueryHeader) {
      return YAML_QUERY_HELPER_TEXT;
    }

    if (onUseSingleEditor) {
      return MANUAL_SPLIT_QUERY_HELPER_TEXT;
    }

    if (onEditManually) {
      return UNIFIED_QUERY_HELPER_TEXT;
    }

    return UNIFIED_QUERY_HELPER_TEXT;
  }, [showRecoveryQueryHeader, showSignalQueryHeader, showYamlQueryHeader, onUseSingleEditor, onEditManually]);

  const modeSwitchButton = useMemo(() => {
    if (onEditManually) {
      return (
        <EuiToolTip content={SPLIT_BASE_AND_ALERT_TOOLTIP}>
          <EuiButton
            size="s"
            color="text"
            iconType="inputOutput"
            onClick={onEditManually}
            data-test-subj="querySandboxSeparateBaseAndAlert"
          >
            {SPLIT_BASE_AND_ALERT_LABEL}
          </EuiButton>
        </EuiToolTip>
      );
    }

    if (onUseSingleEditor) {
      return (
        <EuiToolTip content={USE_SINGLE_EDITOR_TOOLTIP}>
          <EuiButton
            size="s"
            color="text"
            iconType="querySelector"
            onClick={onUseSingleEditor}
            data-test-subj="querySandboxUseSingleEditor"
          >
            {USE_SINGLE_EDITOR_LABEL}
          </EuiButton>
        </EuiToolTip>
      );
    }

    return null;
  }, [onEditManually, onUseSingleEditor]);

  const executionQuery = previewQuery ?? query;

  const timeRange = useMemo(
    () => ({ from: dateRange.dateStart, to: dateRange.dateEnd }),
    [dateRange.dateStart, dateRange.dateEnd]
  );

  const queryForFields = /^\s*FROM\s+[a-zA-Z0-9_.*-]/i.test(executionQuery) ? executionQuery : '';
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
      return [{ value: '@timestamp', text: '@timestamp' }];
    }

    return dateFields.map((name) => ({ value: name, text: name }));
  }, [fieldMap]);

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
    query: executionQuery,
    timeField,
    timeRange,
    data: services.data,
  });

  useEffect(() => {
    if (autoRun) {
      run();
    }
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

  useEffect(() => {
    setVisibleColumns(columns.map((c) => c.id));
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
    <div data-test-subj="querySandbox">
      {showEditorChrome && (
        <>
          {showEsqlQueryHeader && (
            <>
              <EuiFlexGroup alignItems="flexEnd" gutterSize="m" responsive={false}>
                <EuiFlexItem>
                  <EuiTitle size="xs" data-test-subj="querySandboxEsqlQueryTitle">
                    <h3>{querySectionTitle}</h3>
                  </EuiTitle>
                  <EuiSpacer size="xs" />
                  <EuiText size="xs" color="subdued" data-test-subj="querySandboxSeparateQueryHelper">
                    {queryHelperContent}
                  </EuiText>
                </EuiFlexItem>
                {modeSwitchButton && (
                  <EuiFlexItem grow={false}>{modeSwitchButton}</EuiFlexItem>
                )}
              </EuiFlexGroup>
              <EuiSpacer size="s" />
            </>
          )}
          {(showTabsBelowHeader || showTabsWithoutHeader) && tabProps && (
            <>
              <EuiTabs>
                {splitTabs.map((tab) => (
                  <EuiTab
                    key={tab.id}
                    isSelected={tabProps.activeTab === tab.id}
                    onClick={() => tabProps.onTabChange(tab.id)}
                    data-test-subj={`querySandboxTab-${tab.id}`}
                  >
                    {tab.label}
                  </EuiTab>
                ))}
              </EuiTabs>
              <EuiSpacer size="s" />
            </>
          )}
        </>
      )}

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
            data-test-subj="querySandboxTimeField"
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
            content={i18n.translate('xpack.alertingV2.composeDiscover.querySandbox.searchTooltip', {
              defaultMessage: 'Search ({shortcut})',
              values: { shortcut: RUN_SHORTCUT_LABEL },
            })}
          >
            <EuiButton
              size="s"
              onClick={run}
              isLoading={isLoading}
              data-test-subj="querySandboxRunQuery"
            >
              {i18n.translate('xpack.alertingV2.composeDiscover.querySandbox.searchButtonLabel', {
                defaultMessage: 'Search',
              })}
            </EuiButton>
          </EuiToolTip>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />

      <EuiPanel hasBorder paddingSize="s" style={{ ...editorPanelStyles }}>
        {tabProps && hasTabs ? (
          <ComposeDiscoverTabs
            baseQuery={tabProps.baseQuery}
            alertBlock={tabProps.alertBlock}
            recoveryBlock={tabProps.recoveryBlock}
            onBaseQueryChange={tabProps.onBaseQueryChange}
            onAlertBlockChange={tabProps.onAlertBlockChange}
            onRecoveryBlockChange={tabProps.onRecoveryBlockChange}
            activeTab={tabProps.activeTab}
            onTabChange={tabProps.onTabChange}
            tabs={tabProps.tabs}
            onAlertEditorMount={tabProps.onAlertEditorMount}
            onRecoveryEditorMount={tabProps.onRecoveryEditorMount}
            readOnly={tabProps.readOnly}
            hideTabBar
          />
        ) : (
          <CodeEditor
            languageId={ESQL_LANG_ID}
            value={query}
            onChange={(v) => onQueryChange?.(v)}
            height="100%"
            editorDidMount={onEditorMount}
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

      {hasRun && !isLoading && !isError && (
        <EuiText size="xs" color="subdued">
          {i18n.translate('xpack.alertingV2.composeDiscover.querySandbox.resultCountLabel', {
            defaultMessage: '{count, plural, one {# result} other {# results}}',
            values: { count: totalRowCount },
          })}
        </EuiText>
      )}

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

      {hasRun && !isLoading && !isError && rows.length === 0 && query.trim() && (
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
            query={lastExecutedQuery ?? query}
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
    </div>
  );
};
