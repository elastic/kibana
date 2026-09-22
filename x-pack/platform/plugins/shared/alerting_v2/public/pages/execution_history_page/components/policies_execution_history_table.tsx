/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, type ReactNode } from 'react';
import {
  EuiBadge,
  EuiBadgeGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiLoadingSpinner,
  EuiScreenReaderOnly,
  EuiSpacer,
  EuiTablePagination,
  EuiToolTip,
  useEuiTheme,
  type EuiBadgeProps,
  type EuiThemeComputed,
} from '@elastic/eui';
import { css } from '@emotion/react';
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
import { WORKFLOWS_APP_ID } from '@kbn/deeplinks-workflows';
import type { PolicyExecutionOutcome } from '@kbn/alerting-v2-schemas';
import { EXECUTION_HISTORY_MAX_RESULT_WINDOW } from '@kbn/alerting-v2-schemas';
import { UserCapabilities } from '../../../services/user_capabilities';
import type { PolicyExecutionHistoryItem } from '../../../services/execution_history_api';
import {
  POLICY_EXECUTION_FIELDS,
  POLICY_RECORD_EXTRA_FIELDS,
  policyExecutionToDataTableRecord,
  usePolicyExecutionsDataView,
} from '../data_view';
import { useExecutionHistoryTableConfig } from '../hooks/use_execution_history_table_config';
import { useUnifiedDataTableServices } from '../hooks/use_unified_data_table_services';
import { RulesCell } from './rules_cell';
import { ExecutionHistoryErrorState } from './error_state';
import * as i18n from '../translations';

const MAX_VISIBLE_RULES = 3;
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const EMPTY_SORT: SortOrder[] = [];

const getNoCellActions = () => Promise.resolve([]);

const gridStyleOverride = {
  header: 'shade' as const,
  stripes: false,
};

const fillHeightCss = css`
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  min-block-size: 0;
`;

const gridWrapperCss = css`
  flex-grow: 1;
  min-block-size: 0;
`;

const getTableCss = (euiTheme: EuiThemeComputed, fillHeight: boolean) => css`
  ${fillHeight ? 'height: 100%;' : ''}
  border: ${euiTheme.border.thin};
  border-radius: ${euiTheme.border.radius.medium};
  overflow: hidden;

  & .euiDataGrid__controls {
    padding-inline-start: ${euiTheme.size.s};
    padding-top: ${euiTheme.size.s};
    padding-bottom: ${euiTheme.size.s};
  }

  & .unifiedDataTable__cellValue {
    font-family: unset;
  }
`;

type PolicyRef = PolicyExecutionHistoryItem['policy'];
type PolicyRules = PolicyExecutionHistoryItem['rules'];
type PolicyWorkflows = PolicyExecutionHistoryItem['workflows'];

const getOutcomeDisplay = (
  outcome: PolicyExecutionOutcome
): { color: EuiBadgeProps['color']; label: string } => {
  switch (outcome) {
    case 'dispatched':
      return { color: 'hollow', label: i18n.OUTCOME_DISPATCHED };
    case 'throttled':
      return { color: 'hollow', label: i18n.OUTCOME_THROTTLED };
    case 'dispatch_failed':
      return { color: 'danger', label: i18n.OUTCOME_FAILED };
  }
};

const PolicyTimestampCell = ({
  row,
  dateTimeFormat,
}: DataGridCellValueElementProps & { dateTimeFormat: string }) => (
  <>
    {moment(row.flattened[POLICY_EXECUTION_FIELDS.dispatchedAt] as string).format(dateTimeFormat)}
  </>
);

const PolicyNameCell = ({
  row,
  onPolicyClick,
  canReadActionPolicies,
}: DataGridCellValueElementProps & {
  onPolicyClick: (policyId: string) => void;
  canReadActionPolicies: boolean;
}) => {
  const policy = row.flattened[POLICY_EXECUTION_FIELDS.policy] as PolicyRef;
  const label = policy.name ?? policy.id;
  return canReadActionPolicies ? (
    <EuiLink onClick={() => onPolicyClick(policy.id)}>{label}</EuiLink>
  ) : (
    <span>{label}</span>
  );
};

const PolicyOutcomeCell = ({ row }: DataGridCellValueElementProps) => {
  const outcome = row.flattened[POLICY_EXECUTION_FIELDS.outcome] as PolicyExecutionOutcome;
  const { color, label } = getOutcomeDisplay(outcome);
  if (outcome !== 'dispatch_failed') {
    return <EuiBadge color={color}>{label}</EuiBadge>;
  }
  const errorMessage = row.flattened[POLICY_RECORD_EXTRA_FIELDS.errorMessage] as string | null;
  const failureReason = row.flattened[POLICY_RECORD_EXTRA_FIELDS.failureReason] as string | null;
  return (
    <EuiToolTip content={errorMessage ?? undefined}>
      <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} wrap>
        <EuiFlexItem grow={false}>
          <EuiBadge color={color}>{label}</EuiBadge>
        </EuiFlexItem>
        {failureReason && (
          <EuiFlexItem grow={false}>
            <EuiBadge color="warning">{failureReason}</EuiBadge>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </EuiToolTip>
  );
};

const PolicyRulesCell = ({
  row,
  activeRuleId,
  onRuleClick,
  canReadRules,
}: DataGridCellValueElementProps & {
  activeRuleId: string | null;
  onRuleClick: (ruleId: string) => void;
  canReadRules: boolean;
}) => (
  <RulesCell
    rules={row.flattened[POLICY_EXECUTION_FIELDS.rules] as PolicyRules}
    maxVisibleRules={MAX_VISIBLE_RULES}
    totalRuleCount={row.flattened[POLICY_RECORD_EXTRA_FIELDS.totalRuleCount] as number}
    activeRuleId={activeRuleId}
    onRuleClick={onRuleClick}
    canReadRules={canReadRules}
  />
);

const PolicyCountCell = ({ row, columnId }: DataGridCellValueElementProps) => (
  <>{String(row.flattened[columnId] ?? '')}</>
);

const PolicyWorkflowsCell = ({
  row,
  getWorkflowUrl,
}: DataGridCellValueElementProps & { getWorkflowUrl: (workflowId: string) => string }) => {
  const workflows = row.flattened[POLICY_EXECUTION_FIELDS.workflows] as PolicyWorkflows;
  if (workflows.length === 0) return null;
  return (
    <EuiBadgeGroup gutterSize="xs">
      {workflows.map((w) => (
        <EuiBadge
          key={w.id}
          color="hollow"
          iconType="workflow"
          href={getWorkflowUrl(w.id)}
          target="_blank"
          rel="noopener noreferrer"
          css={{ maxWidth: '100%' }}
        >
          {w.name ?? w.id}
        </EuiBadge>
      ))}
    </EuiBadgeGroup>
  );
};

interface Props {
  items: PolicyExecutionHistoryItem[];
  loading: boolean;
  page: number;
  perPage: number;
  total: number;
  onChangePage: (pageIndex: number) => void;
  onChangeItemsPerPage: (size: number) => void;
  onPolicyClick: (policyId: string) => void;
  onRuleClick?: (ruleId: string) => void;
  activeRuleId?: string | null;
  noItemsMessage: ReactNode;
  showEpisodeColumns?: boolean;
  showRulesColumn?: boolean;
  tableCaption: string;
  /**
   * Fill the (bounded) parent and scroll the grid internally. Enable it in flex-grow layouts (the
   * Policies tab); leave it off inside an already-scrolling container (episode details).
   */
  fillHeight?: boolean;
}

export const PoliciesExecutionHistoryTable = ({
  items,
  loading,
  page,
  perPage,
  total,
  onChangePage,
  onChangeItemsPerPage,
  onPolicyClick,
  onRuleClick = () => {},
  activeRuleId = null,
  noItemsMessage,
  showEpisodeColumns = true,
  showRulesColumn = true,
  tableCaption,
  fillHeight = false,
}: Props) => {
  const application = useService(CoreStart('application'));
  const settings = useService(CoreStart('settings'));
  const dateTimeFormat = settings.client.get<string>('dateFormat');
  const canReadRules = useService(UserCapabilities).canRead('rules');
  const canReadActionPolicies = useService(UserCapabilities).canRead('actionPolicies');

  const { euiTheme } = useEuiTheme();
  const services = useUnifiedDataTableServices();
  const { dataView, error: dataViewError } = usePolicyExecutionsDataView();

  // Only read as the initial value of the table config's `useState`, so a plain array is enough.
  const defaultVisibleColumns = [
    POLICY_EXECUTION_FIELDS.dispatchedAt,
    POLICY_EXECUTION_FIELDS.policy,
    POLICY_EXECUTION_FIELDS.outcome,
    ...(showRulesColumn ? [POLICY_EXECUTION_FIELDS.rules] : []),
    ...(showEpisodeColumns
      ? [POLICY_EXECUTION_FIELDS.episodeCount, POLICY_EXECUTION_FIELDS.actionGroupCount]
      : []),
    POLICY_EXECUTION_FIELDS.workflows,
  ];

  const {
    visibleColumns: columns,
    setVisibleColumns,
    settings: tableSettings,
    onColumnResize,
    rowHeight,
    setRowHeight,
  } = useExecutionHistoryTableConfig({ defaultVisibleColumns });

  const rows = useMemo(() => items.map(policyExecutionToDataTableRecord), [items]);

  const getWorkflowUrl = useCallback(
    (workflowId: string) => application.getUrlForApp(WORKFLOWS_APP_ID, { path: `/${workflowId}` }),
    [application]
  );

  const externalCustomRenderers = useMemo<CustomCellRenderer>(
    () => ({
      [POLICY_EXECUTION_FIELDS.dispatchedAt]: (props) => (
        <PolicyTimestampCell {...props} dateTimeFormat={dateTimeFormat} />
      ),
      [POLICY_EXECUTION_FIELDS.policy]: (props) => (
        <PolicyNameCell
          {...props}
          onPolicyClick={onPolicyClick}
          canReadActionPolicies={canReadActionPolicies}
        />
      ),
      [POLICY_EXECUTION_FIELDS.outcome]: PolicyOutcomeCell,
      [POLICY_EXECUTION_FIELDS.rules]: (props) => (
        <PolicyRulesCell
          {...props}
          activeRuleId={activeRuleId}
          onRuleClick={onRuleClick}
          canReadRules={canReadRules}
        />
      ),
      [POLICY_EXECUTION_FIELDS.episodeCount]: PolicyCountCell,
      [POLICY_EXECUTION_FIELDS.actionGroupCount]: PolicyCountCell,
      [POLICY_EXECUTION_FIELDS.workflows]: (props) => (
        <PolicyWorkflowsCell {...props} getWorkflowUrl={getWorkflowUrl} />
      ),
    }),
    [
      dateTimeFormat,
      onPolicyClick,
      canReadActionPolicies,
      activeRuleId,
      onRuleClick,
      canReadRules,
      getWorkflowUrl,
    ]
  );

  // Clamp the total to the API's max result window so pagination can't page past it.
  const cappedTotal = Math.min(total, EXECUTION_HISTORY_MAX_RESULT_WINDOW);
  const pageCount = Math.ceil(cappedTotal / perPage);
  const showEmptyState = !loading && items.length === 0;

  if (dataViewError) {
    return <ExecutionHistoryErrorState onRetry={() => window.location.reload()} />;
  }

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
    return <>{noItemsMessage}</>;
  }

  return (
    <div data-test-subj="policyExecutionHistoryTable" css={fillHeight ? fillHeightCss : undefined}>
      <EuiScreenReaderOnly>
        <span id="policyExecutionHistoryTableAriaLabel">{tableCaption}</span>
      </EuiScreenReaderOnly>
      <div css={fillHeight ? gridWrapperCss : undefined}>
        <CellActionsProvider getTriggerCompatibleActions={getNoCellActions}>
          <UnifiedDataTable
            ariaLabelledBy="policyExecutionHistoryTableAriaLabel"
            css={getTableCss(euiTheme, fillHeight)}
            dataView={dataView}
            columns={columns}
            onSetColumns={setVisibleColumns}
            rows={rows}
            loadingState={loading ? DataLoadingState.loading : DataLoadingState.loaded}
            sampleSizeState={rows.length}
            totalHits={cappedTotal}
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
      </div>
      <EuiSpacer size="s" />
      <EuiTablePagination
        aria-label={tableCaption}
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
