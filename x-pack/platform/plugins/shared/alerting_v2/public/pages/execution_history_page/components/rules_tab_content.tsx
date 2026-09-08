/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiScreenReaderOnly,
  EuiSelect,
  EuiSpacer,
  EuiTablePagination,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import moment from 'moment';
import { CoreStart, useService } from '@kbn/core-di-browser';
import {
  DataLoadingState,
  UnifiedDataTable,
  type CustomCellRenderer,
  type DataGridCellValueElementProps,
  type SortOrder,
} from '@kbn/unified-data-table';
import { CellActionsProvider } from '@kbn/cell-actions';
import { asDuration } from '@kbn/alerts-ui-shared';
import { useAlertingRulesCache } from '@kbn/alerting-v2-episodes-ui/hooks/use_alerting_rules_cache';
import type { RuleExecutionOutcome } from '@kbn/alerting-v2-schemas';
import { EXECUTION_HISTORY_MAX_RESULT_WINDOW } from '@kbn/alerting-v2-schemas';
import { UserCapabilities } from '../../../services/user_capabilities';
import { useFetchRuleExecutions } from '../../../hooks/use_fetch_rule_executions';
import {
  RULE_EXECUTION_FIELDS,
  ruleExecutionToDataTableRecord,
  useRuleExecutionsDataView,
} from '../data_view';
import { useExecutionHistoryTableConfig } from '../hooks/use_execution_history_table_config';
import { useUnifiedDataTableServices } from '../hooks/use_unified_data_table_services';
import { FilteredEmptyState, RulesEmptyState } from './empty_state';
import { ExecutionHistoryErrorState } from './error_state';

const DEFAULT_PER_PAGE = 10;
const PAGE_SIZE_OPTIONS = [10, 50, 100];
const MS_TO_US = 1000;

// Sorting is disabled (server-side paging), but the grid requires a `sort` value.
const EMPTY_SORT: SortOrder[] = [];

// UnifiedDataTable requires a CellActionsProvider, but the synthetic data view can't be filtered,
// so we offer no cell actions. Copy-value and cell expansion are built in and unaffected.
const getNoCellActions = () => Promise.resolve([]);

const noFlexGrowCss = css`
  flex-grow: 0;
`;

const gridStyleOverride = {
  border: 'all' as const,
  header: 'shade' as const,
  stripes: false,
};

const RULES_DEFAULT_VISIBLE_COLUMNS: string[] = [
  RULE_EXECUTION_FIELDS.startedAt,
  RULE_EXECUTION_FIELDS.ruleId,
  RULE_EXECUTION_FIELDS.duration,
  RULE_EXECUTION_FIELDS.outcome,
  RULE_EXECUTION_FIELDS.message,
];

type RuleOutcomeFilter = 'all' | RuleExecutionOutcome;

const toOutcomeParam = (filter: RuleOutcomeFilter): RuleExecutionOutcome[] | undefined =>
  filter === 'all' ? undefined : [filter];

const OUTCOME_OPTIONS: Array<{ value: RuleOutcomeFilter; text: string }> = [
  {
    value: 'all',
    text: i18n.translate('xpack.alertingV2.executionHistory.rulesTab.outcome.all', {
      defaultMessage: 'All',
    }),
  },
  {
    value: 'success',
    text: i18n.translate('xpack.alertingV2.executionHistory.rulesTab.outcome.success', {
      defaultMessage: 'Success',
    }),
  },
  {
    value: 'failure',
    text: i18n.translate('xpack.alertingV2.executionHistory.rulesTab.outcome.failure', {
      defaultMessage: 'Failure',
    }),
  },
];

const RULE_SUCCESS_MESSAGE = i18n.translate(
  'xpack.alertingV2.executionHistory.rulesTab.successMessage',
  { defaultMessage: 'Rule executed successfully' }
);

type RulesCache = Record<string, { metadata: { name: string } }>;

const RuleTimestampCell = ({
  row,
  dateTimeFormat,
}: DataGridCellValueElementProps & { dateTimeFormat: string }) => (
  <>{moment(row.flattened[RULE_EXECUTION_FIELDS.startedAt] as string).format(dateTimeFormat)}</>
);

const RuleNameCell = ({
  row,
  rulesCache,
  onRuleClick,
}: DataGridCellValueElementProps & {
  rulesCache: RulesCache;
  onRuleClick: (ruleId: string) => void;
}) => {
  const ruleId = row.flattened[RULE_EXECUTION_FIELDS.ruleId] as string;
  const ruleName = rulesCache[ruleId]?.metadata?.name;
  return ruleName != null ? (
    <EuiButtonEmpty
      size="xs"
      flush="left"
      onClick={() => onRuleClick(ruleId)}
      data-test-subj={`ruleExecutionHistoryRuleLink-${ruleId}`}
    >
      {ruleName}
    </EuiButtonEmpty>
  ) : (
    <>{ruleId}</>
  );
};

const RuleDurationCell = ({ row }: DataGridCellValueElementProps) => (
  <>{asDuration(Number(row.flattened[RULE_EXECUTION_FIELDS.duration]) * MS_TO_US)}</>
);

const RuleResponseCell = ({ row }: DataGridCellValueElementProps) => {
  const outcome = row.flattened[RULE_EXECUTION_FIELDS.outcome] as RuleExecutionOutcome;
  return (
    <EuiBadge
      color={outcome === 'success' ? 'success' : 'danger'}
      iconType={outcome === 'success' ? 'check' : 'cross'}
    >
      {outcome}
    </EuiBadge>
  );
};

const RuleMessageCell = ({ row }: DataGridCellValueElementProps) => {
  const message = row.flattened[RULE_EXECUTION_FIELDS.message] as string | null;
  const outcome = row.flattened[RULE_EXECUTION_FIELDS.outcome] as RuleExecutionOutcome;
  return <>{message ?? (outcome === 'success' ? RULE_SUCCESS_MESSAGE : '—')}</>;
};

interface Props {
  onRuleClick: (ruleId: string) => void;
}

export const RulesTabContent = ({ onRuleClick }: Props) => {
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(DEFAULT_PER_PAGE);
  const [outcomeFilter, setOutcomeFilter] = useState<RuleOutcomeFilter>('all');

  const { data, isFetching, isError, refetch } = useFetchRuleExecutions({
    page: page + 1,
    perPage,
    outcome: toOutcomeParam(outcomeFilter),
  });

  const http = useService(CoreStart('http'));
  const settings = useService(CoreStart('settings'));
  const dateTimeFormat = settings.client.get<string>('dateFormat');
  const canReadRules = useService(UserCapabilities).canRead('rules');

  const services = useUnifiedDataTableServices();
  const { dataView, error: dataViewError } = useRuleExecutionsDataView();
  const { visibleColumns, setVisibleColumns, settings: tableSettings, onColumnResize, rowHeight, setRowHeight } =
    useExecutionHistoryTableConfig({ defaultVisibleColumns: RULES_DEFAULT_VISIBLE_COLUMNS });

  const items = useMemo(() => data?.items ?? [], [data?.items]);
  const rows = useMemo(() => items.map(ruleExecutionToDataTableRecord), [items]);

  const ruleIds = useMemo(
    () => (canReadRules ? [...new Set(items.map((item) => item.rule.id))] : []),
    [items, canReadRules]
  );

  const { rulesCache } = useAlertingRulesCache({
    ruleIds,
    services: { http },
  });

  const externalCustomRenderers = useMemo<CustomCellRenderer>(
    () => ({
      [RULE_EXECUTION_FIELDS.startedAt]: (props) => (
        <RuleTimestampCell {...props} dateTimeFormat={dateTimeFormat} />
      ),
      [RULE_EXECUTION_FIELDS.ruleId]: (props) => (
        <RuleNameCell {...props} rulesCache={rulesCache} onRuleClick={onRuleClick} />
      ),
      [RULE_EXECUTION_FIELDS.duration]: RuleDurationCell,
      [RULE_EXECUTION_FIELDS.outcome]: RuleResponseCell,
      [RULE_EXECUTION_FIELDS.message]: RuleMessageCell,
    }),
    [dateTimeFormat, rulesCache, onRuleClick]
  );

  const onOutcomeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setOutcomeFilter(e.target.value as RuleOutcomeFilter);
    setPage(0);
  }, []);

  const onChangePage = useCallback((pageIndex: number) => setPage(pageIndex), []);
  const onChangeItemsPerPage = useCallback((size: number) => {
    setPerPage(size);
    setPage(0);
  }, []);

  // Clamp the total to the API's max result window so pagination can't page past it.
  const total = Math.min(data?.total ?? 0, EXECUTION_HISTORY_MAX_RESULT_WINDOW);
  const pageCount = Math.ceil(total / perPage);
  const isFiltered = outcomeFilter !== 'all';
  const showEmptyState = !isFetching && items.length === 0;

  const renderContent = () => {
    if (!dataView) {
      return (
        <EuiFlexGroup justifyContent="center">
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="l" />
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    }

    if (showEmptyState) {
      return isFiltered ? <FilteredEmptyState /> : <RulesEmptyState />;
    }

    return (
      <div data-test-subj="ruleExecutionHistoryTable">
        <EuiScreenReaderOnly>
          <span id="ruleExecutionHistoryTableAriaLabel">
            {i18n.translate('xpack.alertingV2.executionHistory.rulesTab.tableCaption', {
              defaultMessage: 'Rule execution history',
            })}
          </span>
        </EuiScreenReaderOnly>
        <CellActionsProvider getTriggerCompatibleActions={getNoCellActions}>
          <UnifiedDataTable
            ariaLabelledBy="ruleExecutionHistoryTableAriaLabel"
            dataView={dataView}
            columns={visibleColumns}
            onSetColumns={setVisibleColumns}
            rows={rows}
            loadingState={isFetching ? DataLoadingState.loading : DataLoadingState.loaded}
            sampleSizeState={rows.length}
            totalHits={total}
            isPaginationEnabled={false}
            isSortEnabled={false}
            sort={EMPTY_SORT}
            showTimeCol={false}
            settings={tableSettings}
            onResize={onColumnResize}
            rowHeightState={rowHeight}
            onUpdateRowHeight={setRowHeight}
            externalCustomRenderers={externalCustomRenderers}
            gridStyleOverride={gridStyleOverride}
            services={services}
          />
        </CellActionsProvider>
        <EuiSpacer size="s" />
        <EuiTablePagination
          aria-label={i18n.translate(
            'xpack.alertingV2.executionHistory.rulesTab.paginationAriaLabel',
            { defaultMessage: 'Rule execution history pagination' }
          )}
          pageCount={pageCount}
          activePage={page}
          onChangePage={onChangePage}
          itemsPerPage={perPage}
          onChangeItemsPerPage={onChangeItemsPerPage}
          itemsPerPageOptions={PAGE_SIZE_OPTIONS}
          showPerPageOptions
        />
      </div>
    );
  };

  if (isError || dataViewError) {
    return <ExecutionHistoryErrorState onRetry={() => refetch()} />;
  }

  return (
    <>
      <EuiFlexGroup gutterSize="s" direction="row" responsive={false} css={noFlexGrowCss}>
        <EuiFlexItem grow={false}>
          <EuiSelect
            compressed
            data-test-subj="ruleExecutionHistoryOutcomeFilter"
            options={OUTCOME_OPTIONS}
            value={outcomeFilter}
            onChange={onOutcomeChange}
            prepend={i18n.translate('xpack.alertingV2.executionHistory.rulesTab.outcomeLabel', {
              defaultMessage: 'Response',
            })}
            aria-label={i18n.translate(
              'xpack.alertingV2.executionHistory.rulesTab.outcomeAriaLabel',
              { defaultMessage: 'Filter by response' }
            )}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      {renderContent()}
    </>
  );
};
