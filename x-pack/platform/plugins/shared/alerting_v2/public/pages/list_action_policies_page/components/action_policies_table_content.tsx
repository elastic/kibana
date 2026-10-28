/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { ActionPolicyResponse } from '@kbn/alerting-v2-schemas';
import type { Query } from '@elastic/eui';
import { EuiSkeletonText, EuiSwitch } from '@elastic/eui';
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
  useContentListItems,
  useContentListSelection,
  useContentListState,
} from '@kbn/content-list-provider';
import { filter } from '@kbn/content-list-toolbar';
import { ActionPolicyDetailsFlyout } from '../../../components/action_policy/details_flyout/action_policy_details_flyout';
import { ActionPolicySnoozeButton } from '../../../components/action_policy/action_policy_snooze_button';
import type { useBulkActionActionPolicies } from '../../../hooks/use_bulk_action_action_policies';
import { useBulkGetUserProfiles } from '../../../hooks/use_bulk_get_user_profiles';
import { ACTION_POLICIES_LICENSE_REQUIRED_MESSAGE } from '../../../components/action_policy/labels';
import { collectActorUids, resolveDisplayName } from '../../../utils/resolve_display_name';
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
  isLicenseValid: boolean;
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
  isLicenseValid,
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
    () => collectActorUids(items.map((item) => toPolicy(item).updated_by)),
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
          <EnabledFilter />
        </ContentListToolbar.Filters>
      </ContentListToolbar>
      <ConnectedBulkActions bulkAction={bulkAction} isLoading={isBulkActionInProgress} />
      <ContentListTable
        title={ACTION_POLICIES_LIST_PAGE_TITLE}
        scrollableInline
        responsiveBreakpoint={false}
      >
        <Column.Name
          showDescription
          onClick={(item) => setPolicyToViewId(toPolicy(item).id)}
          maxWidth="400px"
        />
        <DestinationsColumn />
        <Column.UpdatedAt />
        <Column
          id="updatedBy"
          name={UPDATED_BY_COLUMN_NAME}
          render={(item) => {
            const { updated_by: updatedBy } = toPolicy(item);
            if (!updatedBy) return null;
            if (isProfileLoadingRef.current)
              return (
                <div style={{ width: 120 }}>
                  <EuiSkeletonText lines={1} />
                </div>
              );
            return <>{resolveDisplayName(updatedBy, updatedByProfileByUidRef.current)}</>;
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
            const isEnableBlockedByLicense = !policy.enabled && !isLicenseValid;
            return (
              <EuiSwitch
                compressed
                checked={policy.enabled}
                disabled={
                  !canWrite || isLoading || isBulkActionInProgress || isEnableBlockedByLicense
                }
                title={
                  !canWrite
                    ? i18n.translate(
                        'xpack.alertingV2.actionPoliciesList.column.enabled.disabledTooltip',
                        {
                          defaultMessage:
                            'You do not have permission to enable or disable this policy',
                        }
                      )
                    : isEnableBlockedByLicense
                    ? ACTION_POLICIES_LICENSE_REQUIRED_MESSAGE
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
          width="60px"
          render={(item) => {
            const policy = toPolicy(item);
            if (!policy.enabled || !canWrite) return null;
            return (
              <ActionPolicySnoozeButton
                policy={policy}
                onSnooze={onSnooze}
                onCancelSnooze={onCancelSnooze}
                isLoading={
                  (isSnoozing && snoozeVariables?.id === policy.id) ||
                  (isUnsnoozing && unsnoozeVariables === policy.id)
                }
                isDisabled={isBulkActionInProgress}
              />
            );
          }}
        />
        <Column
          id="actions"
          name={i18n.translate('xpack.alertingV2.actionPoliciesList.column.actions', {
            defaultMessage: 'Actions',
          })}
          width="80px"
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
          isSnoozeLoading={
            (isSnoozing && snoozeVariables?.id === policyToView.id) ||
            (isUnsnoozing && unsnoozeVariables === policyToView.id)
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
  const { refetch } = useContentListState();

  if (selectedCount === 0) return null;

  const selectedPolicies = selectedItems.map((item) => toPolicy(item));

  const handleBulkAction = (
    action: 'enable' | 'disable' | 'delete' | 'snooze' | 'unsnooze' | 'update_api_key',
    snoozedUntil?: string
  ) => {
    const ids = selectedPolicies.map((p) => p.id);
    // The list is fetched through the content list data source, so invalidating
    // the policy query keys is not enough to reflect the new state.
    const onSuccess = () => {
      clearSelection();
      refetch();
    };

    if (action === 'snooze' && snoozedUntil) {
      bulkAction({ action, ids, snoozedUntil }, { onSuccess });
    } else if (action !== 'snooze') {
      bulkAction({ action, ids }, { onSuccess });
    }
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
    hideSearch
    data-test-subj="actionPoliciesEnabledFilter"
  />
);

const EnabledFilter = filter.createComponent({
  resolve: () => ({
    type: 'custom_component' as const,
    component: EnabledFilterComponent,
  }),
});
