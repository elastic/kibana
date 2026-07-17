/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppHeader } from '@kbn/app-header';
import type { AppHeaderMenu } from '@kbn/app-header';
import type {
  ActionPolicyBulkAction,
  ActionPolicyResponse,
  CreateActionPolicyData,
} from '@kbn/alerting-v2-schemas';
import { CoreStart, useService } from '@kbn/core-di-browser';
import { i18n } from '@kbn/i18n';
import {
  ContentList,
  ContentListFooter,
  ContentListProvider,
  ContentListTable,
  ContentListToolbar,
  createColumn,
  useContentListSelection,
  useContentListState,
} from '@kbn/content-list';
import type { ContentListItem } from '@kbn/content-list';
import { ExperimentalBadge } from '../../components/experimental_badge';
import { ActionPolicyDestinationsSummary } from '../../components/action_policy/action_policy_destinations_summary';
import { ActionPolicySnoozePopover } from '../../components/action_policy/action_policy_snooze_popover';
import { ActionPolicyStateBadge } from '../../components/action_policy/action_policy_state_badge';
import { DeleteActionPolicyConfirmModal } from '../../components/action_policy/delete_confirmation_modal';
import { ActionPolicyDetailsFlyout } from '../../components/action_policy/details_flyout/action_policy_details_flyout';
import { paths } from '../../constants';
import { useBreadcrumbs } from '../../hooks/use_breadcrumbs';
import { useBulkActionActionPolicies } from '../../hooks/use_bulk_action_action_policies';
import { useCreateActionPolicy } from '../../hooks/use_create_action_policy';
import { useDeleteActionPolicy } from '../../hooks/use_delete_action_policy';
import { useDisableActionPolicy } from '../../hooks/use_disable_action_policy';
import { useEnableActionPolicy } from '../../hooks/use_enable_action_policy';
import { useSnoozeActionPolicy } from '../../hooks/use_snooze_action_policy';
import { useUnsnoozeActionPolicy } from '../../hooks/use_unsnooze_action_policy';
import { useUpdateActionPolicyApiKey } from '../../hooks/use_update_action_policy_api_key';
import { UserCapabilities } from '../../services/user_capabilities';
import { ActionPoliciesBulkActions } from './components/action_policies_bulk_actions';
import { ActionPolicyActionsCell } from './components/action_policy_actions_cell';
import { UpdateApiKeyConfirmationModal } from './components/update_api_key_confirmation_modal';
import { useActionPoliciesDataSource } from './action_policies_data_source';
import type { ActionPolicyContentListItem } from './action_policies_data_source';

const { Column } = ContentListTable;

const RefetchConnector = ({ onReady }: { onReady: (refetch: () => void) => void }) => {
  const { refetch } = useContentListState();
  useEffect(() => {
    onReady(refetch);
  }, [onReady, refetch]);
  return null;
};

type BulkActionMutate = ReturnType<typeof useBulkActionActionPolicies>['mutate'];

interface ConnectedBulkActionsProps {
  bulkAction: BulkActionMutate;
  isLoading: boolean;
}

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

const toPolicy = (item: ContentListItem): ActionPolicyResponse =>
  (item as ActionPolicyContentListItem).policy;

// Pure column — no component state needed.
const DestinationsColumn = createColumn({
  id: 'destinations',
  name: i18n.translate('xpack.alertingV2.actionPoliciesList.column.destinations', {
    defaultMessage: 'Destinations',
  }),
  render: (item) => <ActionPolicyDestinationsSummary destinations={toPolicy(item).destinations} />,
});

const ACTION_POLICIES_LIST_PAGE_TITLE = i18n.translate(
  'xpack.alertingV2.actionPoliciesList.pageTitle',
  { defaultMessage: 'Action Policies' }
);

const getActionPoliciesListMenu = ({
  navigateToCreate,
  canWrite,
}: {
  navigateToCreate: () => void;
  canWrite: boolean;
}): AppHeaderMenu => ({
  ...(canWrite && {
    primaryActionItem: {
      id: 'createActionPolicy',
      label: i18n.translate('xpack.alertingV2.actionPoliciesList.createPolicyButton', {
        defaultMessage: 'Create policy',
      }),
      iconType: 'plusInCircle',
      run: navigateToCreate,
      testId: 'createActionPolicyButton',
    },
  }),
});

export const ListActionPoliciesPage = () => {
  useBreadcrumbs('action_policies_list');

  const refetchRef = useRef<() => void>(() => {});
  const onRefetchReady = useCallback((refetchFn: () => void) => {
    refetchRef.current = refetchFn;
  }, []);

  const [policyToDelete, setPolicyToDelete] = useState<ActionPolicyResponse | null>(null);
  const [policyToUpdateApiKey, setPolicyToUpdateApiKey] = useState<string | null>(null);
  const [policyToView, setPolicyToView] = useState<ActionPolicyResponse | null>(null);

  const { navigateToUrl } = useService(CoreStart('application'));
  const { basePath } = useService(CoreStart('http'));
  const canWrite = useService(UserCapabilities).canWrite('actionPolicies');

  const { mutate: createActionPolicy } = useCreateActionPolicy();
  const { mutate: deleteActionPolicy, isLoading: isDeleting } = useDeleteActionPolicy();
  const {
    mutate: enablePolicyMutate,
    isLoading: isEnabling,
    variables: enableVariables,
  } = useEnableActionPolicy();
  const {
    mutate: disablePolicyMutate,
    isLoading: isDisabling,
    variables: disableVariables,
  } = useDisableActionPolicy();
  const {
    mutate: snoozePolicyMutate,
    isLoading: isSnoozing,
    variables: snoozeVariables,
  } = useSnoozeActionPolicy();
  const {
    mutate: unsnoozePolicyMutate,
    isLoading: isUnsnoozing,
    variables: unsnoozeVariables,
  } = useUnsnoozeActionPolicy();

  const enablePolicy = useCallback(
    (id: string) => enablePolicyMutate(id, { onSuccess: () => refetchRef.current() }),
    [enablePolicyMutate]
  );
  const disablePolicy = useCallback(
    (id: string) => disablePolicyMutate(id, { onSuccess: () => refetchRef.current() }),
    [disablePolicyMutate]
  );

  const snoozePolicy = useCallback(
    (args: Parameters<typeof snoozePolicyMutate>[0]) =>
      snoozePolicyMutate(args, { onSuccess: () => refetchRef.current() }),
    [snoozePolicyMutate]
  );
  const unsnoozePolicy = useCallback(
    (id: Parameters<typeof unsnoozePolicyMutate>[0]) =>
      unsnoozePolicyMutate(id, { onSuccess: () => refetchRef.current() }),
    [unsnoozePolicyMutate]
  );
  const { mutate: updateApiKey, isLoading: isUpdatingApiKey } = useUpdateActionPolicyApiKey();
  const { mutate: bulkAction, isLoading: isBulkActionInProgress } = useBulkActionActionPolicies();

  const navigateToCreate = useCallback(() => {
    navigateToUrl(basePath.prepend(paths.actionPolicyCreate));
  }, [navigateToUrl, basePath]);

  const navigateToEdit = useCallback(
    (id: string) => navigateToUrl(basePath.prepend(paths.actionPolicyEdit(id))),
    [navigateToUrl, basePath]
  );

  const clonePolicy = useCallback(
    (policy: ActionPolicyResponse) => {
      const { name, description, destinations, matcher, groupBy, throttle, tags, groupingMode } =
        policy;
      const data: CreateActionPolicyData = {
        name: `${name} [clone]`,
        description,
        destinations,
        groupingMode: groupingMode ?? 'per_episode',
        ...(tags != null && { tags }),
        ...(matcher != null && { matcher }),
        ...(groupBy != null && { groupBy }),
        ...(throttle != null && { throttle }),
      };
      createActionPolicy(data);
    },
    [createActionPolicy]
  );

  const dataSource = useActionPoliciesDataSource();

  const itemConfig = useMemo(() => ({}), []);

  const actionPoliciesMenu = useMemo(
    () => getActionPoliciesListMenu({ navigateToCreate, canWrite }),
    [navigateToCreate, canWrite]
  );

  return (
    <>
      <AppHeader
        sticky={false}
        title={ACTION_POLICIES_LIST_PAGE_TITLE}
        titleAppend={<ExperimentalBadge />}
        padding={{ bleed: 'm' }}
        menu={actionPoliciesMenu}
      />

      <ContentListProvider
        id="action-policies"
        labels={{
          entity: i18n.translate('xpack.alertingV2.actionPoliciesList.entity', {
            defaultMessage: 'action policy',
          }),
          entityPlural: i18n.translate('xpack.alertingV2.actionPoliciesList.entityPlural', {
            defaultMessage: 'action policies',
          }),
        }}
        dataSource={dataSource}
        item={itemConfig}
        features={{
          sorting: {
            initialSort: { field: 'name', direction: 'asc' },
            fields: [
              {
                field: 'name',
                name: i18n.translate('xpack.alertingV2.actionPoliciesList.sort.name', {
                  defaultMessage: 'Name',
                }),
              },
              {
                field: 'updatedAt',
                name: i18n.translate('xpack.alertingV2.actionPoliciesList.sort.updatedAt', {
                  defaultMessage: 'Last update',
                }),
              },
            ],
          },
          pagination: { initialPageSize: 20 },
          search: true,
          selection: canWrite,
        }}
      >
        <ContentList>
          <RefetchConnector onReady={onRefetchReady} />
          <ContentListToolbar />
          <ConnectedBulkActions bulkAction={bulkAction} isLoading={isBulkActionInProgress} />
          <ContentListTable
            title={ACTION_POLICIES_LIST_PAGE_TITLE}
            scrollableInline
            responsiveBreakpoint={false}
          >
            <Column.Name
              showDescription
              onClick={(item) => setPolicyToView(toPolicy(item))}
            />
            <DestinationsColumn />
            <Column.UpdatedAt />
            <Column.CreatedBy />
            {/* State badge — needs enable/disable loading state */}
            <Column
              id="state"
              name={i18n.translate('xpack.alertingV2.actionPoliciesList.column.state', {
                defaultMessage: 'State',
              })}
              width="120px"
              render={(item) => {
                const policy = toPolicy(item);
                return (
                  <ActionPolicyStateBadge
                    policy={policy}
                    isLoading={
                      (isEnabling && enableVariables === policy.id) ||
                      (isDisabling && disableVariables === policy.id)
                    }
                  />
                );
              }}
            />
            {/* Snooze popover — only for enabled policies when user can write */}
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
                    onSnooze={(id, until) => snoozePolicy({ id, snoozedUntil: until })}
                    onCancelSnooze={(id) => unsnoozePolicy(id)}
                    isLoading={
                      (isSnoozing && snoozeVariables?.id === policy.id) ||
                      (isUnsnoozing && unsnoozeVariables === policy.id)
                    }
                  />
                );
              }}
            />
            {/* Row actions */}
            <Column
              id="actions"
              name={i18n.translate('xpack.alertingV2.actionPoliciesList.column.actions', {
                defaultMessage: 'Actions',
              })}
              width="120px"
              render={(item) => {
                const policy = toPolicy(item);
                return (
                  <ActionPolicyActionsCell
                    policy={policy}
                    canWrite={canWrite}
                    onViewDetails={setPolicyToView}
                    onEdit={(id) => navigateToEdit(id)}
                    onClone={clonePolicy}
                    onDelete={setPolicyToDelete}
                    onEnable={(id) => enablePolicy(id)}
                    onDisable={(id) => disablePolicy(id)}
                    onSnooze={(id, until) => snoozePolicy({ id, snoozedUntil: until })}
                    onCancelSnooze={(id) => unsnoozePolicy(id)}
                    onUpdateApiKey={(id) => setPolicyToUpdateApiKey(id)}
                    isStateLoading={
                      (isEnabling && enableVariables === policy.id) ||
                      (isDisabling && disableVariables === policy.id)
                    }
                    isDisabled={isBulkActionInProgress}
                  />
                );
              }}
            />
          </ContentListTable>
          <ContentListFooter />
        </ContentList>
      </ContentListProvider>

      {policyToDelete && (
        <DeleteActionPolicyConfirmModal
          policyName={policyToDelete.name}
          onCancel={() => setPolicyToDelete(null)}
          onConfirm={() => {
            deleteActionPolicy(policyToDelete.id, {
              onSuccess: () => setPolicyToDelete(null),
            });
          }}
          isLoading={isDeleting}
        />
      )}

      {policyToUpdateApiKey && (
        <UpdateApiKeyConfirmationModal
          count={1}
          onCancel={() => setPolicyToUpdateApiKey(null)}
          onConfirm={() => {
            updateApiKey(policyToUpdateApiKey, {
              onSuccess: () => setPolicyToUpdateApiKey(null),
            });
          }}
          isLoading={isUpdatingApiKey}
        />
      )}

      {policyToView && (
        <ActionPolicyDetailsFlyout
          policy={policyToView}
          canWrite={canWrite}
          onClose={() => setPolicyToView(null)}
          onEdit={(id) => {
            setPolicyToView(null);
            navigateToEdit(id);
          }}
          onClone={(p) => {
            setPolicyToView(null);
            clonePolicy(p);
          }}
          onDelete={(p) => {
            setPolicyToView(null);
            setPolicyToDelete(p);
          }}
          onEnable={(id) => enablePolicy(id)}
          onDisable={(id) => disablePolicy(id)}
          onSnooze={(id, until) => snoozePolicy({ id, snoozedUntil: until })}
          onCancelSnooze={(id) => unsnoozePolicy(id)}
          onUpdateApiKey={(id) => {
            setPolicyToView(null);
            setPolicyToUpdateApiKey(id);
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
