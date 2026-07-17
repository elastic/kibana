/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { AppHeader } from '@kbn/app-header';
import type { AppHeaderMenu } from '@kbn/app-header';
import type { ActionPolicyBulkAction, ActionPolicyResponse, CreateActionPolicyData } from '@kbn/alerting-v2-schemas';
import { CoreStart, useService } from '@kbn/core-di-browser';
import { i18n } from '@kbn/i18n';
import {
  ContentList,
  ContentListFooter,
  ContentListProvider,
  ContentListTable,
  ContentListToolbar,
} from '@kbn/content-list';
import type { ContentListItem } from '@kbn/content-list';
import { ExperimentalBadge } from '../../components/experimental_badge';
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
import { UpdateApiKeyConfirmationModal } from './components/update_api_key_confirmation_modal';
import { useActionPoliciesDataSource } from './action_policies_data_source';
import type { ActionPolicyContentListItem } from './action_policies_data_source';

const { Column, Action } = ContentListTable;

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

  const [policyToDelete, setPolicyToDelete] = useState<ActionPolicyResponse | null>(null);
  const [policyToUpdateApiKey, setPolicyToUpdateApiKey] = useState<string | null>(null);
  const [policyToViewId, setPolicyToViewId] = useState<string | null>(null);

  const { navigateToUrl } = useService(CoreStart('application'));
  const { basePath } = useService(CoreStart('http'));
  const canWrite = useService(UserCapabilities).canWrite('actionPolicies');

  const { mutate: createActionPolicy } = useCreateActionPolicy();
  const { mutate: deleteActionPolicy, isLoading: isDeleting } = useDeleteActionPolicy();
  const {
    mutate: enablePolicy,
    isLoading: isEnabling,
    variables: enableVariables,
  } = useEnableActionPolicy();
  const {
    mutate: disablePolicy,
    isLoading: isDisabling,
    variables: disableVariables,
  } = useDisableActionPolicy();
  const { mutate: snoozePolicy } = useSnoozeActionPolicy();
  const { mutate: unsnoozePolicy } = useUnsnoozeActionPolicy();
  const { mutate: updateApiKey, isLoading: isUpdatingApiKey } = useUpdateActionPolicyApiKey();
  const { mutate: bulkAction } = useBulkActionActionPolicies();

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

  const itemConfig = useMemo(
    () => ({
      actions: {
        delete: {
          onBulkAction: async (items: ContentListItem[]) => {
            const actions: ActionPolicyBulkAction[] = items.map(({ id }) => ({
              id,
              action: 'delete',
            }));
            await new Promise<void>((resolve, reject) =>
              bulkAction({ actions }, { onSuccess: resolve, onError: reject })
            );
          },
        },
      },
    }),
    [bulkAction]
  );

  const policyToView = useMemo<ActionPolicyResponse | null>(() => {
    // resolved from the flyout's own data fetch in a future step
    return null;
  }, []);

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
          <ContentListToolbar />
          <ContentListTable
            title={ACTION_POLICIES_LIST_PAGE_TITLE}
            scrollableInline
            responsiveBreakpoint={false}
          >
            <Column.Name showDescription />
            <Column.UpdatedAt />
            <Column.CreatedBy />
            <Column.Actions>
              <Action.Delete />
            </Column.Actions>
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
          onClose={() => setPolicyToViewId(null)}
          onEdit={(id) => {
            setPolicyToViewId(null);
            navigateToEdit(id);
          }}
          onClone={(p) => {
            setPolicyToViewId(null);
            clonePolicy(p);
          }}
          onDelete={(p) => {
            setPolicyToViewId(null);
            setPolicyToDelete(p);
          }}
          onEnable={(id) => enablePolicy(id)}
          onDisable={(id) => disablePolicy(id)}
          onSnooze={(id, until) => snoozePolicy({ id, snoozedUntil: until })}
          onCancelSnooze={(id) => unsnoozePolicy(id)}
          onUpdateApiKey={(id) => {
            setPolicyToViewId(null);
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
