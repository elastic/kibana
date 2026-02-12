/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useMemo, useState } from 'react';
import moment from 'moment';
import numeral from '@elastic/numeral';
import { i18n } from '@kbn/i18n';
import { useUiSetting$ } from '@kbn/kibana-react-plugin/public';
import type { EuiTableSortingType, EuiSelectableOption } from '@elastic/eui';
import {
  getRulesAppDetailsRoute,
  rulesAppRoute,
  triggersActionsRoute,
} from '@kbn/rule-data-utils/src/routes/stack_rule_paths';
import {
  EuiBasicTable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiLink,
  EuiButtonEmpty,
  EuiText,
  EuiToolTip,
  EuiButtonIcon,
  EuiScreenReaderOnly,
  EuiCheckbox,
  RIGHT_ALIGNMENT,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { RuleExecutionStatus } from '@kbn/alerting-plugin/common';
import {
  formatDuration,
  parseDuration,
  MONITORING_HISTORY_LIMIT,
} from '@kbn/alerting-plugin/common';

import { getRouterLinkProps } from '@kbn/router-utils';

import {
  SELECT_ALL_RULES,
  CLEAR_SELECTION,
  TOTAL_RULES,
  SELECT_ALL_ARIA_LABEL,
  CLEAR_FILTERS,
} from '../translations';
import type {
  Rule,
  RuleTableItem,
  RuleTypeIndex,
  Pagination,
  TriggersActionsUiConfig,
  RuleTypeRegistryContract,
  SnoozeSchedule,
  BulkOperationResponse,
} from '../../../../types';
import { Percentiles } from '../../../../types';
import { DEFAULT_NUMBER_FORMAT } from '../../../constants';
import { shouldShowDurationWarning } from '../../../lib/execution_duration_utils';
import { PercentileSelectablePopover } from './percentile_selectable_popover';
import { RuleDurationFormat } from './rule_duration_format';
import { checkRuleTypeEnabled } from '../../../lib/check_rule_type_enabled';
import { getFormattedSuccessRatio } from '../../../lib/monitoring_utils';
import { hasAllPrivilege } from '../../../lib/capabilities';
import { RuleTagBadge } from './rule_tag_badge';
import { RuleStatusDropdown } from './rule_status_dropdown';
import { RulesListNotifyBadge } from './notify_badge';
import { RulesListTableStatusCell } from './rules_list_table_status_cell';
import { getIsExperimentalFeatureEnabled } from '../../../../common/get_experimental_features';
import type { RulesListColumns } from './rules_list_column_selector';
import { useRulesListColumnSelector } from './rules_list_column_selector';

interface RuleTypeState {
  isLoading: boolean;
  isInitialLoad: boolean;
  data: RuleTypeIndex;
}

export interface RuleState {
  isLoading: boolean;
  data: Rule[];
  totalItemCount: number;
}

const percentileOrdinals = {
  [Percentiles.P50]: '50th',
  [Percentiles.P95]: '95th',
  [Percentiles.P99]: '99th',
};

export const percentileFields = {
  [Percentiles.P50]: 'monitoring.run.calculated_metrics.p50',
  [Percentiles.P95]: 'monitoring.run.calculated_metrics.p95',
  [Percentiles.P99]: 'monitoring.run.calculated_metrics.p99',
};

const EMPTY_OBJECT = {};
const EMPTY_HANDLER = () => {};
const EMPTY_RENDER = () => null;

interface ConvertRulesToTableItemsOpts {
  rules: Rule[];
  ruleTypeIndex: RuleTypeIndex;
  canExecuteActions: boolean;
  config: TriggersActionsUiConfig;
}

export interface RulesListTableProps {
  rulesListKey?: string;
  rulesState: RuleState;
  items: RuleTableItem[];
  ruleTypesState: RuleTypeState;
  ruleTypeRegistry: RuleTypeRegistryContract;
  isLoading?: boolean;
  sort: EuiTableSortingType<RuleTableItem>['sort'];
  page: Pagination;
  percentileOptions: EuiSelectableOption[];
  numberOfSelectedRules?: number;
  isPageSelected: boolean;
  isAllSelected: boolean;
  itemIdToExpandedRowMap?: Record<string, React.ReactNode>;
  config: TriggersActionsUiConfig;
  onSort?: (sort: EuiTableSortingType<RuleTableItem>['sort']) => void;
  onPage?: (page: Pagination) => void;
  onRuleClick?: (rule: RuleTableItem) => void;
  onRuleEditClick?: (rule: RuleTableItem) => void;
  onRuleDeleteClick?: (rule: RuleTableItem) => void;
  onManageLicenseClick?: (rule: RuleTableItem) => void;
  onTagClick?: (rule: RuleTableItem) => void;
  onTagClose?: (rule: RuleTableItem) => void;
  onPercentileOptionsChange?: (options: EuiSelectableOption[]) => void;
  onRuleChanged: () => Promise<void>;
  onEnableRule: (rule: RuleTableItem) => Promise<BulkOperationResponse>;
  onDisableRule: (rule: RuleTableItem, untrack: boolean) => Promise<BulkOperationResponse>;
  onSnoozeRule: (rule: RuleTableItem, snoozeSchedule: SnoozeSchedule) => Promise<void>;
  onUnsnoozeRule: (rule: RuleTableItem, scheduleIds?: string[]) => Promise<void>;
  onSelectAll: () => void;
  onSelectPage: () => void;
  onSelectRow: (rule: RuleTableItem) => void;
  isRowSelected: (rule: RuleTableItem) => boolean;
  renderSelectAllDropdown: () => React.ReactNode;
  renderCollapsedItemActions?: (
    rule: RuleTableItem,
    onLoading: (isLoading: boolean) => void
  ) => React.ReactNode;
  renderRuleError?: (rule: RuleTableItem) => React.ReactNode;
  visibleColumns?: string[];
  numberOfFilters: number;
  resetFilters: () => void;
}

interface ConvertRulesToTableItemsOpts {
  rules: Rule[];
  ruleTypeIndex: RuleTypeIndex;
  canExecuteActions: boolean;
  config: TriggersActionsUiConfig;
}

export function convertRulesToTableItems(opts: ConvertRulesToTableItemsOpts): RuleTableItem[] {
  const { rules, ruleTypeIndex, canExecuteActions, config } = opts;
  const minimumDuration = config.minimumScheduleInterval
    ? parseDuration(config.minimumScheduleInterval.value)
    : 0;
  return rules.map((rule, index: number) => {
    return {
      ...rule,
      index,
      actionsCount: rule.actions.length,
      ruleType: ruleTypeIndex.get(rule.ruleTypeId)?.name ?? rule.ruleTypeId,
      autoRecoverAlerts: ruleTypeIndex.get(rule.ruleTypeId)?.autoRecoverAlerts,
      isEditable:
        hasAllPrivilege(rule.consumer, ruleTypeIndex.get(rule.ruleTypeId)) &&
        (canExecuteActions || (!canExecuteActions && !rule.actions.length)),
      enabledInLicense: !!ruleTypeIndex.get(rule.ruleTypeId)?.enabledInLicense,
      showIntervalWarning: parseDuration(rule.schedule.interval) < minimumDuration,
      isInternallyManaged: ruleTypeIndex.get(rule.ruleTypeId)!.isInternallyManaged,
    };
  });
}
const ruleSidebarActionCss = css`
  opacity: 0; /* 1 */

  &.ruleSidebarItem__mobile {
    opacity: 1;
  }

  &:focus {
    opacity: 1; /* 2 */
  }
`;

const LAST_RUN_CONTENT = i18n.translate(
  'xpack.triggersActionsUI.sections.rulesList.rulesListTable.columns.lastRunTitleTooltip',
  {
    defaultMessage: 'Start time of the last run.',
  }
);

const SNOOZE_RULE_NOTIFICATIONS = i18n.translate(
  'xpack.triggersActionsUI.sections.rulesList.rulesListTable.columns.notifyTooltip',
  {
    defaultMessage: 'Snooze notifications for a rule.',
  }
);

export const RulesListTable = (props: RulesListTableProps) => {
  const {
    rulesListKey,
    rulesState,
    items = [],
    ruleTypesState,
    ruleTypeRegistry,
    isLoading = false,
    sort,
    isPageSelected = false,
    isAllSelected = false,
    numberOfSelectedRules = 0,
    page,
    percentileOptions,
    itemIdToExpandedRowMap = EMPTY_OBJECT,
    config = EMPTY_OBJECT as TriggersActionsUiConfig,
    onSort = EMPTY_HANDLER,
    onPage = EMPTY_HANDLER,
    onRuleClick = EMPTY_HANDLER,
    onRuleEditClick = EMPTY_HANDLER,
    onRuleDeleteClick = EMPTY_HANDLER,
    onManageLicenseClick = EMPTY_HANDLER,
    onPercentileOptionsChange = EMPTY_HANDLER,
    onRuleChanged,
    onEnableRule,
    onDisableRule,
    onSnoozeRule = EMPTY_HANDLER,
    onUnsnoozeRule = EMPTY_HANDLER,
    onSelectAll = EMPTY_HANDLER,
    onSelectPage = EMPTY_HANDLER,
    onSelectRow = EMPTY_HANDLER,
    isRowSelected = () => false,
    renderCollapsedItemActions = EMPTY_RENDER,
    renderSelectAllDropdown,
    renderRuleError = EMPTY_RENDER,
    visibleColumns,
    resetFilters,
    numberOfFilters,
  } = props;

  const [tagPopoverOpenIndex, setTagPopoverOpenIndex] = useState<number>(-1);
  const [isLoadingMap, setIsLoadingMap] = useState<Record<string, boolean>>({});

  const isRuleUsingExecutionStatus = getIsExperimentalFeatureEnabled('ruleUseExecutionStatus');

  const [defaultNumberFormat] = useUiSetting$<string>(DEFAULT_NUMBER_FORMAT);
  const { euiTheme } = useEuiTheme();

  // Detect current app to determine the correct path format

  const ruleRowCss = css`
    min-width: ${euiTheme.breakpoint.xl}px;

    .actRulesList__tableRowDisabled {
      background-color: ${euiTheme.colors.lightestShade};

      .actRulesList__tableCellDisabled {
        color: ${euiTheme.colors.darkShade};
      }
    }
    .euiTableRow {
      &:hover,
      &:focus-within,
      &[class*='-isActive'] {
        .ruleSidebarItem__action {
          opacity: 1;
        }
      }
    }
  `;

  const selectedPercentile = useMemo(() => {
    const selectedOption = percentileOptions.find((option) => option.checked === 'on');
    if (selectedOption) {
      return Percentiles[selectedOption.key as Percentiles];
    }
  }, [percentileOptions]);

  const onLoading = (id: string, newIsLoading: boolean) => {
    setIsLoadingMap((prevState) => ({
      ...prevState,
      [id]: newIsLoading,
    }));
  };

  const renderPercentileColumnName = useCallback(() => {
    return (
      <span data-test-subj={`rulesTable-${selectedPercentile}ColumnName`}>
        {selectedPercentile}
        &nbsp;
        <EuiIconTip
          content={i18n.translate(
            'xpack.triggersActionsUI.sections.rulesList.rulesListTable.columns.ruleExecutionPercentileTooltip',
            {
              defaultMessage: `{percentileOrdinal} percentile of this rule's past {sampleLimit} run durations (mm:ss).`,
              values: {
                percentileOrdinal: percentileOrdinals[selectedPercentile!],
                sampleLimit: MONITORING_HISTORY_LIMIT,
              },
            }
          )}
          size="s"
          color="subdued"
          type="question"
          className="eui-alignTop"
        />
        <PercentileSelectablePopover
          options={percentileOptions}
          onOptionsChange={onPercentileOptionsChange}
        />
      </span>
    );
  }, [onPercentileOptionsChange, percentileOptions, selectedPercentile]);

  const renderPercentileCellValue = useCallback(
    (value: number) => {
      return (
        <span data-test-subj={`${selectedPercentile}Percentile`}>
          <RuleDurationFormat allowZero={false} duration={value} />
        </span>
      );
    },
    [selectedPercentile]
  );

  const isRuleTypeEditableInContext = useCallback(
    (ruleTypeId: string) =>
      ruleTypeRegistry.has(ruleTypeId)
        ? !ruleTypeRegistry.get(ruleTypeId).requiresAppContext
        : false,
    [ruleTypeRegistry]
  );

  const onDisableRuleInternal = useCallback(
    (rule: RuleTableItem) => (untrack: boolean) => {
      return onDisableRule(rule, untrack);
    },
    [onDisableRule]
  );

  const renderRuleStatusDropdown = useCallback(
    (rule: RuleTableItem) => {
      return (
        <RuleStatusDropdown
          hideSnoozeOption
          disableRule={onDisableRuleInternal(rule)}
          enableRule={async () => await onEnableRule(rule)}
          snoozeRule={async () => {}}
          unsnoozeRule={async () => {}}
          rule={rule}
          onRuleChanged={onRuleChanged}
          isEditable={rule.isEditable && isRuleTypeEditableInContext(rule.ruleTypeId)}
          autoRecoverAlerts={rule.autoRecoverAlerts}
        />
      );
    },
    [isRuleTypeEditableInContext, onDisableRuleInternal, onEnableRule, onRuleChanged]
  );

  const selectionColumn = useMemo(() => {
    return {
      id: 'ruleSelection',
      field: 'selection',
      sortable: false,
      width: '32px',
      mobileOptions: { header: false },
      name: (
        <EuiCheckbox
          id="rulesListTable_selectAll"
          checked={isPageSelected}
          onChange={onSelectPage}
          data-test-subj="checkboxSelectAll"
        />
      ),
      render: (name: string, rule: RuleTableItem) => {
        return (
          <EuiCheckbox
            id={`ruleListTable_select_${rule.id}}`}
            onChange={() => onSelectRow(rule)}
            disabled={!rule.isEditable || rule.isInternallyManaged}
            checked={isRowSelected(rule)}
            data-test-subj={`checkboxSelectRow-${rule.id}`}
            aria-label={i18n.translate(
              'xpack.triggersActionsUI.sections.rulesList.selectRuleCheckbox',
              {
                defaultMessage: 'Select rule {ruleName}',
                values: { ruleName: rule.name },
              }
            )}
          />
        );
      },
    };
  }, [isPageSelected, onSelectPage, onSelectRow, isRowSelected]);

  const ruleOutcomeColumnField = useMemo(() => {
    if (isRuleUsingExecutionStatus) {
      return 'executionStatus.status';
    }
    return 'lastRun.outcome';
  }, [isRuleUsingExecutionStatus]);

  const getRulesTableColumns = useCallback((): RulesListColumns[] => {
    return [
      {
        id: 'ruleName',
        field: 'name',
        name: i18n.translate(
          'xpack.triggersActionsUI.sections.rulesList.rulesListTable.columns.nameTitle',
          { defaultMessage: 'Name' }
        ),
        sortable: true,
        truncateText: false,
        width: '22%',
        'data-test-subj': 'rulesTableCell-name',
        render: (name: string, rule: RuleTableItem) => {
          const ruleType = ruleTypesState.data.get(rule.ruleTypeId);
          const checkEnabledResult = checkRuleTypeEnabled(ruleType);
          const pathToRuleDetails = `${
            getIsExperimentalFeatureEnabled('unifiedRulesPage')
              ? rulesAppRoute
              : triggersActionsRoute
          }${getRulesAppDetailsRoute(rule.id)}`;

          const linkProps = getRouterLinkProps({
            href: pathToRuleDetails,
            onClick: () => onRuleClick(rule),
          });

          const link = (
            <>
              <EuiFlexGroup direction="column" gutterSize="xs">
                <EuiFlexItem grow={false}>
                  <EuiFlexGroup gutterSize="xs">
                    <EuiFlexItem grow={false}>
                      <EuiLink title={name} {...linkProps}>
                        {name}
                      </EuiLink>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      {!checkEnabledResult.isEnabled && (
                        <EuiIconTip
                          anchorClassName="ruleDisabledQuestionIcon"
                          css={css`
                            .ruleDisabledQuestionIcon {
                              bottom: ${euiTheme.size.xs};
                              margin-left: ${euiTheme.size.xs};
                              position: relative;
                            }
                          `}
                          data-test-subj="ruleDisabledByLicenseTooltip"
                          type="question"
                          content={checkEnabledResult.message}
                          position="right"
                        />
                      )}
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText color="subdued" size="xs">
                    {rule.ruleType}
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </>
          );
          return <>{link}</>;
        },
      },
      {
        id: 'ruleTags',
        field: 'tags',
        selectorName: i18n.translate(
          'xpack.triggersActionsUI.sections.rulesList.rulesListTable.columns.selector.tagsTitle',
          { defaultMessage: 'Tags' }
        ),
        name: '',
        sortable: false,
        width: '50px',
        'data-test-subj': 'rulesTableCell-tagsPopover',
        render: (ruleTags: string[], rule: RuleTableItem) => {
          return ruleTags.length > 0 ? (
            <RuleTagBadge
              isOpen={tagPopoverOpenIndex === rule.index}
              tags={ruleTags}
              onClick={() => setTagPopoverOpenIndex(rule.index)}
              onClose={() => setTagPopoverOpenIndex(-1)}
            />
          ) : null;
        },
      },
      {
        id: 'ruleExecutionStatusLastDate',
        field: 'executionStatus.lastExecutionDate',
        selectorName: i18n.translate(
          'xpack.triggersActionsUI.sections.rulesList.rulesListTable.columns.selector.lastRunTitle',
          { defaultMessage: 'Last run' }
        ),
        name: (
          <span>
            {i18n.translate(
              'xpack.triggersActionsUI.sections.rulesList.rulesListTable.columns.lastRunTitle',
              { defaultMessage: 'Last run' }
            )}
            &nbsp;
            <EuiIconTip
              data-test-subj="rulesTableCell-lastExecutionDateTooltip"
              content={LAST_RUN_CONTENT}
              size="s"
              color="subdued"
              type="question"
              className="eui-alignTop"
              aria-label={LAST_RUN_CONTENT}
            />
          </span>
        ),
        sortable: true,
        width: '20%',
        'data-test-subj': 'rulesTableCell-lastExecutionDate',
        render: (date: Date) => {
          if (date) {
            return (
              <>
                <EuiFlexGroup direction="column" gutterSize="none">
                  <EuiFlexItem grow={false}>
                    {moment(date).format('MMM D, YYYY HH:mm:ssa')}
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiText color="subdued" size="xs">
                      {moment(date).fromNow()}
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </>
            );
          }
        },
      },
      {
        id: 'ruleSnoozeNotify',
        selectorName: i18n.translate(
          'xpack.triggersActionsUI.sections.rulesList.rulesListTable.columns.selector.notifyTitle',
          { defaultMessage: 'Notify' }
        ),
        name: (
          <span>
            {i18n.translate(
              'xpack.triggersActionsUI.sections.rulesList.rulesListTable.columns.notifyTitle',
              {
                defaultMessage: 'Notify',
              }
            )}
            &nbsp;
            <EuiIconTip
              data-test-subj="rulesTableCell-notifyTooltip"
              content={SNOOZE_RULE_NOTIFICATIONS}
              size="s"
              color="subdued"
              type="question"
              className="eui-alignTop"
              aria-label={SNOOZE_RULE_NOTIFICATIONS}
            />
          </span>
        ),
        width: '100px',
        'data-test-subj': 'rulesTableCell-rulesListNotify',
        render: (rule: RuleTableItem) => {
          if (!rule.enabled) {
            return null;
          }

          return (
            <div data-test-subj={`ruleType_${rule.ruleTypeId}`}>
              <RulesListNotifyBadge
                showOnHover
                snoozeSettings={rule}
                loading={!!isLoadingMap[rule.id]}
                disabled={!rule.isEditable}
                onRuleChanged={onRuleChanged}
                snoozeRule={async (snoozeSchedule) => {
                  await onSnoozeRule(rule, snoozeSchedule);
                }}
                unsnoozeRule={async (scheduleIds) => await onUnsnoozeRule(rule, scheduleIds)}
                isRuleEditable={rule.isEditable && !rule.isInternallyManaged}
              />
            </div>
          );
        },
      },
      {
        id: 'ruleScheduleInterval',
        field: 'schedule.interval',
        width: '6%',
        name: i18n.translate(
          'xpack.triggersActionsUI.sections.rulesList.rulesListTable.columns.scheduleTitle',
          { defaultMessage: 'Interval' }
        ),
        sortable: false,
        truncateText: false,
        'data-test-subj': 'rulesTableCell-interval',
        render: (interval: string, rule: RuleTableItem) => {
          const durationString = formatDuration(interval);
          return (
            <>
              <EuiFlexGroup direction="row" gutterSize="xs">
                <EuiFlexItem grow={false}>{durationString}</EuiFlexItem>
                <EuiFlexItem grow={false}>
                  {rule.showIntervalWarning && (
                    <EuiToolTip
                      data-test-subj={`ruleInterval-config-tooltip-${rule.index}`}
                      title={i18n.translate(
                        'xpack.triggersActionsUI.sections.rulesList.rulesListTable.columns.intervalTooltipTitle',
                        {
                          defaultMessage: 'Below configured minimum interval',
                        }
                      )}
                      content={i18n.translate(
                        'xpack.triggersActionsUI.sections.rulesList.rulesListTable.columns.intervalTooltipText',
                        {
                          defaultMessage:
                            'Rule interval of {interval} is below the minimum configured interval of {minimumInterval}. This may impact alerting performance.',
                          values: {
                            minimumInterval: formatDuration(
                              config.minimumScheduleInterval!.value,
                              true
                            ),
                            interval: formatDuration(interval, true),
                          },
                        }
                      )}
                      position="top"
                    >
                      <EuiButtonIcon
                        color="text"
                        data-test-subj={`ruleInterval-config-icon-${rule.index}`}
                        onClick={() => onRuleEditClick(rule)}
                        iconType="flag"
                        aria-label={i18n.translate(
                          'xpack.triggersActionsUI.sections.rulesList.rulesListTable.columns.intervalIconAriaLabel',
                          { defaultMessage: 'Below configured minimum interval' }
                        )}
                      />
                    </EuiToolTip>
                  )}
                </EuiFlexItem>
              </EuiFlexGroup>
            </>
          );
        },
      },
      {
        id: 'ruleExecutionStatusLastDuration',
        field: 'executionStatus.lastDuration',
        width: '12%',
        selectorName: i18n.translate(
          'xpack.triggersActionsUI.sections.rulesList.rulesListTable.columns.selector.durationTitle',
          { defaultMessage: 'Duration' }
        ),
        name: (
          <span>
            {i18n.translate(
              'xpack.triggersActionsUI.sections.rulesList.rulesListTable.columns.durationTitle',
              { defaultMessage: 'Duration' }
            )}
            &nbsp;
            <EuiIconTip
              data-test-subj="rulesTableCell-durationTooltip"
              content={i18n.translate(
                'xpack.triggersActionsUI.sections.rulesList.rulesListTable.columns.durationTitleTooltip',
                {
                  defaultMessage: 'The length of time it took for the rule to run (mm:ss).',
                }
              )}
              size="s"
              color="subdued"
              type="question"
              className="eui-alignTop"
            />
          </span>
        ),
        sortable: true,
        truncateText: false,
        'data-test-subj': 'rulesTableCell-duration',
        render: (value: number, rule: RuleTableItem) => {
          const showDurationWarning = shouldShowDurationWarning(
            ruleTypesState.data.get(rule.ruleTypeId),
            value
          );

          return (
            <>
              {<RuleDurationFormat duration={value} />}
              {showDurationWarning && (
                <EuiIconTip
                  iconProps={{ 'data-test-subj': 'ruleDurationWarning' }}
                  anchorClassName="ruleDurationWarningIcon"
                  css={css`
                    .ruleDurationWarningIcon {
                      margin-bottom: ${euiTheme.size.xs};
                      margin-left: ${euiTheme.size.s};
                    }
                  `}
                  type="warning"
                  color="warning"
                  content={i18n.translate(
                    'xpack.triggersActionsUI.sections.rulesList.ruleTypeExcessDurationMessage',
                    {
                      defaultMessage: `Duration exceeds the rule's expected run time.`,
                    }
                  )}
                  position="right"
                />
              )}
            </>
          );
        },
      },
      {
        id: 'ruleExecutionPercentile',
        mobileOptions: { header: false },
        selectorName: i18n.translate(
          'xpack.triggersActionsUI.sections.rulesList.rulesListTable.columns.selector.percentileTitle',
          { defaultMessage: 'Percentile' }
        ),
        field: percentileFields[selectedPercentile!],
        width: '16%',
        name: renderPercentileColumnName(),
        'data-test-subj': 'rulesTableCell-ruleExecutionPercentile',
        sortable: true,
        truncateText: false,
        render: renderPercentileCellValue,
      },
      {
        id: 'ruleExecutionSuccessRatio',
        field: 'monitoring.run.calculated_metrics.success_ratio',
        width: '12%',
        selectorName: i18n.translate(
          'xpack.triggersActionsUI.sections.rulesList.rulesListTable.columns.selector.successRatioTitle',
          { defaultMessage: 'Success ratio' }
        ),
        name: (
          <span>
            {i18n.translate(
              'xpack.triggersActionsUI.sections.rulesList.rulesListTable.columns.successRatioTitle',
              { defaultMessage: 'Success ratio' }
            )}
            &nbsp;
            <EuiIconTip
              data-test-subj="rulesTableCell-successRatioTooltip"
              content={i18n.translate(
                'xpack.triggersActionsUI.sections.rulesList.rulesListTable.columns.successRatioTitleTooltip',
                {
                  defaultMessage: 'How often this rule runs successfully.',
                }
              )}
              size="s"
              color="subdued"
              type="question"
              className="eui-alignTop"
            />
          </span>
        ),
        sortable: true,
        truncateText: false,
        'data-test-subj': 'rulesTableCell-successRatio',
        render: (value: number) => {
          return (
            <span data-test-subj="successRatio">
              {value !== undefined ? getFormattedSuccessRatio(value) : 'N/A'}
            </span>
          );
        },
      },
      {
        id: 'ruleExecutionStatus',
        field: ruleOutcomeColumnField,
        name: i18n.translate(
          'xpack.triggersActionsUI.sections.rulesList.rulesListTable.columns.lastResponseTitle',
          { defaultMessage: 'Last response' }
        ),
        sortable: true,
        truncateText: false,
        width: '120px',
        'data-test-subj': 'rulesTableCell-lastResponse',
        render: (_executionStatus: RuleExecutionStatus, rule: RuleTableItem) => {
          return (
            <RulesListTableStatusCell rule={rule} onManageLicenseClick={onManageLicenseClick} />
          );
        },
      },
      {
        id: 'ruleExecutionState',
        field: 'enabled',
        name: i18n.translate(
          'xpack.triggersActionsUI.sections.rulesList.rulesListTable.columns.stateTitle',
          { defaultMessage: 'State' }
        ),
        sortable: true,
        truncateText: false,
        width: '100px',
        'data-test-subj': 'rulesTableCell-status',
        render: (_enabled: boolean | undefined, rule: RuleTableItem) => {
          return renderRuleStatusDropdown(rule);
        },
      },
      {
        name: '',
        width: '90px',
        render(rule: RuleTableItem) {
          return (
            <EuiFlexGroup
              justifyContent="flexEnd"
              gutterSize="none"
              data-test-subj={`ruleType_${rule.ruleTypeId}`}
            >
              <EuiFlexItem grow={false} className="ruleSidebarItem">
                <EuiFlexGroup justifyContent="flexEnd" gutterSize="xs">
                  {rule.isEditable &&
                  isRuleTypeEditableInContext(rule.ruleTypeId) &&
                  !rule.isInternallyManaged ? (
                    <EuiFlexItem grow={false} data-test-subj="ruleSidebarEditAction">
                      <EuiButtonIcon
                        color={'primary'}
                        title={i18n.translate(
                          'xpack.triggersActionsUI.sections.rulesList.rulesListTable.columns.editButtonTooltip',
                          { defaultMessage: 'Edit' }
                        )}
                        className="ruleSidebarItem__action"
                        css={ruleSidebarActionCss}
                        data-test-subj="editActionHoverButton"
                        onClick={() => onRuleEditClick(rule)}
                        iconType={'pencil'}
                        aria-label={i18n.translate(
                          'xpack.triggersActionsUI.sections.rulesList.rulesListTable.columns.editAriaLabel',
                          { defaultMessage: 'Edit' }
                        )}
                        disabled={!rule.enabledInLicense}
                      />
                    </EuiFlexItem>
                  ) : null}
                  {rule.isEditable && !rule.isInternallyManaged ? (
                    <EuiFlexItem grow={false} data-test-subj="ruleSidebarDeleteAction">
                      <EuiButtonIcon
                        color={'danger'}
                        title={i18n.translate(
                          'xpack.triggersActionsUI.sections.rulesList.rulesListTable.columns.deleteButtonTooltip',
                          { defaultMessage: 'Delete' }
                        )}
                        className="ruleSidebarItem__action"
                        css={ruleSidebarActionCss}
                        data-test-subj="deleteActionHoverButton"
                        onClick={() => onRuleDeleteClick(rule)}
                        iconType={'trash'}
                        aria-label={i18n.translate(
                          'xpack.triggersActionsUI.sections.rulesList.rulesListTable.columns.deleteAriaLabel',
                          { defaultMessage: 'Delete "{name}"', values: { name: rule.name } }
                        )}
                      />
                    </EuiFlexItem>
                  ) : null}
                </EuiFlexGroup>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                {renderCollapsedItemActions(rule, (newIsLoading) =>
                  onLoading(rule.id, newIsLoading)
                )}
              </EuiFlexItem>
            </EuiFlexGroup>
          );
        },
      },
      {
        align: RIGHT_ALIGNMENT,
        width: '40px',
        isExpander: true,
        name: (
          <EuiScreenReaderOnly>
            <span>Expand rows</span>
          </EuiScreenReaderOnly>
        ),
        render: renderRuleError,
      },
    ];
  }, [
    config.minimumScheduleInterval,
    isLoadingMap,
    isRuleTypeEditableInContext,
    onRuleChanged,
    onRuleClick,
    onRuleDeleteClick,
    onRuleEditClick,
    onSnoozeRule,
    onUnsnoozeRule,
    onManageLicenseClick,
    renderCollapsedItemActions,
    renderPercentileCellValue,
    renderPercentileColumnName,
    renderRuleError,
    renderRuleStatusDropdown,
    ruleTypesState.data,
    selectedPercentile,
    tagPopoverOpenIndex,
    ruleOutcomeColumnField,
    euiTheme,
  ]);

  const allRuleColumns = useMemo(() => getRulesTableColumns(), [getRulesTableColumns]);

  const [rulesListColumns, ColumnSelector] = useRulesListColumnSelector({
    allRuleColumns,
    rulesListKey,
    visibleColumns,
  });

  const formattedTotalRules = useMemo(() => {
    return numeral(rulesState.totalItemCount).format(defaultNumberFormat);
  }, [rulesState.totalItemCount, defaultNumberFormat]);

  const selectAllButtonText = useMemo(() => {
    if (isAllSelected) {
      return CLEAR_SELECTION;
    }
    return SELECT_ALL_RULES(formattedTotalRules, rulesState.totalItemCount);
  }, [isAllSelected, formattedTotalRules, rulesState.totalItemCount]);

  const rowProps = useCallback(
    (rule: RuleTableItem) => {
      const selectedClass = isRowSelected(rule) ? 'euiTableRow-isSelected' : '';
      return {
        'data-test-subj': `rule-row${rule.isEditable ? '' : '-isNotEditable'}`,
        className: !ruleTypesState.data.get(rule.ruleTypeId)?.enabledInLicense
          ? `actRulesList__tableRowDisabled ${selectedClass}`
          : selectedClass,
      };
    },
    [ruleTypesState, isRowSelected]
  );

  const authorizedToModifyAllRules = useMemo(() => {
    let authorized = true;
    ruleTypesState.data.forEach((ruleType) => {
      if (!authorized) {
        return;
      }
      const allConsumersAuthorized = Object.values(ruleType.authorizedConsumers).every(
        (authorizedConsumer) => authorizedConsumer.all
      );
      if (!allConsumersAuthorized) {
        authorized = false;
      }
    });
    return authorized;
  }, [ruleTypesState]);

  return (
    <EuiFlexGroup gutterSize="none" direction="column">
      <EuiFlexGroup justifyContent="spaceBetween" gutterSize="none" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiFlexGroup justifyContent="flexStart" gutterSize="s" alignItems="center">
            <EuiFlexItem grow={false}>
              {numberOfSelectedRules > 0 ? (
                renderSelectAllDropdown?.()
              ) : (
                <EuiText
                  size="xs"
                  style={{ fontWeight: euiTheme.font.weight.semiBold }}
                  data-test-subj="totalRulesCount"
                >
                  {TOTAL_RULES(formattedTotalRules, rulesState.totalItemCount)}
                </EuiText>
              )}
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              {numberOfSelectedRules > 0 && authorizedToModifyAllRules && (
                <EuiButtonEmpty
                  size="xs"
                  aria-label={SELECT_ALL_ARIA_LABEL}
                  data-test-subj="selectAllRulesButton"
                  iconType={isAllSelected ? 'cross' : 'pagesSelect'}
                  onClick={onSelectAll}
                >
                  {selectAllButtonText}
                </EuiButtonEmpty>
              )}
            </EuiFlexItem>
            {numberOfFilters > 0 && (
              <EuiFlexItem
                css={{
                  borderLeft: euiTheme.border.thin,
                  paddingLeft: euiTheme.size.m,
                }}
              >
                <EuiButtonEmpty
                  onClick={resetFilters}
                  size="xs"
                  iconSide="left"
                  flush="left"
                  data-test-subj="rules-list-clear-filter"
                >
                  {CLEAR_FILTERS(numberOfFilters)}
                </EuiButtonEmpty>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>{ColumnSelector}</EuiFlexItem>
      </EuiFlexGroup>
      <EuiFlexItem
        grow={true}
        css={css`
          overflow-x: auto;
        `}
      >
        <EuiBasicTable
          tableCaption={i18n.translate(
            'xpack.triggersActionsUI.sections.rulesList.rulesListTable.description',
            {
              defaultMessage: 'Displays rule list data',
            }
          )}
          loading={isLoading}
          /* Don't display rules until we have the rule types initialized */
          items={items}
          itemId="id"
          columns={[selectionColumn, ...rulesListColumns]}
          sorting={{ sort }}
          rowHeader="name"
          rowProps={rowProps}
          css={ruleRowCss}
          cellProps={(rule: RuleTableItem) => ({
            'data-test-subj': 'cell',
            className: !ruleTypesState.data.get(rule.ruleTypeId)?.enabledInLicense
              ? 'actRulesList__tableCellDisabled'
              : '',
          })}
          data-test-subj="rulesList"
          pagination={{
            pageIndex: page.index,
            pageSize: page.size,
            /* Don't display rule count until we have the rule types initialized */
            totalItemCount: ruleTypesState.isInitialLoad ? 0 : rulesState.totalItemCount,
          }}
          onChange={({
            page: changedPage,
            sort: changedSort,
          }: {
            page?: Pagination;
            sort?: EuiTableSortingType<RuleTableItem>['sort'];
          }) => {
            if (changedPage) {
              onPage(changedPage);
            }
            if (changedSort) {
              onSort(changedSort);
            }
          }}
          itemIdToExpandedRowMap={itemIdToExpandedRowMap}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
