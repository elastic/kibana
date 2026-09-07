/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiBadge,
  EuiBadgeGroup,
  EuiBasicTable,
  EuiButtonIcon,
  EuiCheckbox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiLink,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiToolTip,
  useEuiTheme,
  type Criteria,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { getRootEsqlQuery, type RuleKind } from '@kbn/alerting-v2-schemas';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { getIndexPatternFromESQLQuery } from '@kbn/esql-utils';
import type { RuleApiResponse } from '../../services/rules_api';
import { RuleKindBadge } from '../../components/rule_details/rule_summary_header';
import { RuleActionsMenu } from './rule_actions_menu';
import { RulesBulkActions } from './rules_bulk_actions';

const labelsContainerStyle = css`
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  overflow: hidden;
`;

const labelBadgeStyle = css`
  min-width: 0;
  flex-shrink: 1;
`;

const overflowTooltipStyle = css`
  flex-shrink: 0;
  line-height: 0;
`;

const descriptionTextStyle = css`
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-word;
`;

export type RulesListTableSortField = 'kind' | 'enabled' | 'metadata';

export interface RulesListTableProps {
  items: RuleApiResponse[];
  totalItemCount: number;
  page: number;
  perPage: number;
  pageSizeOptions?: number[];
  search: string;
  hasActiveFilters: boolean;
  sortField?: RulesListTableSortField;
  sortDirection?: 'asc' | 'desc';
  isLoading: boolean;

  /** When false, write affordances (selection, bulk actions, quick edit, actions menu) are hidden and the enabled toggle is read-only. */
  canWrite: boolean;

  /** Bulk selection state */
  selectedCount: number;
  isAllSelected: boolean;
  isPageSelected: boolean;
  isRowSelected: (id: string) => boolean;
  onSelectRow: (id: string) => void;
  onSelectPage: () => void;
  onSelectAll: () => void;
  onClearSelection: () => void;

  /** Bulk action callbacks */
  onBulkEnable: () => void;
  onBulkDisable: () => void;
  onBulkDelete: () => void;
  onBulkUpdateApiKey: () => void;

  /** Row action callbacks */
  onNavigateToDetails: (rule: RuleApiResponse) => void;
  onExpand: (rule: RuleApiResponse) => void;
  onQuickEdit: (rule: RuleApiResponse) => void;
  onEdit: (rule: RuleApiResponse) => void;
  onClone: (rule: RuleApiResponse) => void;
  onDelete: (rule: RuleApiResponse) => void;
  onToggleEnabled: (rule: RuleApiResponse) => void;
  onUpdateApiKey: (rule: RuleApiResponse) => void;
  onRun: (rule: RuleApiResponse) => void;
  /** When provided, adds View change history to each row actions menu. */
  onViewChangeHistory?: (rule: RuleApiResponse) => void;
  /** Id of the rule whose enabled state is currently being toggled, if any. */
  togglingRuleId?: string;
  /** True while a bulk enable/disable mutation is in flight, so individual switches don't race it. */
  isBulkTogglingEnabled?: boolean;

  /** Pagination callback */
  onTableChange: (criteria: Criteria<RuleApiResponse>) => void;
}

const DEFAULT_PAGE_SIZE_OPTIONS = [10, 20, 50];

export const RulesListTable: React.FC<RulesListTableProps> = ({
  items,
  totalItemCount,
  page,
  perPage,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  search,
  hasActiveFilters,
  sortField,
  sortDirection,
  isLoading,
  canWrite,
  selectedCount,
  isAllSelected,
  isPageSelected,
  isRowSelected,
  onSelectRow,
  onSelectPage,
  onSelectAll,
  onClearSelection,
  onBulkEnable,
  onBulkDisable,
  onBulkDelete,
  onBulkUpdateApiKey,
  onNavigateToDetails,
  onExpand,
  onQuickEdit,
  onEdit,
  onClone,
  onDelete,
  onToggleEnabled,
  onUpdateApiKey,
  onRun,
  onViewChangeHistory,
  togglingRuleId,
  isBulkTogglingEnabled,
  onTableChange,
}) => {
  const { euiTheme } = useEuiTheme();

  const hideMobileSortMenuOnWideScreensStyle = useMemo(
    () => css`
      @media (min-width: ${euiTheme.breakpoint.m}px) {
        .euiTableSortMobile {
          display: none;
        }
      }
    `,
    [euiTheme.breakpoint.m]
  );

  const pagination = {
    pageIndex: page - 1,
    pageSize: perPage,
    totalItemCount,
    pageSizeOptions,
  };

  const columns: Array<EuiBasicTableColumn<RuleApiResponse>> = useMemo(() => {
    const showActionsColumn = canWrite || onViewChangeHistory;

    return [
      ...(canWrite
        ? ([
            {
              field: 'id',
              name: (
                <EuiCheckbox
                  id="selectAllPage"
                  checked={isPageSelected}
                  onChange={onSelectPage}
                  aria-label={i18n.translate('xpack.alertingV2.rulesList.selectAllPage', {
                    defaultMessage: 'Select all rules on this page',
                  })}
                  data-test-subj="selectAllRulesOnPage"
                />
              ),
              width: '32px',
              render: (id: string) => (
                <EuiCheckbox
                  id={`select-rule-${id}`}
                  checked={isRowSelected(id)}
                  onChange={() => onSelectRow(id)}
                  aria-label={i18n.translate('xpack.alertingV2.rulesList.selectRule', {
                    defaultMessage: 'Select rule',
                  })}
                  data-test-subj={`checkboxSelectRow-${id}`}
                />
              ),
            },
          ] as Array<EuiBasicTableColumn<RuleApiResponse>>)
        : []),
      {
        name: '',
        width: '32px',
        render: (rule: RuleApiResponse) => (
          <EuiToolTip
            content={i18n.translate('xpack.alertingV2.rulesList.action.expand', {
              defaultMessage: 'Open rule summary',
            })}
            disableScreenReaderOutput
          >
            <EuiButtonIcon
              iconType="maximize"
              color="text"
              onClick={() => onExpand(rule)}
              aria-label={i18n.translate('xpack.alertingV2.rulesList.action.expand', {
                defaultMessage: 'Open rule summary',
              })}
              data-test-subj={`expandRule-${rule.id}`}
            />
          </EuiToolTip>
        ),
      },
      {
        field: 'metadata',
        name: (
          <FormattedMessage id="xpack.alertingV2.rulesList.column.name" defaultMessage="Name" />
        ),
        truncateText: true,
        sortable: true,
        render: (metadata: RuleApiResponse['metadata'], rule: RuleApiResponse) => (
          <div>
            <EuiLink
              onClick={() => onNavigateToDetails(rule)}
              data-test-subj={`ruleNameLink-${rule.id}`}
            >
              {metadata?.name ?? rule.id}
            </EuiLink>
            {metadata?.description && (
              <EuiText size="xs" color="subdued" css={descriptionTextStyle}>
                {metadata.description}
              </EuiText>
            )}
          </div>
        ),
      },
      {
        field: 'query',
        name: (
          <FormattedMessage id="xpack.alertingV2.rulesList.column.source" defaultMessage="Source" />
        ),
        width: '18%',
        truncateText: true,
        render: (query: RuleApiResponse['query']) => {
          const source = query
            ? getIndexPatternFromESQLQuery(getRootEsqlQuery(query)) || undefined
            : undefined;
          return source ? (
            <EuiBadge color="hollow">{source}</EuiBadge>
          ) : (
            <FormattedMessage id="xpack.alertingV2.rulesList.emptyValue" defaultMessage="-" />
          );
        },
      },
      {
        field: 'metadata',
        name: (
          <FormattedMessage id="xpack.alertingV2.rulesList.column.tags" defaultMessage="Tags" />
        ),
        width: '20%',
        render: (_metadata: RuleApiResponse['metadata']) => {
          const tags = _metadata?.tags;
          if (!tags || tags.length === 0) {
            return (
              <FormattedMessage id="xpack.alertingV2.rulesList.emptyValue" defaultMessage="-" />
            );
          }
          const overflowCount = tags.length - 1;
          return (
            <EuiBadgeGroup
              gutterSize="xs"
              css={labelsContainerStyle}
              data-test-subj="tagsContainer"
            >
              <EuiBadge color="hollow" css={overflowCount > 0 ? labelBadgeStyle : undefined}>
                {tags[0]}
              </EuiBadge>
              {overflowCount > 0 && (
                <span css={overflowTooltipStyle}>
                  <EuiToolTip content={tags.slice(1).join(', ')}>
                    <EuiBadge
                      tabIndex={0}
                      color="hollow"
                      data-test-subj="overflowTagsBadge"
                      iconType="tag"
                      title=""
                    >
                      {i18n.translate('xpack.alertingV2.rulesList.tags.overflow', {
                        defaultMessage: '+{count}',
                        values: { count: overflowCount },
                      })}
                    </EuiBadge>
                  </EuiToolTip>
                </span>
              )}
            </EuiBadgeGroup>
          );
        },
      },
      {
        field: 'kind',
        name: (
          <FormattedMessage id="xpack.alertingV2.rulesList.column.kind" defaultMessage="Outcome" />
        ),
        width: '10%',
        sortable: true,
        render: (kind: RuleKind) => <RuleKindBadge kind={kind} />,
      },
      {
        field: 'enabled',
        name: (
          <FormattedMessage
            id="xpack.alertingV2.rulesList.column.enabled"
            defaultMessage="Enabled"
          />
        ),
        width: '8%',
        sortable: true,
        render: (enabled: boolean, rule: RuleApiResponse) => {
          if (!canWrite) {
            return (
              <EuiBadge
                color={enabled ? 'success' : 'default'}
                data-test-subj={`ruleEnabledBadge-${rule.id}`}
              >
                {enabled ? (
                  <FormattedMessage
                    id="xpack.alertingV2.rulesList.column.enabled.enabledBadge"
                    defaultMessage="Enabled"
                  />
                ) : (
                  <FormattedMessage
                    id="xpack.alertingV2.rulesList.column.enabled.disabledBadge"
                    defaultMessage="Disabled"
                  />
                )}
              </EuiBadge>
            );
          }

          return togglingRuleId === rule.id ? (
            <EuiLoadingSpinner data-test-subj={`ruleEnabledSpinner-${rule.id}`} size="m" />
          ) : (
            <EuiSwitch
              compressed
              showLabel={false}
              label={i18n.translate('xpack.alertingV2.rulesList.column.enabled.switchLabel', {
                defaultMessage: 'Enabled: {ruleName}',
                values: { ruleName: rule.metadata?.name ?? rule.id },
              })}
              checked={enabled}
              disabled={Boolean(togglingRuleId) || Boolean(isBulkTogglingEnabled)}
              onChange={() => onToggleEnabled(rule)}
              data-test-subj={`ruleEnabledSwitch-${rule.id}`}
            />
          );
        },
      },
      ...(showActionsColumn
        ? ([
            {
              name: (
                <FormattedMessage
                  id="xpack.alertingV2.rulesList.column.actions"
                  defaultMessage="Actions"
                />
              ),
              width: '8%',
              align: 'right',
              render: (rule: RuleApiResponse) => (
                <EuiFlexGroup
                  gutterSize="xs"
                  alignItems="center"
                  responsive={false}
                  justifyContent="flexEnd"
                >
                  {canWrite ? (
                    <EuiFlexItem grow={false}>
                      <EuiToolTip
                        content={i18n.translate('xpack.alertingV2.rulesList.action.quickEdit', {
                          defaultMessage: 'Edit rule',
                        })}
                        disableScreenReaderOutput
                      >
                        <EuiButtonIcon
                          iconType="pencil"
                          color="text"
                          onClick={() => onQuickEdit(rule)}
                          aria-label={i18n.translate(
                            'xpack.alertingV2.rulesList.action.quickEdit',
                            {
                              defaultMessage: 'Edit rule',
                            }
                          )}
                          data-test-subj={`quickEditRule-${rule.id}`}
                        />
                      </EuiToolTip>
                    </EuiFlexItem>
                  ) : null}
                  <EuiFlexItem grow={false}>
                    <RuleActionsMenu
                      rule={rule}
                      canWrite={canWrite}
                      onEdit={onEdit}
                      onClone={onClone}
                      onDelete={onDelete}
                      onUpdateApiKey={onUpdateApiKey}
                      onRun={onRun}
                      onViewChangeHistory={onViewChangeHistory}
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>
              ),
            },
          ] as Array<EuiBasicTableColumn<RuleApiResponse>>)
        : []),
    ];
  }, [
    canWrite,
    isPageSelected,
    isRowSelected,
    onSelectPage,
    onSelectRow,
    onNavigateToDetails,
    onExpand,
    onQuickEdit,
    onEdit,
    onClone,
    onDelete,
    onToggleEnabled,
    onUpdateApiKey,
    onRun,
    onViewChangeHistory,
    togglingRuleId,
    isBulkTogglingEnabled,
  ]);

  const noItemsMessage =
    search || hasActiveFilters
      ? i18n.translate('xpack.alertingV2.rulesList.noSearchResults', {
          defaultMessage: 'No rules match your search or filters.',
        })
      : i18n.translate('xpack.alertingV2.rulesList.noRules', {
          defaultMessage: 'No rules found.',
        });

  return (
    <>
      <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiText size="xs" data-test-subj="rulesListShowingLabel">
            <FormattedMessage
              id="xpack.alertingV2.rulesList.showingLabel"
              defaultMessage="Showing {rangeBold} of {totalBold}"
              values={{
                rangeBold: (
                  <strong>
                    {Math.min((page - 1) * perPage + 1, totalItemCount)}-
                    {Math.min(page * perPage, totalItemCount)}
                  </strong>
                ),
                totalBold: (
                  <strong>
                    <FormattedMessage
                      id="xpack.alertingV2.rulesList.showingLabelTotal"
                      defaultMessage="{total} {total, plural, one {Rule} other {Rules}}"
                      values={{ total: totalItemCount }}
                    />
                  </strong>
                ),
              }}
            />
          </EuiText>
        </EuiFlexItem>
        {canWrite ? (
          <RulesBulkActions
            selectedCount={selectedCount}
            totalItemCount={totalItemCount}
            isAllSelected={isAllSelected}
            onSelectAll={onSelectAll}
            onClearSelection={onClearSelection}
            onBulkEnable={onBulkEnable}
            onBulkDisable={onBulkDisable}
            onBulkUpdateApiKey={onBulkUpdateApiKey}
            onBulkDelete={onBulkDelete}
          />
        ) : null}
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiHorizontalRule margin="none" style={{ height: 2 }} />
      <EuiBasicTable
        css={hideMobileSortMenuOnWideScreensStyle}
        items={items}
        itemId="id"
        columns={columns}
        loading={isLoading}
        pagination={pagination}
        sorting={
          sortField && sortDirection
            ? { sort: { field: sortField, direction: sortDirection } }
            : undefined
        }
        noItemsMessage={noItemsMessage}
        onChange={onTableChange}
        responsiveBreakpoint={false}
        tableCaption={i18n.translate('xpack.alertingV2.rulesList.tableCaption', {
          defaultMessage: 'Rules',
        })}
        data-test-subj="rulesListTable"
      />
    </>
  );
};
