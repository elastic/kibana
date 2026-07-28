/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo } from 'react';
import type { Query } from '@elastic/eui';
import {
  EuiBadge,
  EuiBadgeGroup,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiSwitch,
  EuiToolTip,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { getRootEsqlQuery, type RuleKind } from '@kbn/alerting-v2-schemas';
import {
  ContentListFooter,
  ContentListTable,
  ContentListToolbar,
  SelectableFilterPopover,
  StandardFilterOption,
} from '@kbn/content-list';
import type { ContentListItem } from '@kbn/content-list';
import { useContentListState } from '@kbn/content-list-provider';
import { filter } from '@kbn/content-list-toolbar';
import { getIndexPatternFromESQLQuery } from '@kbn/esql-utils';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { RuleKindBadge } from '../../components/rule_details/rule_summary_header';
import { useFetchRuleTags } from '../../hooks/use_fetch_rule_tags';
import type { RuleApiResponse } from '../../services/rules_api';
import { RuleActionsMenu } from './rule_actions_menu';
import { RulesBulkActions } from './rules_bulk_actions';
import { ENABLED_FILTER_ID, KIND_FILTER_ID, TAG_FILTER_ID } from './rules_query_params';
import type { RuleContentListItem } from './rules_data_source';

const { Column } = ContentListTable;

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

const STATUS_FILTER_TITLE = i18n.translate('xpack.alertingV2.rulesList.statusFilter.label', {
  defaultMessage: 'Status',
});

const MODE_FILTER_TITLE = i18n.translate('xpack.alertingV2.rulesList.modeFilter.label', {
  defaultMessage: 'Mode',
});

const TAGS_FILTER_TITLE = i18n.translate('xpack.alertingV2.rulesList.tagsFilter.label', {
  defaultMessage: 'Tags',
});

export const STATUS_FILTER_OPTIONS = [
  {
    key: 'true' as const,
    label: i18n.translate('xpack.alertingV2.rulesList.statusFilter.enabled', {
      defaultMessage: 'Enabled',
    }),
  },
  {
    key: 'false' as const,
    label: i18n.translate('xpack.alertingV2.rulesList.statusFilter.disabled', {
      defaultMessage: 'Disabled',
    }),
  },
];

export const MODE_FILTER_OPTIONS = [
  {
    key: 'alert' as const,
    label: i18n.translate('xpack.alertingV2.rulesList.modeFilter.alert', {
      defaultMessage: 'Alert',
    }),
  },
  {
    key: 'signal' as const,
    label: i18n.translate('xpack.alertingV2.rulesList.modeFilter.signal', {
      defaultMessage: 'Signal',
    }),
  },
];

const RULES_LIST_TABLE_TITLE = i18n.translate('xpack.alertingV2.rulesList.pageTitle', {
  defaultMessage: 'Rules',
});

interface Props {
  canWrite: boolean;
  togglingRuleId?: string;
  isBulkTogglingEnabled?: boolean;
  selectedCount: number;
  totalItemCount: number;
  isAllSelected: boolean;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onRefetchReady: (refetch: () => void) => void;
  onNavigateToDetails: (rule: RuleApiResponse) => void;
  onExpand: (rule: RuleApiResponse) => void;
  onQuickEdit: (rule: RuleApiResponse) => void;
  onEdit: (rule: RuleApiResponse) => void;
  onClone: (rule: RuleApiResponse) => void;
  onDelete: (rule: RuleApiResponse) => void;
  onToggleEnabled: (rule: RuleApiResponse) => void;
  onBulkEnable: () => void;
  onBulkDisable: () => void;
  onBulkDelete: () => void;
}

export const RulesListTableContent = ({
  canWrite,
  togglingRuleId,
  isBulkTogglingEnabled,
  selectedCount,
  totalItemCount,
  isAllSelected,
  onSelectAll,
  onClearSelection,
  onRefetchReady,
  onNavigateToDetails,
  onExpand,
  onQuickEdit,
  onEdit,
  onClone,
  onDelete,
  onToggleEnabled,
  onBulkEnable,
  onBulkDisable,
  onBulkDelete,
}: Props) => {
  return (
    <>
      <RefetchConnector onReady={onRefetchReady} />
      <ContentListToolbar>
        <ContentListToolbar.Filters>
          <StatusFilter />
          <TagsFilter />
          <ModeFilter />
        </ContentListToolbar.Filters>
      </ContentListToolbar>
      {canWrite && selectedCount > 0 ? (
        <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
          <RulesBulkActions
            selectedCount={selectedCount}
            totalItemCount={totalItemCount}
            isAllSelected={isAllSelected}
            onSelectAll={onSelectAll}
            onClearSelection={onClearSelection}
            onBulkEnable={onBulkEnable}
            onBulkDisable={onBulkDisable}
            onBulkDelete={onBulkDelete}
          />
        </EuiFlexGroup>
      ) : null}
      <ContentListTable
        title={RULES_LIST_TABLE_TITLE}
        scrollableInline
        responsiveBreakpoint={false}
        data-test-subj="rulesListTable"
      >
        <Column
          id="expand"
          name=""
          width="32px"
          render={(item) => {
            const rule = toRule(item);
            return (
              <EuiToolTip
                content={i18n.translate('xpack.alertingV2.rulesList.action.expand', {
                  defaultMessage: 'Open rule summary',
                })}
                disableScreenReaderOutput
              >
                <EuiButtonIcon
                  iconType="expand"
                  color="text"
                  onClick={() => onExpand(rule)}
                  aria-label={i18n.translate('xpack.alertingV2.rulesList.action.expand', {
                    defaultMessage: 'Open rule summary',
                  })}
                  data-test-subj={`expandRule-${rule.id}`}
                />
              </EuiToolTip>
            );
          }}
        />
        <Column.Name
          showDescription
          showTags={false}
          onClick={(item) => onNavigateToDetails(toRule(item))}
        />
        <Column
          id="source"
          name={i18n.translate('xpack.alertingV2.rulesList.column.source', {
            defaultMessage: 'Source',
          })}
          width="18%"
          truncateText
          render={(item) => {
            const { query } = toRule(item);
            const source = query
              ? getIndexPatternFromESQLQuery(getRootEsqlQuery(query)) || undefined
              : undefined;
            return source ? (
              <EuiBadge color="hollow">{source}</EuiBadge>
            ) : (
              <FormattedMessage id="xpack.alertingV2.rulesList.emptyValue" defaultMessage="-" />
            );
          }}
        />
        <Column
          id="tags"
          name={i18n.translate('xpack.alertingV2.rulesList.column.tags', {
            defaultMessage: 'Tags',
          })}
          width="20%"
          render={(item) => {
            const tags = toRule(item).metadata?.tags;
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
                {overflowCount > 0 ? (
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
                ) : null}
              </EuiBadgeGroup>
            );
          }}
        />
        <Column
          id="kind"
          name={i18n.translate('xpack.alertingV2.rulesList.column.mode', {
            defaultMessage: 'Mode',
          })}
          width="10%"
          sortable
          render={(item) => <RuleKindBadge kind={toRule(item).kind as RuleKind} />}
        />
        <Column
          id="enabled"
          name={i18n.translate('xpack.alertingV2.rulesList.column.enabled', {
            defaultMessage: 'Enabled',
          })}
          width="8%"
          sortable
          render={(item) => {
            const rule = toRule(item);
            const { enabled } = rule;
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
          }}
        />
        {canWrite ? (
          <Column
            id="actions"
            name={i18n.translate('xpack.alertingV2.rulesList.column.actions', {
              defaultMessage: 'Actions',
            })}
            width="8%"
            render={(item) => {
              const rule = toRule(item);
              return (
                <EuiFlexGroup
                  gutterSize="xs"
                  alignItems="center"
                  responsive={false}
                  justifyContent="flexEnd"
                >
                  <EuiFlexItem grow={false}>
                    <EuiToolTip
                      content={i18n.translate('xpack.alertingV2.rulesList.action.quickEdit', {
                        defaultMessage: 'Quick edit rule',
                      })}
                      disableScreenReaderOutput
                    >
                      <EuiButtonIcon
                        iconType="pencil"
                        color="text"
                        onClick={() => onQuickEdit(rule)}
                        aria-label={i18n.translate('xpack.alertingV2.rulesList.action.quickEdit', {
                          defaultMessage: 'Quick edit rule',
                        })}
                        data-test-subj={`quickEditRule-${rule.id}`}
                      />
                    </EuiToolTip>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <RuleActionsMenu
                      rule={rule}
                      onEdit={onEdit}
                      onClone={onClone}
                      onDelete={onDelete}
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>
              );
            }}
          />
        ) : null}
      </ContentListTable>
      <ContentListFooter />
    </>
  );
};

const toRule = (item: ContentListItem): RuleApiResponse => (item as RuleContentListItem).rule;

const RefetchConnector = ({ onReady }: { onReady: (refetch: () => void) => void }) => {
  const { refetch } = useContentListState();
  useEffect(() => {
    onReady(refetch);
  }, [onReady, refetch]);
  return null;
};

const StatusFilterComponent = ({
  query,
  onChange,
}: {
  query?: Query;
  onChange?: (query: Query) => void;
}) => (
  <SelectableFilterPopover
    fieldName={ENABLED_FILTER_ID}
    title={STATUS_FILTER_TITLE}
    query={query}
    onChange={onChange}
    options={STATUS_FILTER_OPTIONS}
    renderOption={(option, { isActive }) => (
      <StandardFilterOption isActive={isActive}>{option.label}</StandardFilterOption>
    )}
    singleSelection
    data-test-subj="rulesListStatusFilter"
  />
);

const StatusFilter = filter.createComponent({
  resolve: () => ({
    type: 'custom_component' as const,
    component: StatusFilterComponent,
  }),
});

const ModeFilterComponent = ({
  query,
  onChange,
}: {
  query?: Query;
  onChange?: (query: Query) => void;
}) => (
  <SelectableFilterPopover
    fieldName={KIND_FILTER_ID}
    title={MODE_FILTER_TITLE}
    query={query}
    onChange={onChange}
    options={MODE_FILTER_OPTIONS}
    renderOption={(option, { isActive }) => (
      <StandardFilterOption isActive={isActive}>{option.label}</StandardFilterOption>
    )}
    singleSelection
    data-test-subj="rulesListModeFilter"
  />
);

const ModeFilter = filter.createComponent({
  resolve: () => ({
    type: 'custom_component' as const,
    component: ModeFilterComponent,
  }),
});

const TagsFilterComponent = ({
  query,
  onChange,
}: {
  query?: Query;
  onChange?: (query: Query) => void;
}) => {
  const { data: tagNames = [] } = useFetchRuleTags();
  const options = useMemo(() => tagNames.map((tag) => ({ key: tag, label: tag })), [tagNames]);
  return (
    <SelectableFilterPopover
      fieldName={TAG_FILTER_ID}
      title={TAGS_FILTER_TITLE}
      query={query}
      onChange={onChange}
      options={options}
      renderOption={(option, { isActive }) => (
        <StandardFilterOption isActive={isActive}>{option.label}</StandardFilterOption>
      )}
      data-test-subj="rulesListTagsFilter"
    />
  );
};

const TagsFilter = filter.createComponent({
  resolve: () => ({
    type: 'custom_component' as const,
    component: TagsFilterComponent,
  }),
});
