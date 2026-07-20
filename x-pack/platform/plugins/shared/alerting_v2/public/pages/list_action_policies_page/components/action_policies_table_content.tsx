/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { ActionPolicyBulkAction, ActionPolicyResponse } from '@kbn/alerting-v2-schemas';
import type { Query } from '@elastic/eui';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiSkeletonText, EuiSwitch } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  ContentListFooter,
  ContentListTable,
  ContentListToolbar,
  createColumn,
  SelectableFilterPopover,
  StandardFilterOption,
} from '@kbn/content-list';
import type { ContentListItem } from '@kbn/content-list';
import {
  TAG_FILTER_ID,
  useContentListItems,
  useContentListSelection,
  useContentListState,
} from '@kbn/content-list-provider';
import { filter } from '@kbn/content-list-toolbar';
import { ActionPolicyDetailsFlyout } from '../../../components/action_policy/details_flyout/action_policy_details_flyout';
import { ActionPolicySnoozePopover } from '../../../components/action_policy/action_policy_snooze_popover';
import type { useBulkActionActionPolicies } from '../../../hooks/use_bulk_action_action_policies';
import { useBulkGetUserProfiles } from '../../../hooks/use_bulk_get_user_profiles';
import { useFetchTags } from '../../../hooks/use_fetch_tags';
import { resolveDisplayName } from '../../../utils/resolve_display_name';
import { ActionPolicyDestinationsSummary } from '../../../components/action_policy/action_policy_destinations_summary';
import { ActionPoliciesBulkActions } from './action_policies_bulk_actions';
import { ActionPolicyActionsCell } from './action_policy_actions_cell';
import type { ActionPolicyContentListItem } from '../action_policies_data_source';
import { ENABLED_FILTER_ID } from '../action_policies_data_source';
const { Column } = ContentListTable;

type BulkActionMutate = ReturnType<typeof useBulkActionActionPolicies>['mutate'];

interface ConnectedBulkActionsProps {
  bulkAction: BulkActionMutate;
  isLoading: boolean;
}

interface Props {
  canWrite: boolean;
  isEnabling: boolean;
  enableVariables: string | undefined;
  isDisabling: boolean;
  disableVariables: string | undefined;
  isSnoozing: boolean;
  snoozeVariables: { id: string } | undefined;
  isUnsnoozing: boolean;
  unsnoozeVariables: string | undefined;
  isBulkActionInProgress: boolean;
  bulkAction: BulkActionMutate;
  onRefetchReady: (refetch: () => void) => void;
  onEdit: (id: string) => void;
  onClone: (policy: ActionPolicyResponse) => void;
  onDelete: (policy: ActionPolicyResponse) => void;
  onSnooze: (id: string, snoozedUntil: string) => void;
  onCancelSnooze: (id: string) => void;
  onUpdateApiKey: (id: string) => void;
  enablePolicy: (id: string) => void;
  disablePolicy: (id: string) => void;
}

const TAGS_FILTER_TITLE = i18n.translate('xpack.alertingV2.actionPoliciesList.filter.tags.title', {
  defaultMessage: 'Tags',
});

const ENABLED_FILTER_TITLE = i18n.translate(
  'xpack.alertingV2.actionPoliciesList.filter.enabled.title',
  { defaultMessage: 'State' }
);

export const ENABLED_FILTER_OPTIONS = [
  {
    key: 'enabled' as const,
    label: i18n.translate('xpack.alertingV2.actionPoliciesList.filter.enabled.option.enabled', {
      defaultMessage: 'Enabled',
    }),
  },
  {
    key: 'disabled' as const,
    label: i18n.translate('xpack.alertingV2.actionPoliciesList.filter.enabled.option.disabled', {
      defaultMessage: 'Disabled',
    }),
  },
];

const ACTION_POLICIES_LIST_PAGE_TITLE = i18n.translate(
  'xpack.alertingV2.actionPoliciesList.pageTitle',
  { defaultMessage: 'Action Policies' }
);

const UPDATED_BY_COLUMN_NAME = i18n.translate(
  'xpack.alertingV2.actionPoliciesList.column.updatedBy',
  { defaultMessage: 'Updated by' }
);

export const ActionPoliciesTableContent = ({
  canWrite,
  isEnabling,
  enableVariables,
  isDisabling,
  disableVariables,
  isSnoozing,
  snoozeVariables,
  isUnsnoozing,
  unsnoozeVariables,
  isBulkActionInProgress,
  bulkAction,
  onRefetchReady,
  onEdit,
  onClone,
  onDelete,
  onSnooze,
  onCancelSnooze,
  onUpdateApiKey,
  enablePolicy,
  disablePolicy,
}: Props) => {
  const [policyToViewId, setPolicyToViewId] = useState<string | null>(null);
  const { items } = useContentListItems();
  const policyToView = useMemo(
    () =>
      policyToViewId ? items.map(toPolicy).find((p) => p.id === policyToViewId) ?? null : null,
    [policyToViewId, items]
  );
  const updatedByUids = useMemo(
    () =>
      items.map((item) => toPolicy(item).updatedBy).filter((uid): uid is string => Boolean(uid)),
    [items]
  );
  const { data: updatedByProfileByUid, isLoading: isProfileLoading } = useBulkGetUserProfiles({
    uids: updatedByUids,
  });
  const updatedByProfileByUidRef = useRef(updatedByProfileByUid);
  updatedByProfileByUidRef.current = updatedByProfileByUid;
  const isProfileLoadingRef = useRef(isProfileLoading);
  isProfileLoadingRef.current = isProfileLoading;

  return (
    <>
      <RefetchConnector onReady={onRefetchReady} />
      <ContentListToolbar>
        <ContentListToolbar.Filters>
          <TagsFilter />
          <EnabledFilter />
        </ContentListToolbar.Filters>
      </ContentListToolbar>
      <ConnectedBulkActions bulkAction={bulkAction} isLoading={isBulkActionInProgress} />
      <ContentListTable
        title={ACTION_POLICIES_LIST_PAGE_TITLE}
        scrollableInline
        responsiveBreakpoint={false}
      >
        <Column.Name showDescription onClick={(item) => setPolicyToViewId(toPolicy(item).id)} />
        <DestinationsColumn />
        <Column
          id="tags"
          name={i18n.translate('xpack.alertingV2.actionPoliciesList.column.tags', {
            defaultMessage: 'Tags',
          })}
          render={(item) => {
            const { tags } = toPolicy(item);
            if (!tags?.length) return null;
            return (
              <EuiFlexGroup gutterSize="xs" wrap>
                {tags.map((tag) => (
                  <EuiFlexItem grow={false} key={tag}>
                    <EuiBadge color="hollow">{tag}</EuiBadge>
                  </EuiFlexItem>
                ))}
              </EuiFlexGroup>
            );
          }}
        />
        <Column.UpdatedAt />
        <Column
          id="updatedBy"
          name={UPDATED_BY_COLUMN_NAME}
          width="150px"
          render={(item) => {
            const { updatedBy } = toPolicy(item);
            if (!updatedBy) return null;
            if (isProfileLoadingRef.current)
              return (
                <div style={{ width: 120 }}>
                  <EuiSkeletonText lines={1} />
                </div>
              );
            return (
              <>{resolveDisplayName(updatedBy, updatedByProfileByUidRef.current, updatedBy)}</>
            );
          }}
        />
        <Column
          id="enabled"
          name={i18n.translate('xpack.alertingV2.actionPoliciesList.column.enabled', {
            defaultMessage: 'Enabled',
          })}
          width="80px"
          render={(item) => {
            const policy = toPolicy(item);
            const isLoading =
              (isEnabling && enableVariables === policy.id) ||
              (isDisabling && disableVariables === policy.id);
            return (
              <EuiSwitch
                compressed
                checked={policy.enabled}
                disabled={!canWrite || isLoading || isBulkActionInProgress}
                title={
                  !canWrite
                    ? i18n.translate(
                        'xpack.alertingV2.actionPoliciesList.column.enabled.disabledTooltip',
                        {
                          defaultMessage:
                            'You do not have permission to enable or disable this policy',
                        }
                      )
                    : undefined
                }
                onChange={() => {
                  if (policy.enabled) {
                    disablePolicy(policy.id);
                  } else {
                    enablePolicy(policy.id);
                  }
                }}
                label=""
                aria-label={i18n.translate(
                  'xpack.alertingV2.actionPoliciesList.column.enabled.ariaLabel',
                  { defaultMessage: '{name} enabled', values: { name: policy.name } }
                )}
              />
            );
          }}
        />
        <Column
          id="notify"
          name={i18n.translate('xpack.alertingV2.actionPoliciesList.column.notify', {
            defaultMessage: 'Notify',
          })}
          width="50px"
          render={(item) => {
            const policy = toPolicy(item);
            if (!policy.enabled || !canWrite) return null;
            return (
              <ActionPolicySnoozePopover
                policy={policy}
                onSnooze={onSnooze}
                onCancelSnooze={onCancelSnooze}
                isLoading={
                  (isSnoozing && snoozeVariables?.id === policy.id) ||
                  (isUnsnoozing && unsnoozeVariables === policy.id)
                }
              />
            );
          }}
        />
        <Column
          id="actions"
          name={i18n.translate('xpack.alertingV2.actionPoliciesList.column.actions', {
            defaultMessage: 'Actions',
          })}
          render={(item) => {
            const policy = toPolicy(item);
            return (
              <ActionPolicyActionsCell
                policy={policy}
                canWrite={canWrite}
                onViewDetails={(p) => setPolicyToViewId(p.id)}
                onEdit={onEdit}
                onClone={onClone}
                onDelete={onDelete}
                onSnooze={onSnooze}
                onCancelSnooze={onCancelSnooze}
                onUpdateApiKey={onUpdateApiKey}
                isDisabled={isBulkActionInProgress}
              />
            );
          }}
        />
      </ContentListTable>
      <ContentListFooter />
      {policyToView && (
        <ActionPolicyDetailsFlyout
          policy={policyToView}
          canWrite={canWrite}
          onClose={() => setPolicyToViewId(null)}
          onEdit={(id) => {
            setPolicyToViewId(null);
            onEdit(id);
          }}
          onClone={(p) => {
            setPolicyToViewId(null);
            onClone(p);
          }}
          onDelete={(p) => {
            setPolicyToViewId(null);
            onDelete(p);
          }}
          onEnable={(id) => enablePolicy(id)}
          onDisable={(id) => disablePolicy(id)}
          onSnooze={(id, until) => onSnooze(id, until)}
          onCancelSnooze={(id) => onCancelSnooze(id)}
          onUpdateApiKey={(id) => {
            setPolicyToViewId(null);
            onUpdateApiKey(id);
          }}
          isStateLoading={
            (isEnabling && enableVariables === policyToView.id) ||
            (isDisabling && disableVariables === policyToView.id)
          }
        />
      )}
    </>
  );
};

const toPolicy = (item: ContentListItem): ActionPolicyResponse =>
  (item as ActionPolicyContentListItem).policy;

const DestinationsColumn = createColumn({
  id: 'destinations',
  name: i18n.translate('xpack.alertingV2.actionPoliciesList.column.destinations', {
    defaultMessage: 'Destinations',
  }),
  render: (item) => <ActionPolicyDestinationsSummary destinations={toPolicy(item).destinations} />,
});

const RefetchConnector = ({ onReady }: { onReady: (refetch: () => void) => void }) => {
  const { refetch } = useContentListState();
  useEffect(() => {
    onReady(refetch);
  }, [onReady, refetch]);
  return null;
};

const ConnectedBulkActions = ({ bulkAction, isLoading }: ConnectedBulkActionsProps) => {
  const { selectedItems, selectedCount, clearSelection } = useContentListSelection();

  if (selectedCount === 0) return null;

  const selectedPolicies = selectedItems.map((item) => toPolicy(item));

  const handleBulkAction = (
    action: 'enable' | 'disable' | 'delete' | 'snooze' | 'unsnooze' | 'update_api_key',
    snoozedUntil?: string
  ) => {
    const ids = selectedPolicies.map((p) => p.id);
    const actions: ActionPolicyBulkAction[] =
      action === 'snooze' && snoozedUntil
        ? ids.map((id) => ({ id, action: 'snooze', snoozedUntil }))
        : ids.map((id) => ({ id, action } as ActionPolicyBulkAction));
    bulkAction({ actions }, { onSuccess: clearSelection });
  };

  return (
    <ActionPoliciesBulkActions
      selectedPolicies={selectedPolicies}
      onClearSelection={clearSelection}
      onBulkAction={handleBulkAction}
      isLoading={isLoading}
    />
  );
};

const TagsFilterComponent = ({
  query,
  onChange,
}: {
  query?: Query;
  onChange?: (query: Query) => void;
}) => {
  const { data: tagNames = [] } = useFetchTags();
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
      data-test-subj="actionPoliciesTagsFilter"
    />
  );
};

const TagsFilter = filter.createComponent({
  resolve: () => ({
    type: 'custom_component' as const,
    component: TagsFilterComponent,
  }),
});

const EnabledFilterComponent = ({
  query,
  onChange,
}: {
  query?: Query;
  onChange?: (query: Query) => void;
}) => (
  <SelectableFilterPopover
    fieldName={ENABLED_FILTER_ID}
    title={ENABLED_FILTER_TITLE}
    query={query}
    onChange={onChange}
    options={ENABLED_FILTER_OPTIONS}
    renderOption={(option, { isActive }) => (
      <StandardFilterOption isActive={isActive}>{option.label}</StandardFilterOption>
    )}
    singleSelection
    data-test-subj="actionPoliciesEnabledFilter"
  />
);

const EnabledFilter = filter.createComponent({
  resolve: () => ({
    type: 'custom_component' as const,
    component: EnabledFilterComponent,
  }),
});
