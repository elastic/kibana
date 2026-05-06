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
  EuiBadge,
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
import type { ComposeDiscoverState, ComposeDiscoverAction } from './types';
import { ComposeDiscoverTabs } from './compose_discover_tabs';
import { useQueryExecution } from './use_query_execution';
import { useEsqlAutocomplete } from './use_esql_providers';
import { ComposeDiscoverChart } from './compose_discover_chart';

interface ComposeDiscoverChildProps {
  state: ComposeDiscoverState;
  dispatch: React.Dispatch<ComposeDiscoverAction>;
  services: RuleFormServices;
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

function getActiveQuery(state: ComposeDiscoverState, localQuery: string): string {
  if (!state.tracking) return localQuery;
  switch (state.activeTab) {
    case 'base':
      return state.baseQuery;
    case 'alert':
      return [state.baseQuery, state.alertBlock].filter(Boolean).join('\n');
    case 'recovery':
      return [state.baseQuery, state.recoveryBlock].filter(Boolean).join('\n');
    default:
      return [state.baseQuery, state.alertBlock].filter(Boolean).join('\n');
  }
}

export const ComposeDiscoverChild: React.FC<ComposeDiscoverChildProps> = ({
  state,
  dispatch,
  services,
  onClose,
}) => {
  useEsqlAutocomplete(services);

  const [localQuery, setLocalQuery] = useState(state.fullQuery);
  const [dateStart, setDateStart] = useState('now-15m');
  const [dateEnd, setDateEnd] = useState('now');

  const timeRange = useMemo(() => ({ from: dateStart, to: dateEnd }), [dateStart, dateEnd]);

  const activeQuery = getActiveQuery(state, localQuery);

  const { data: fieldMap } = useDataFields({
    query: activeQuery,
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

  const { columns, rows, totalRowCount, isLoading, isError, error, run, hasRun } =
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
        run();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [run]);

  const handleDone = useCallback(() => {
    if (state.tracking) {
      dispatch({
        type: 'COMMIT_CHILD_SPLIT',
        baseQuery: state.baseQuery,
        alertBlock: state.alertBlock,
        recoveryBlock: state.recoveryBlock,
      });
    } else {
      dispatch({ type: 'COMMIT_CHILD_QUERY', fullQuery: localQuery });
    }
    onClose();
  }, [state, localQuery, dispatch, onClose]);

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
      size="l"
      maxWidth="100%"
      onClose={onClose}
      aria-labelledby={CHILD_FLYOUT_TITLE_ID}
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s" id={CHILD_FLYOUT_TITLE_ID}>
          <h3>
            {!state.queryCommitted
              ? 'Define alert query'
              : state.tracking
                ? 'Edit rule queries'
                : 'Edit alert query'}
          </h3>
        </EuiTitle>
        {!state.queryCommitted && (
          <EuiText size="s" color="subdued">
            Write the ES|QL query that defines when this rule should alert. You&apos;ll configure
            the rest of the rule settings next.
          </EuiText>
        )}

        <EuiSpacer size="s" />

        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap>
          <EuiFlexItem grow={false}>
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
          <EuiFlexItem grow={false}>
            <EuiSuperDatePicker
              start={dateStart}
              end={dateEnd}
              onTimeChange={({ start, end }) => {
                setDateStart(start);
                setDateEnd(end);
              }}
              compressed
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiToolTip content={`Run query (${RUN_SHORTCUT_LABEL})`}>
              <EuiButton
                size="s"
                iconType="playFilled"
                onClick={run}
                isLoading={isLoading}
                data-test-subj="composeDiscoverRunQuery"
              >
                Run
              </EuiButton>
            </EuiToolTip>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow">{RUN_SHORTCUT_LABEL}</EuiBadge>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <EuiPanel hasBorder paddingSize="none" style={editorPanelStyles}>
          {state.tracking ? (
            <ComposeDiscoverTabs state={state} dispatch={dispatch} />
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

        <EuiSpacer size="m" />

        {!hasRun && (
          <EuiEmptyPrompt
            iconType="playFilled"
            title={<h4>Run your query to see results</h4>}
            body={
              <p>
                Click <strong>Run</strong> or press <strong>{RUN_SHORTCUT_LABEL}</strong> to execute
                the query.
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
              query={activeQuery}
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
                  {totalRowCount} {totalRowCount === 1 ? 'result' : 'results'}
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
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiButton fill onClick={handleDone} data-test-subj="composeDiscoverChildDone">
              {state.queryCommitted ? 'Done' : 'Next'}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
